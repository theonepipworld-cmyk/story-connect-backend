let io;
const onlineUsers = new Map();
const { incrementHourlyActiveUser, decrementHourlyActiveUser } = require("./helpers/dbHelpers");
const User = require("./models/user.model");

function initIo(server) {
  const { Server } = require("socket.io");
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("online", async (data) => {
      console.log("online event received:", data.userId);
      try {
        if (data?.userId) {
          onlineUsers.set(data.userId.toString(), socket.id);
          await User.findByIdAndUpdate(data.userId, { isOnline: true });
          await incrementHourlyActiveUser();
          console.log(` online status updated for user ${data.userId}`);
        }
      } catch (error) {
        console.error(" Error updating online status:", error);
      }
    });

    socket.on("offline", async (data) => {
      console.log("offline event received:", data);
      try {
        if (data?.userId) {
          onlineUsers.delete(data.userId.toString());
          await User.findByIdAndUpdate(data.userId, { isOnline: false });
          await decrementHourlyActiveUser();
          console.log(` offline status updated for user ${data.userId}`);
        }
      } catch (error) {
        console.error(" Error updating offline status:", error);
      }
    });

    socket.on("logout", async (data) => {
      console.log("Logout event received:", data);
      try {
        if (data?.userId) {
          onlineUsers.delete(data.userId.toString());
          const updatedUser = await User.findByIdAndUpdate(
            data.userId,
            { $set: { isOnline: false, device_token: null } },
            { new: true }
          );
          await decrementHourlyActiveUser();
          console.log(` Cleared token & set offline for user ${data.userId}`);
          console.log("Updated user:", updatedUser);
        }
      } catch (error) {
        console.error(" Error clearing device token:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        for (const [userId, sockId] of onlineUsers.entries()) {
          if (sockId === socket.id) {
            onlineUsers.delete(userId);
            await User.findByIdAndUpdate(userId, { isOnline: false });
            console.log(` User ${userId} disconnected`);
            break;
          }
        }
        console.log("Socket disconnected:", socket.id);
      } catch (err) {
        console.error(" Error updating disconnect:", err);
      }
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

function getOnlineUsers() {
  return onlineUsers;
}


function getUserSocketId(userId) {
  return onlineUsers.get(userId.toString()) || null;
}

module.exports = { initIo, getIo, getOnlineUsers, getUserSocketId }; 