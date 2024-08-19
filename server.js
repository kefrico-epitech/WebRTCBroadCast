const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get("/stream", (req, res) => {
  res.sendFile('public/index.html', { root: __dirname });
});

require("./src/Route/route")(app);
require("./src/Socket/socketEvent")(io);
require("./src/Socket/socketFunction").init(io);

// Start the server
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
