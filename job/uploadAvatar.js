// const { Worker } = require('bullmq');
// const uploadFileToS3 = require('../utils/s3.util');
// const User = require('../models/user.model');
// const connection = { host: '127.0.0.1', port: 6379 };

// const worker = new Worker('uploadQueue', async job => {
//   if (job.name === 'uploadAvatar') {
//     const { userId, files } = job.data;

//     // Upload to S3
//     const s3Res = await uploadFileToS3({ 
//      files
//     }, 'Profile');

//     // Update DB with S3 URL
//     await User.findByIdAndUpdate(userId, { avatarUrl: s3Res.Location });
//     console.log(`Avatar updated for user ${userId}`);
//   }
// }, { connection });

// worker.on('completed', job => {
//   console.log(`Job ${job.id} completed`);
// });

// worker.on('failed', (job, err) => {
//   console.error(`Job ${job.id} failed:`, err);
// });
