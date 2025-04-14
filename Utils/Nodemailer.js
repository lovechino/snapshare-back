const nodemailer = require("nodemailer")

const SendEmail = async(data)=>{
    const transporter = nodemailer.createTransport({
        service :'gmail' ,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        port : process.env.EMAIL_PORT
    })
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to : data.email,
        subject : data.subject,
        html : data.message
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info; // Thêm return để bạn có thể kiểm tra kết quả
    } catch (error) {
        console.error('Error sending email:', error);
        return error; // Trả về lỗi để bạn có thể xử lý nó
    }
}

module.exports = {SendEmail}