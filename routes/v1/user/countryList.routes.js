const express = require('express')
const router = express.Router()
const countryListController = require('../../../controllers/v1/user/countryList.controller.js')

router.get('/', countryListController.countryList);

module.exports = router;