const { validationResult } = require('express-validator');
const { errorResponse } = require('../../../utils/responseHandler.util.js');


exports.validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      errorResponse(
        errors.array()[0].msg, 
      )
    );
  }
  next();
};