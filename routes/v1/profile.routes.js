const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/v1/profile/profile.controller.js');
const { authenticate } = require('../../middlewares/requestValidations/profile/profile.middleware.js');
const multer = require('multer');
// const upload = multer(); 

// memory storage so we can stream to S3
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit (adjust)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }

});


router.get('/getProfile', authenticate, profileController.getProfile);


router.put(
  '/updateProfile',
  authenticate,
  upload.fields([{ name: 'avatar', maxCount: 1 }]),
  profileController.updateProfile
);


// router.put(
//   '/updateProfile',
//   authenticate,
//   upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
//   updateProfileValidator,
//   profileController.updateProfile
// );

// Soft delete user profile (deactivate)
router.delete('/deleteProfile', authenticate, profileController.deleteProfile);


module.exports = router;
