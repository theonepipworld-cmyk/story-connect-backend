const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const { reportUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");
const reportController = require("../../../controllers/v1/user/report.controller.js")
const reportMiddleware = require("../../../middlewares/requestValidations/user/report.middleware.js")



router.post("/report-user", isAuthenticated, authorizeRoles('admin','user'), reportUploadHandler,reportMiddleware.reportUserValidator,reportController.reportUser);
router.get("/report-categories", isAuthenticated, authorizeRoles('admin','user'),reportController.getReportCategories);


module.exports = router;