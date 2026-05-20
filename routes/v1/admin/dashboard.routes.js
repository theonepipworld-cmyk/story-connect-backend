const express = require('express');
const router = express.Router();




const adminDashboardController = require("../../../controllers/v1/admin/dashboard.controller.js");
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.get("/dashboard-data", isAuthenticated, authorizeRoles('admin'), adminDashboardController.getDashBoardData);
router.get("/all-user", isAuthenticated, authorizeRoles('admin'), adminDashboardController.getAllUser)
router.patch('/user/status/:userId/:action', isAuthenticated,authorizeRoles('admin'), adminDashboardController.updateStatusOfUser);

module.exports = router;