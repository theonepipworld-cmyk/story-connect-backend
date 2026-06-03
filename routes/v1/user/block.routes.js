const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const blockController = require("../../../controllers/v1/user/block.controller.js")
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const blockMiddleware = require("../../../middlewares/requestValidations/user/block.middleware.js");

router.post("/:id/blocked",isAuthenticated ,authorizeRoles("admin","user"),blockMiddleware.validateUser,blockController.blockedUser)
router.post("/:id/unblocked",isAuthenticated ,authorizeRoles("admin","user"),blockMiddleware.validateUser,blockController.UnblockUser)
router.get("/",isAuthenticated ,authorizeRoles("admin","user"),blockController.getBlockUsers)

module.exports = router