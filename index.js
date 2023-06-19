const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});
server.listen(3000, () => {
  console.log("listening on *:3000");
});

users = [];
connections = [];

io.on("connection", function (socket) {
  console.log("Успешное соединение");
  connections.push(socket);

  socket.on("disconnect", function (reason) {
    console.log("User 1 disconnected because " + reason);
    connections.splice(connections.indexOf(socket), 1);
  });
  socket.on("send msg", function (data) {
    io.sockets.emit("add msg", { msg: data.msg, name: data.name });
    console.log(data.name);
  });
});
