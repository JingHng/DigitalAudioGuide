const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = async () => {
  // Use Gmail for sending emails
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  
  // Fallback to Ethereal Email for testing if no Gmail credentials
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Using Ethereal Email for testing (no Gmail credentials provided)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = await createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@example.com',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // For Ethereal Email, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('🔗 Preview email at:', previewUrl);
        console.log('📧 Password reset email sent to:', email);
        console.log('🔑 Reset token:', resetToken);
      }
    }
    
    console.log('Password reset email sent successfully');
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send email verification email
const sendEmailVerificationEmail = async (email, verificationToken) => {
  console.log(`📧 Creating transporter for email verification to: ${email}`);
  
  try {
    const transporter = await createTransporter();
    console.log(`✅ Transporter created successfully`);
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    console.log(`🔗 Verification URL: ${verificationUrl}`);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@example.com',
      to: email,
      subject: 'Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello,</p>
          <p>Thank you for registering! Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
          <p>If you didn't create an account, please ignore this email.</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this email.</p>
        </div>
      `,
    };

    console.log(`📤 Sending email verification to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`📬 Email sent with messageId: ${info.messageId}`);
    
    // For Ethereal Email, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('🔗 Preview email at:', previewUrl);
        console.log('📧 Email verification sent to:', email);
        console.log('🔑 Verification token:', verificationToken);
      }
    }
    
    console.log('✅ Email verification sent successfully');
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
};



