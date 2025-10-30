// socketTestClient.js
const { io } = require("socket.io-client");
const SOCKET_URL = "http://localhost:4000";
const testUserId = "689c31f752914c70db5460a6";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnection: false,
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);

  // 1️⃣ Go online
  socket.emit("online", { userId: testUserId });
  console.log("📡 Sent 'online' event");

  // 2️⃣ Wait 3s -> simulate offline (like closing app)
  setTimeout(() => {
    socket.emit("offline", { userId: testUserId });
    console.log("📡 Sent 'offline' event");
  }, 3000);

  // 3️⃣ Wait 6s -> simulate logout
  setTimeout(() => {
    socket.emit("logout", { userId: testUserId });
    console.log("📡 Sent 'logout' event");
  }, 6000);

  // 4️⃣ Wait 9s -> disconnect socket
  setTimeout(() => {
    socket.disconnect();
    console.log("❌ Disconnected from server");
  }, 9000);
});

socket.on("disconnect", () => {
  console.log("⚠️ Disconnected from server");
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});
