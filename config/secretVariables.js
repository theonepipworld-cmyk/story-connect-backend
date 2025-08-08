require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwt_secret: process.env.JWT_SECRET,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
  MONGO_URI: process.env.MONGO_URI
};