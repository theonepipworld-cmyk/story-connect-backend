require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwt_secret: process.env.JWT_SECRET,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
  aws_s3_access_key:process.env.AWS_S3_ACCESS_KEY,
  aws_s3_secret_key:process.env.AWS_S3_SECRET_KEY,
  aws_s3_bucket_name:process.env.AWS_S3_BUCKET_NAME,
  aws_s3_region:process.env.AWS_S3_REGION,
  MONGO_URI: process.env.MONGO_URI,
  frontend_base_url: process.env.FRONTEND_WEB_BASE_URL,
  admin_default_email: process.env.ADMIN_DEFAULT_EMAIL,
  admin_default_password: process.env.ADMIN_DEFAULT_PASSWORD,
  website_url: process.env.WEBSITE_URL || 'http://localhost:3000',
  shareable_link_base_url: process.env.SHAREABLE_LINK_BASE_URL,
};