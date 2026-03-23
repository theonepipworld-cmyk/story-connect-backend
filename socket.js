let io;


const onlineUsers = new Map();

const { incrementHourlyActiveUser, decrementHourlyActiveUser } = require("./helpers/dbHelpers");
const User = require("./models/user.model");



function addUserSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; 
  }
  return false; 
}

function findUserBySocketId(socketId) {
  for (const [userId, sockets] of onlineUsers.entries()) {
    if (sockets.has(socketId)) return userId;
  }
  return null;
}



function initIo(server) {
  const { Server } = require("socket.io");
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("online", async (data) => {
      try {
        if (!data?.userId) return;
        const userId = data.userId.toString();

        const isFirstConnection = !onlineUsers.has(userId);
        addUserSocket(userId, socket.id);
        if (isFirstConnection) {
          await User.findByIdAndUpdate(userId, { isOnline: true });
          await incrementHourlyActiveUser();
          console.log(`User ${userId} is now online (first device)`);
        } else {
          console.log(`User ${userId} connected from another device (total: ${onlineUsers.get(userId).size})`);
        }
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    });

    socket.on("offline", async (data) => {
      try {
        if (!data?.userId) return;
        const userId = data.userId.toString();

        const isLastConnection = removeUserSocket(userId, socket.id);
        if (isLastConnection) {
          await User.findByIdAndUpdate(userId, { isOnline: false });
          await decrementHourlyActiveUser();
          console.log(`User ${userId} is now offline (all devices disconnected)`);
        } else {
          console.log(`User ${userId} disconnected one device (remaining: ${onlineUsers.get(userId)?.size || 0})`);
        }
      } catch (error) {
        console.error("Error updating offline status:", error);
      }
    });

    socket.on("logout", async (data) => {
      try {
        if (!data?.userId) return;
        const userId = data.userId.toString();

        const isLastConnection = removeUserSocket(userId, socket.id);

        if (isLastConnection) {
          await User.findByIdAndUpdate(
            userId,
            { $set: { isOnline: false, device_token: null } },
            { new: true }
          );
          await decrementHourlyActiveUser();
          console.log(`User ${userId} logged out — token cleared & offline`);
        } else {
          console.log(`User ${userId} logged out from one device (others still active)`);
        }
      } catch (error) {
        console.error("Error on logout:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        const userId = findUserBySocketId(socket.id);
        if (!userId) return;

        const isLastConnection = removeUserSocket(userId, socket.id);

        if (isLastConnection) {
          await User.findByIdAndUpdate(userId, { isOnline: false });
          await decrementHourlyActiveUser();
          console.log(`User ${userId} fully disconnected (all devices gone)`);
        } else {
          console.log(`User ${userId} lost one connection (others still active)`);
        }
      } catch (err) {
        console.error("Error on disconnect:", err);
      } finally {
        console.log("Socket disconnected:", socket.id);
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
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets || sockets.size === 0) return null;
  return [...sockets][0];
}

function getAllUserSocketIds(userId) {
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets) return [];
  return [...sockets];
}

function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId.toString());
  return !!sockets && sockets.size > 0;
}

module.exports = { initIo, getIo, getOnlineUsers, getUserSocketId, getAllUserSocketIds, isUserOnline };