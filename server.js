const express = require("express");
const http = require("http");
const secretVariables = require('./config/secretVariables');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(" New client connected:", socket.id);

 
  socket.on("send_message", (data) => {
    console.log("Message received:", data);
    
    io.to(data.receiverId).emit("receive_message", data);
  });


  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(` User ${userId} joined personal room`);
  });


  socket.on("disconnect", () => {
    console.log(" Client disconnected:", socket.id);
  });
});

module.exports = io

// const PORT = secretVariables.port;

// server.listen(PORT, () => {
//   console.log(`Server running on ${PORT}`);
// });
