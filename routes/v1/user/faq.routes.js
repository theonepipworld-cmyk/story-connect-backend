const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const faqController = require("../../../controllers/v1/user/faqs.controller.js")


router.post("/add-faq",isAuthenticated,authorizeRoles('admin'),faqController.addFaq)
router.put("/update-faq-status",isAuthenticated,authorizeRoles('admin'),faqController.updateFaq)
router.delete("/delete-faq/:faqId",isAuthenticated,authorizeRoles('admin'),faqController.deleteFaq)
router.get("/all-faqs",isAuthenticated,authorizeRoles('user','admin'),faqController.getAllFaqs)


module.exports = router;
