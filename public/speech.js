(async function() {
    var r = document.getElementById("result");
    if ("webkitSpeechRecognition" in window) {
        var recognizer = new webkitSpeechRecognition();
        recognizer.continuous = true;
        recognizer.interimResults = false;
        recognizer.lang = "en-US";
        recognizer.start();
        
        var keyword = "Alexa";
        var finalTranscripts = "";
        var myTimer = undefined;

        let websocket = new WebSocket('wss://192.168.0.204:4000/transcription');

        recognizer.onresult = function(event){
            for(var i = event.resultIndex; i < event.results.length; i++){
                var transcript = event.results[i][0].transcript;
                transcript.replace("\n", "<br>");
                if(event.results[i].isFinal && (transcript.includes(keyword) || finalTranscripts.includes(keyword))){
                    finalTranscripts += transcript;
                    if (myTimer) {
                        clearTimeout(myTimer)
                    }
                    myTimer = setTimeout(() => {
                        if (websocket.readyState === WebSocket.OPEN) {
                            websocket.send(JSON.stringify({"transcripts": finalTranscripts}));
                            console.log('Sent a transcribed prompt to the server.');
                        }
                        finalTranscripts = "";
                        r.innerHTML = finalTranscripts;
                    }, 1500);

                }
                r.innerHTML = finalTranscripts;
            }

        };

        websocket.onopen = () => console.log('WebSocket connection established.');
        websocket.onerror = (err) => console.error('WebSocket error: ', err);
        websocket.onclose = () => console.log('WebSocket connection closed.');
            
        recognizer.onerror = function(event){
        
        };

        recognizer.onend = () => {
            setTimeout(() => {
                recognizer.start();
            }, 10);
        }
    }
    else {
        r.innerHTML = "Your browser does not support that.";
    }


}) ()
