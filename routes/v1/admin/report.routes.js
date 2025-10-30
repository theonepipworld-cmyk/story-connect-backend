const express = require('express');
const router = express.Router();
const adminReportController = require("../../../controllers/v1/admin/report.controller.js");
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.get("/all-reports",isAuthenticated,authorizeRoles('admin'),adminReportController.getAllReportUser)
router.get("/report-details/:reportId",isAuthenticated,authorizeRoles('admin'),adminReportController.getReportDetails);
router.put("/report-action",isAuthenticated,authorizeRoles('admin'),adminReportController.reportAction);
router.put("/update-report-status",isAuthenticated,authorizeRoles('admin'),adminReportController.updateReportStatus);

module.exports = router;