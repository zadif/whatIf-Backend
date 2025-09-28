import sendpulse from "sendpulse-api";
import dotenv from "dotenv";

dotenv.config();
/*
 * https://login.sendpulse.com/settings/#api
 */

const API_USER_ID = process.env.SendPulse_API_USER_ID;
const API_SECRET = process.env.SendPulse_API_SECRET;
const TOKEN_STORAGE = "/tmp/";

// Initialize once
sendpulse.init(API_USER_ID, API_SECRET, TOKEN_STORAGE, () => {
  console.log("SendPulse initialized ");
});

export function sendEmail(name, recipientEmail, link) {
  const message = {
    html: `<h5>Click below to confirm your account:</h5>
           <a href="${link}">Verify Email</a>`,
    text: `Verify your account: ${link}`,
    subject: "Verify your WhatIf account",
    from: {
      name: "What If",
      email: "noreply@whatif.qzz.io",
    },
    to: [
      {
        name,
        email: recipientEmail,
      },
    ],
  };

  sendpulse.smtpSendMail((data) => {}, message);
}
