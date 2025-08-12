const { validationResult } = require('express-validator');


exports.validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      type: 'error'
    });
  }
  next();
}