const admin = require("firebase-admin");
//const serviceAccount = require("../story-connect-c35dc-firebase-adminsdk-fbsvc-f40a5a7783.json")
 
admin.initializeApp({
 // credential: admin.credential.cert(serviceAccount),
});


 
const androidPushNotification = (registrationToken, messageBody, type = 'Story Connect',extraData = '') => {
  try{
  const title = 'Story Connect';
 
  const message = {
    token: registrationToken,
    notification: {
      title: title,
      body: messageBody,
    },
    data: {
      message: messageBody,
      type: type,
      sound: "default",
      ...extraData
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          alert: {
            title,
            body: messageBody,
          },
          sound: "default",
        },
      },
    },
  };
 
  return admin.messaging().send(message);
}catch(error){
  console.log("ERROR::",error)
}
};
 
const sendNotificationToAll = async (tokens, messageBody, extraData = {}) => {
  const message = {
    notification: {
      title: "Spectra Solar",
      body: messageBody,
    },
    data: {
      message: messageBody,
      type: "Offer",
      sound: "default",
      ...extraData,
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          alert: {
            title: "Spectra Solar",
            body: messageBody,
          },
          sound: "default",
        },
      },
    },
  };
 
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      ...message,
    });
  }
};
 
 
 
 
 
 
module.exports = {
  androidPushNotification,
  sendNotificationToAll
};