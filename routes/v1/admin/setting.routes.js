const express = require('express');
const router = express.Router();
const settingController = require("../../../controllers/v1/admin/setting.controller.js");
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');




router.get("/all-suspended-users", isAuthenticated, authorizeRoles('admin'), settingController.allSuspendedUsers);
router.post("/add-faq", isAuthenticated, authorizeRoles('admin'), settingController.addFaq);
router.put("/update-faq-status", isAuthenticated, authorizeRoles('admin'), settingController.updateFaq);
router.delete("/delete-faq/:faqId", isAuthenticated, authorizeRoles('admin'), settingController.deleteFaq);
router.put("/remove-suspension/:userId", isAuthenticated, authorizeRoles('admin'), settingController.userSuspensionAction);

module.exports = router;