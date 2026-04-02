let io;

const onlineUsers = new Map();
const socketToUser = new Map(); // O(1) reverse lookup

const { incrementHourlyActiveUser, decrementHourlyActiveUser } = require("./helpers/dbHelpers");
const User = require("./models/user.model");
const conversationModel = require("./models/conversations.model");
const mongoose = require("mongoose");


function addUserSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  socketToUser.set(socketId, userId);
}

function removeUserSocket(userId, socketId) {
  socketToUser.delete(socketId);
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
  return socketToUser.get(socketId) || null;
}


function initIo(server) {
  const { Server } = require("socket.io");
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("online", (data) => {
      if (!data?.userId) return;
      const userId = data.userId.toString();
      const isFirstConnection = !onlineUsers.has(userId);
      addUserSocket(userId, socket.id);

      if (isFirstConnection) {
        User.findByIdAndUpdate(userId, { isOnline: true }).catch(console.error);
        incrementHourlyActiveUser().catch(console.error);
        console.log(`User ${userId} is now online (first device)`);

        emitUserOnline(userId);

      } else {
        console.log(`User ${userId} connected from another device (total: ${onlineUsers.get(userId).size})`);
      }

    });

    socket.on("offline", (data) => {
      if (!data?.userId) return;
      const userId = data.userId.toString();
      const isLastConnection = removeUserSocket(userId, socket.id);

      if (isLastConnection) {
        User.findByIdAndUpdate(userId, { isOnline: false }).catch(console.error);
        decrementHourlyActiveUser().catch(console.error);
        console.log(`User ${userId} is now offline (all devices disconnected)`);

      } else {
        console.log(`User ${userId} disconnected one device (remaining: ${onlineUsers.get(userId)?.size || 0})`);
      }
    });

    socket.on("logout", (data) => {
      if (!data?.userId) return;
      const userId = data.userId.toString();
      const isLastConnection = removeUserSocket(userId, socket.id);

      if (isLastConnection) {
        User.findByIdAndUpdate(
          userId,
          { $set: { isOnline: false, device_token: null } },
          { new: true }
        ).catch(console.error);
        decrementHourlyActiveUser().catch(console.error);
        console.log(`User ${userId} logged out — token cleared & offline`);

        emitUserOffline(userId);
      } else {
        console.log(`User ${userId} logged out from one device (others still active)`);
      }
    });

    socket.on("typing", (data) => {
      // data: { conversationId, receiverId, senderId, isTyping }
      if (!data?.receiverId || !data?.conversationId) return;

      const receiverSocketIds = getAllUserSocketIds(data.receiverId.toString());
      receiverSocketIds.forEach(sid => {
        io.to(sid).emit("typing", {
          conversationId: data.conversationId,
          senderId: data.senderId,
          isTyping: data.isTyping
        });
      });
    });

    // socket.on("messages_seen", () => {
    //   const userId = findUserBySocketId(socket.id);
    //   if (!userId) return;

    //   const Conversation = require("./models/conversations.model");
    //   Conversation.updateMany(
    //     { participants: userId, "unseenCount.userId": userId },
    //     { $set: { "unseenCount.$.count": 0 } }
    //   ).catch(console.error);

    //   const allSocketIds = getAllUserSocketIds(userId);
    //   allSocketIds.forEach(socketId => {
    //     if (socketId !== socket.id) {
    //       io.to(socketId).emit("badgeCountUpdate", { chatUnread: 0 });
    //     }
    //   });
    // });

    socket.on("disconnect", () => {
      const userId = findUserBySocketId(socket.id);
      console.log("Socket disconnected:", socket.id);
      if (!userId) return;

      const isLastConnection = removeUserSocket(userId, socket.id);

      if (isLastConnection) {
        User.findByIdAndUpdate(userId, { isOnline: false }).catch(console.error);
        decrementHourlyActiveUser().catch(console.error);
        console.log(`User ${userId} fully disconnected (all devices gone)`);

      } else {
        console.log(`User ${userId} lost one connection (others still active)`);
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



async function emitUserOnline(userId) {
  console.log(" userid in online funciton ----", userId);

  const conversations = await conversationModel.find(
    { participants: new mongoose.Types.ObjectId(userId) },
    { participants: 1 }
  );

  const partnerIds = new Set();
  console.log("partner ids online-------", conversations);

  conversations.forEach(conv => {
    conv.participants.forEach(p => {
      if (p.toString() !== userId) {
        partnerIds.add(p.toString());
      }
    });
  });

  // 👉 emit to partners
  partnerIds.forEach(partnerId => {
    const sockets = getAllUserSocketIds(partnerId);

    sockets.forEach(sid => {
      io.to(sid).emit("user_online", { userId });
    });
  });
}



async function emitUserOffline(userId) {
  console.log(" user id in offline funciton ----", userId);
  const conversations = await conversationModel.find(
    { participants: new mongoose.Types.ObjectId(userId) },
    { participants: 1 }
  );

  const partnerIds = new Set();

  console.log("partner ids offline-------", conversations);

  conversations.forEach(conv => {
    conv.participants.forEach(p => {
      if (p.toString() !== userId) {
        partnerIds.add(p.toString());
      }
    });
  });

  // 👉 emit to partners
  partnerIds.forEach(partnerId => {
    const sockets = getAllUserSocketIds(partnerId);

    sockets.forEach(sid => {
      io.to(sid).emit("user_offline", { userId });
    });
  });
}

module.exports = { initIo, getIo, getOnlineUsers, getUserSocketId, getAllUserSocketIds, isUserOnline };