import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});

export const sendContactEmail = functions.https.onCall(async (data, context) => {
  const { name, email, message } = data;

  if (!name || !email || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const mailOptions = {
    from: functions.config().email.user,
    to: functions.config().email.admin, // Your admin email
    subject: `New Contact Form Submission from ${name}`,
    text: `
      Name: ${name}
      Email: ${email}
      Message: ${message}
    `,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Error sending email');
  }
}); 