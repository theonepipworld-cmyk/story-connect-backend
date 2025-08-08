const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { smtp_user, smtp_pass } = require('../config/secretVariables');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtp_user,
    pass: smtp_pass
  }
});

exports.sendEmail = async ({ to, subject, text, template, context }) => {
  try {
    let html;

    // If template is provided, compile it
    if (template) {
      const templatePath = path.join(__dirname, '..', 'templates', `${template}.html`);
      const source = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(source);
      html = compiledTemplate(context || {});
    }

    const mailOptions = {
      from: smtp_user,
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error.message || error);
    throw new Error(error.message || 'Failed to send email.');
  }
};
