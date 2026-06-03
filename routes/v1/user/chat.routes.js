const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const chatController = require("../../../controllers/v1/user/chats.controller.js");
const chatMiddleware = require("../../../middlewares/requestValidations/user/chat.middleware.js");
const { chatUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");


router.post("/send-message", isAuthenticated, authorizeRoles('admin','user'),chatUploadHandler,chatMiddleware.sendMessageValidator,chatController.sendMessageToUser);
router.get("/converations", isAuthenticated, authorizeRoles('admin','user'),chatController.getConversations);
router.get("/chat-history", isAuthenticated, authorizeRoles('admin','user'),chatController.getloadMoreMessages);
router.put("/update-message", isAuthenticated, authorizeRoles('admin','user'),chatMiddleware.updateMessageValidator,chatController.updateMessage)
router.delete("/:conversationId/:messageId", isAuthenticated, authorizeRoles('admin','user'),chatMiddleware.deleteMessageValidator,chatController.deleteMessage)
router.delete("/delete-conversation/:conversationId/", isAuthenticated, authorizeRoles('admin','user'),chatMiddleware.MessageValidator,chatController.deleteConversation)
router.patch("/seen-message/:conversationId", isAuthenticated, authorizeRoles('admin','user'),chatMiddleware.MessageValidator,chatController.seenMessage);
router.patch("/delivered-message/:conversationId", isAuthenticated, authorizeRoles('admin','user'),chatMiddleware.MessageValidator,chatController.deliveredMessage);

module.exports = router;

