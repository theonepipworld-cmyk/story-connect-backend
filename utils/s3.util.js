const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const envVariables = require('../config/secretVariables');
const resMessages = require('../constants/resMessages.constants')

const s3 = new S3Client({
    region: envVariables?.aws_s3_region,
    credentials: {
        accessKeyId: envVariables?.aws_s3_access_key,
        secretAccessKey: envVariables?.aws_s3_secret_key,
    },
});

const uploadFileToS3 = async (file, folder = '') => {
    if (!file) {
        throw new Error('File data is missing.');
    }

    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/\s+/g, '_');
    const uniqueFileName = `${baseName}_${timestamp}${extension}`;


    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    const uploadParams = {
        Bucket: envVariables?.aws_s3_bucket_name,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };


    try {
        const command = new PutObjectCommand(uploadParams);
        const result = await s3.send(command);
        return {
            ...result,
            key,
            Location: `https://${envVariables?.aws_s3_bucket_name}.s3.${envVariables?.aws_s3_region}.amazonaws.com/${key}`,
        };
    } catch (error) {
        throw new Error(`Error uploading file: ${error.message}`);
    }
};

module.exports = { uploadFileToS3, s3 };
