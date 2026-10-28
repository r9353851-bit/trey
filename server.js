const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("join-room", ({ room, name }) => {
    if (typeof room !== "string" || !/^[a-zA-Z0-9-]{3,32}$/.test(room)) return;
    const members = io.sockets.adapter.rooms.get(room);
    if (members && members.size >= 2) {
      socket.emit("room-error", "Эта комната уже занята двумя участниками.");
      return;
    }
    socket.join(room);
    socket.data.room = room;
    socket.data.name = String(name || "Участник").slice(0, 30);
    socket.to(room).emit("peer-joined", { name: socket.data.name });
    socket.emit("joined-room", { room, peers: Math.max(0, (members?.size || 1)) });
  });

  for (const event of ["offer", "answer", "ice-candidate", "media-state"]) {
    socket.on(event, (payload) => {
      const room = socket.data.room;
      if (room) socket.to(room).emit(event, payload);
    });
  }

  socket.on("disconnect", () => {
    if (socket.data.room) socket.to(socket.data.room).emit("peer-left");
  });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`CyberLink Support running at http://localhost:${port}`);
});