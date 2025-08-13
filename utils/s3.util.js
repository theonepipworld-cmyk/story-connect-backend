const { S3Client,  DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
const envVariables = require('../config/secretVariables');

const s3 = new S3Client({
    region: envVariables?.aws_s3_region,
    credentials: {
        accessKeyId: envVariables?.aws_s3_access_key,
        secretAccessKey: envVariables?.aws_s3_secret_key,
    },
});

const uploadFileToS3 = async (file, folder = '') => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/\s+/g, '_');
    const uniqueFileName = `${baseName}_${timestamp}${extension}`;
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    const parallelUploads3 = new Upload({
        client: s3,
        params: {
            Bucket: envVariables.aws_s3_bucket_name,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        },
    });

    await parallelUploads3.done();

    return {
        key,
        Location: `https://${envVariables.aws_s3_bucket_name}.s3.${envVariables.aws_s3_region}.amazonaws.com/${key}`,
    };
};



const deleteFileFromS3 = async (fileUrl) => {
    if (!fileUrl) return;
    const bucketUrl = `https://${envVariables.aws_s3_bucket_name}.s3.${envVariables.aws_s3_region}.amazonaws.com/`;
    const fileKey = fileUrl.replace(bucketUrl, '');

    if (!fileKey) {
        console.warn(`Could not extract S3 key from: ${fileUrl}`);
        return;
    }

    await s3.send(new DeleteObjectCommand({
        Bucket: envVariables.aws_s3_bucket_name,
        Key: fileKey,
    }));

    console.log(`Deleted from S3: ${fileKey}`);
};


module.exports = { uploadFileToS3, s3, deleteFileFromS3 };
