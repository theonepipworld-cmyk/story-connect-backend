// socketTestClient.js
const { io } = require("socket.io-client");

// Replace with your backend socket server URL
const SOCKET_URL = "http://localhost:4000";

// Simulate a test user
const testUserId = "68e8f8b034d87c51dd85f5ef"; // 👈 Replace with a valid userId from your DB

// Connect client
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnection: true,
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);

  // --- Test 1: Online ---
  setTimeout(() => {
    console.log("🟢 Sending online event...");
    socket.emit("online", { userId: testUserId });
  }, 1000);

  // --- Test 2: Offline ---
  setTimeout(() => {
    console.log("🔴 Sending offline event...");
    socket.emit("offline", { userId: testUserId });
  }, 5000);

  // --- Test 3: Logout ---
  setTimeout(() => {
    console.log("🚪 Sending logout event...");
    socket.emit("logout", { userId: testUserId });
  }, 9000);

  // --- Test 4: Disconnect ---
  setTimeout(() => {
    console.log("🧨 Disconnecting socket...");
    socket.disconnect();
  }, 13000);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (err) => {
  console.error("⚠️ Connection error:", err.message);
});
