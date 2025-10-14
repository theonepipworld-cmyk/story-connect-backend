
let io;

function initIo(server) {
  const { Server } = require("socket.io");
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("logout", async (data) => {
      console.log("Logout event received:", data);

      try {
        if (data?.userId) {
          await User.update(
            { device_token: null },
            { where: { id: data.userId } }
          );
          console.log(`Device token cleared for user ${data.userId}`);
        }
      } catch (error) {
        console.error("Error clearing device token:", error);
      }
    });

    socket.on("online", async (data) => {
      console.log("online event received:", data);
      try {
        if (data?.userId) {
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
