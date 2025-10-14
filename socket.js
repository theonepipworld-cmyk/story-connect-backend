
let io;
const onlineUsers = new Map();

function initIo(server) {
  const { Server } = require("socket.io");
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("logout", async (data) => {
      console.log("Logout event received:", data);

      try {
        if (data?.userId) {
          onlineUsers.delete(data.userId.toString());
          await User.update(
            { isOnline: false, device_token: null },
            { where: { id: data.userId } }
          );
          console.log(`🚪 Cleared token & offline for user ${data.userId}`);
        }
      } catch (error) {
        console.error("Error clearing device token:", error);
      }
    });

    socket.on("online", async (data) => {
      console.log("online event received:", data);
      try {
        if (data?.userId) {
          onlineUsers.set(data.userId.toString(), socket.id);
          await User.update(
            { isOnline: true },
            { where: { id: data.userId } }
          );
          console.log(`online status updated for user ${data.userId}`);
        }
      } catch (error) {
        console.error("Error clearing updating online status:", error);
      }
    });

    socket.on("offline", async (data) => {
      console.log("offline event received:", data);
      try {
        if (data?.userId) {
          onlineUsers.delete(data.userId.toString());
          await User.update(
            { isOnline: false },
            { where: { id: data.userId } }
          );
          console.log(`offline status updated for user ${data.userId}`);
        }
      } catch (error) {
        console.error("Error clearing updating online status:", error);
      }
    })



    socket.on("disconnect", () => {
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          User.update({ isOnline: false }, { where: { id: userId } })
            .then(() => console.log(`User ${userId} disconnected`))
            .catch((err) => console.error(" Error updating disconnect:", err));
          break;
        }
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

module.exports = { initIo, getIo };
