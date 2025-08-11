const { body, validationResult } = require('express-validator');
const { jwt_secret } = require('../../../config/secretVariables');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js")
const jwt = require('jsonwebtoken');

exports.updateProfileValidator = [
    // allow optional fields; add constraints as needed
    body('name').optional().isString().isLength({ min: 1, max: 120 }),
    body('bio').optional().isString().isLength({ max: 1000 }),
    body('profession').optional().isString().isLength({ max: 200 }),
    body('education').optional().isString().isLength({ max: 500 }),
    body('relationship').optional().isString().isIn(['single', 'married', 'complicated', 'prefer not to say']),
    body('countryOfOrigin').optional().isString(),
    body('currentCountry').optional().isString(),
    body('entryYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        next();
    }
];


exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse(resMessages.validation.authTokenMissing));
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwt_secret);
    req.user = { userId: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json(errorResponse('Invalid or expired token'));
  }
};