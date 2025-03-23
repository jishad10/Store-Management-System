import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,  
            port: process.env.EMAIL_PORT,  
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS, 
            },
        });

        const mailOptions = {
            from: `"Your App Name" <no-reply@yourapp.com>`,
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.error("Email sending failed:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
    }
};
