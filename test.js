#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = 9999; // Change to your desired port

// Load SSL certificate and private key
const options = {
    key: fs.readFileSync('key.pem'), // Replace with your private key file
    cert: fs.readFileSync('cert.pem'), // Replace with your certificate file
};

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Define an endpoint to receive JSON data
app.post("/receive-json", (req, res) => {
    console.log("Received JSON data:", req.body);
    res.status(200).send("JSON received successfully");
});

// Create HTTPS server
https.createServer(options, app).listen(port, () => {
    console.log(`Receiver HTTPS server running on https://localhost:${port}`);
});
