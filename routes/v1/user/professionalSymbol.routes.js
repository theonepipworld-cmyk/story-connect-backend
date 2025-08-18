const express = require('express')
const router = express.Router()
const professsionalSymbolController = require('../../../controllers/v1/user/professionalSymbolList.controller')

router.get('/', professsionalSymbolController.professionSymbolList);

module.exports = router;