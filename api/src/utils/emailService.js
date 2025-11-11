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
    console.log('\n⚠️  WARNING: Using Ethereal Email (TEST SERVICE)');
    console.log('⚠️  Ethereal Email does NOT send real emails to your inbox!');
    console.log('⚠️  It creates preview URLs that you can view in your browser.');
    console.log('⚠️  To send real emails, configure EMAIL_USER and EMAIL_PASS in your .env file.\n');
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
    
    // Always get preview URL (works for both Ethereal and real emails)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    if (previewUrl) {
      // Using Ethereal Email - show preview URL prominently
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL PREVIEW URL (Ethereal Email - Test Service)');
      console.log('='.repeat(80));
      console.log('⚠️  IMPORTANT: This is a TEST email service. No real email was sent!');
      console.log('🔗', previewUrl);
      console.log('🔑 Reset Token:', resetToken);
      console.log('='.repeat(80) + '\n');
    } else {
      console.log('✅ Password reset email sent successfully to real email address:', email);
    }
    
    return { success: true, previewUrl: previewUrl || null };
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
    
    // Always get preview URL (works for both Ethereal and real emails, but only Ethereal returns a URL)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    if (previewUrl) {
      // Using Ethereal Email - show preview URL prominently
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL PREVIEW URL (Ethereal Email - Test Service)');
      console.log('='.repeat(80));
      console.log('⚠️  IMPORTANT: This is a TEST email service. No real email was sent!');
      console.log('⚠️  Click the URL below to view the email in your browser:');
      console.log('🔗', previewUrl);
      console.log('🔑 Verification Token:', verificationToken);
      console.log('📧 Verification URL:', verificationUrl);
      console.log('='.repeat(80) + '\n');
    } else {
      // Using real email service (Gmail)
      console.log('✅ Email verification sent successfully to real email address:', email);
      console.log('📧 Please check your inbox (and spam folder) for the verification email.');
    }
    
    return { success: true, previewUrl: previewUrl || null };
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
};



