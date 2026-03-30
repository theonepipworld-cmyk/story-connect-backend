const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const envVariables = require("../config/secretVariables");


//  Configure SES
const ses = new SESClient({
  region: envVariables.aws_s3_region, //change to your SES region
  credentials: {
    accessKeyId: envVariables.aws_s3_access_key,
    secretAccessKey: envVariables.aws_s3_secret_key,
  },
});

exports.sendEmail = async ({ to, subject, text, template, context }) => {
  try {

    console.log(" herere-----", to, subject, text, template, context)
    let html;

    // Compile template if provided
    if (template) {
      const templatePath = path.join(__dirname, "..", "templates", `${template}.html`);
      const source = fs.readFileSync(templatePath, "utf8");
      const compiledTemplate = handlebars.compile(source);
      html = compiledTemplate(context || {});
    }

    const params = {
      Source: envVariables.smtp_user, //  must be verified in SES
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          ...(text && {
            Text: {
              Data: text,
              Charset: "UTF-8",
            },
          }),
          ...(html && {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          }),
        },
      },
    };

    const command = new SendEmailCommand(params);
    const result = await ses.send(command);

    console.log("Email sent:", result.MessageId);
    return result;

  } catch (error) {
    console.error("Email sending failed:", error.message || error);
    throw new Error(error.message || "Failed to send email.");
  }
};