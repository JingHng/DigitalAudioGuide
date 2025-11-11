const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const { logAuditAction } = require('./auditLogsController');
const { sendPasswordResetEmail, sendEmailVerificationEmail } = require("../utils/emailService");

exports.login = async (req, res, next) => {
  const prisma = new PrismaClient(); // Create client per request
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      },
      include: {
        status: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(401).json({
        error: "Please verify your email address before logging in.",
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // Check if user status is 'Active'
    if (user.status && user.status.statusName !== 'Active') {
        return res.status(403).json({ error: `Your account is currently ${user.status.statusName}. Please contact an administrator.` });
    }

    // Get the 'Active' status ID
    const activeStatus = await prisma.status.findFirst({
      where: { statusName: 'Active' },
      select: { statusId: true }
    });

    if (!activeStatus) {
      console.error('Active status not found in the database');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Update last login timestamp and set user to Active status
    await prisma.user.update({
      where: { userId: user.userId },
      data: { 
        lastLoginAt: new Date(),
        statusId: activeStatus.statusId
      },
    });
    
    // Log the successful login and status update
    await logAuditAction(
      null, 
      user.userId, 
      'user', 
      'login', 
      { message: 'User logged in, status set to Active' }
    );

    // Extract roles and permissions
    const roles = user.roles.map(userRole => userRole.role.roleName);
    const permissions = user.roles.flatMap(userRole => 
      userRole.role.rolePermissions.map(rolePermission => rolePermission.permission.permissionName)
    );

    // Convert BigInt userId to string for JWT serialization
    res.locals.userId = user.userId.toString();
    res.locals.username = user.username;
    res.locals.roles = roles;
    res.locals.permissions = [...new Set(permissions)]; // Remove duplicates
    res.locals.message = "Login successful";

    next();
  } catch (err) {
    console.error('Login Controller Error:', err);
    res.status(500).json({ error: 'Server error during login' });
  } finally {
    await prisma.$disconnect(); // Disconnect client when done
  }
};


exports.register = async (req, res, next) => {
  const prisma = new PrismaClient();
  try {
    let { username, email, password } = req.body;

    // Normalize input: trim whitespace and convert to lowercase for comparison
    if (username) username = username.trim();
    if (email) email = email.trim().toLowerCase();

    if (!username || !email || !password) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Validate username format
    if (username.length < 3 || username.length > 100) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Username must be between 3 and 100 characters.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Validate password length
    if (password.length < 6) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    console.log(`🔍 Checking for existing user: username="${username}", email="${email}"`);

    // Check if username or email already exists
    // Use raw SQL for case-insensitive checking since Prisma doesn't support case-insensitive queries directly
    // First, try exact match (faster)
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      },
      select: {
        userId: true,
        username: true,
        email: true
      }
    });

    // If no exact match, check case-insensitively using raw query
    // This handles cases where PostgreSQL might have case differences
    if (!existingUser) {
      try {
        const caseInsensitiveCheck = await prisma.$queryRaw`
          SELECT "user_id", username, email 
          FROM "user" 
          WHERE LOWER(username) = LOWER(${username}) 
             OR LOWER(email) = LOWER(${email})
          LIMIT 1
        `;
        
        if (caseInsensitiveCheck && caseInsensitiveCheck.length > 0) {
          existingUser = {
            userId: caseInsensitiveCheck[0].user_id,
            username: caseInsensitiveCheck[0].username,
            email: caseInsensitiveCheck[0].email
          };
        }
      } catch (rawQueryError) {
        console.warn('⚠️ Could not perform case-insensitive check:', rawQueryError.message);
        // Continue with exact match only
      }
    }

    if (existingUser) {
      await prisma.$disconnect();
      console.log(`❌ User already exists:`, {
        userId: existingUser.userId.toString(),
        username: existingUser.username,
        email: existingUser.email,
        requestedUsername: username,
        requestedEmail: email
      });
      
      // Check which field matches (case-insensitive comparison)
      const usernameMatch = existingUser.username && 
        existingUser.username.toLowerCase() === username.toLowerCase();
      const emailMatch = existingUser.email && 
        existingUser.email.toLowerCase() === email.toLowerCase();
      
      if (usernameMatch) {
        return res.status(409).json({ 
          error: 'Username already exists. Please choose a different username.',
          field: 'username'
        });
      }
      if (emailMatch) {
        return res.status(409).json({ 
          error: 'Email already exists. Please use a different email address.',
          field: 'email'
        });
      }
      
      // Fallback error
      return res.status(409).json({ 
        error: 'A user with this username or email already exists.',
        field: 'unknown'
      });
    }

    console.log(`✅ No existing user found, proceeding with registration...`);

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate a secure random token for email verification
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create the user within a transaction to ensure atomicity
    // If any step fails, everything rolls back
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          emailVerified: false,
          statusId: 1 // Active status
        }
      });
      console.log(`✅ User created successfully: userId=${newUser.userId}, username=${newUser.username}`);
    } catch (createError) {
      await prisma.$disconnect();
      console.error('❌ Error creating user:', createError);
      
      // Handle Prisma unique constraint violation
      if (createError.code === 'P2002') {
        const target = createError.meta?.target;
        if (target && target.includes('username')) {
          return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
        }
        if (target && target.includes('email')) {
          return res.status(409).json({ error: 'Email already exists. Please use a different email address.' });
        }
        return res.status(409).json({ error: 'A user with this username or email already exists.' });
      }
      
      // Handle other database errors
      throw createError;
    }

    // Create email verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId: newUser.userId,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Assign default visitor role
    let visitorRole = await prisma.role.findFirst({
      where: { roleName: 'visitor' }
    });

    // If visitor role doesn't exist, create it
    if (!visitorRole) {
      console.warn('Visitor role not found. Creating visitor role...');
      visitorRole = await prisma.role.create({
        data: {
          roleName: 'visitor',
          description: 'Default visitor role'
        }
      });
    }

    // Assign visitor role to user
    try {
      await prisma.userRole.create({
        data: {
          userId: newUser.userId,
          roleId: visitorRole.roleId
        }
      });
    } catch (roleError) {
      console.error('Error assigning visitor role:', roleError);
      // Continue even if role assignment fails - user is still created
    }

    // Log the audit action for the successful registration (non-blocking)
    try {
      await logAuditAction(null, newUser.userId, 'user', 'create', { username, email });
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
      // Continue even if audit logging fails
    }

    // Send the verification email
    let emailPreviewUrl = null;
    try {
      const emailResult = await sendEmailVerificationEmail(email, verificationToken);
      if (emailResult.success) {
        if (emailResult.previewUrl) {
          // Using Ethereal Email (test service) - preview URL available
          emailPreviewUrl = emailResult.previewUrl;
          console.log('\n⚠️  NOTE: Using Ethereal Email (TEST SERVICE)');
          console.log('⚠️  No real email was sent. Use the preview URL to view the email.');
          console.log('📧 Preview URL:', emailPreviewUrl);
        } else {
          // Using real email service
          console.log('✅ Verification email sent successfully to real email:', email);
        }
      } else {
        console.error('❌ Email verification email failed to send:', emailResult.error);
        // Continue registration even if email fails - user can request resend later
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Continue registration even if email fails - user can request resend later
    }

    // Prepare data for the JWT
    // Convert BigInt userId to string for JWT serialization
    res.locals.userId = newUser.userId.toString();
    res.locals.username = newUser.username;
    res.locals.roles = ['visitor'];
    res.locals.permissions = [];
    res.locals.message = "Registration successful. Please check your email to verify your account.";
    res.locals.emailPreviewUrl = emailPreviewUrl; // Include preview URL for development/testing

    // Don't disconnect Prisma here - let the middleware chain complete first
    // The disconnect will happen after the response is sent
    next();

  } catch (err) {
    console.error('❌ Register Controller Error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
      name: err.name
    });
    
    // Try to send error response if headers haven't been sent
    if (!res.headersSent) {
      // Handle Prisma unique constraint violations
      if (err.code === 'P2002') {
        const target = err.meta?.target;
        if (target && target.includes('username')) {
          return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
        }
        if (target && target.includes('email')) {
          return res.status(409).json({ error: 'Email already exists. Please use a different email address.' });
        }
        return res.status(409).json({ error: 'A user with this username or email already exists.' });
      }
      
      // Handle database connection errors
      if (err.code === 'P1001' || err.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database connection error. Please try again later.' });
      }
      
      // Generic error
      const errorMessage = err.message || 'Server error during registration';
      res.status(500).json({ error: errorMessage });
    }
  } finally {
    // Disconnect Prisma after a short delay to allow middleware to complete
    // Use setTimeout to ensure middleware chain completes
    setTimeout(async () => {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting Prisma:', disconnectError);
      }
    }, 100);
  }
};



exports.forgotPassword = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    // Generate the secure token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // If user exists, create password reset token
    if (user) {
      // Delete any existing password reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.userId }
      });

      // Create new password reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.userId,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      await sendPasswordResetEmail(email, resetToken);

      await logAuditAction(
        null, // No admin is performing this action
        user.userId, // The target user
        'auth',
        'forgot_password_request',
        { email: email, username: user.username }
      );
    }

    // Always return the same message for security
    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (err) {
    console.error('Forgot Password Controller Error:', err);
    // Even on a server error, send a generic message if possible,
    // but logging the error is critical.
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    await prisma.$disconnect();
  }
};


exports.resetPassword = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Find the password reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: token,
        expiresAt: {
          gt: new Date() // Token must not be expired
        }
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { userId: resetToken.userId },
      data: { passwordHash: newPasswordHash }
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { passwordResetId: resetToken.passwordResetId }
    });

    // Log the password reset action
    await logAuditAction(
      null,
      resetToken.userId,
      'auth',
      'password_reset',
      { email: resetToken.user.email, username: resetToken.user.username }
    );

    res.status(200).json({ message: 'Password has been successfully reset.' });

  } catch (err) {
    console.error('Reset Password Controller Error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    await prisma.$disconnect();
  }
};




exports.getProfile = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const userId = res.locals.userId;

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        userId: true,
        username: true,
        email: true,
        createdAt: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract roles
    const roles = user.roles.map(userRole => userRole.role.roleName);

    const userProfile = {
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      roles: roles,
    };

    // Only include emailVerified if the column exists
    if (user.emailVerified !== undefined) {
      userProfile.emailVerified = user.emailVerified;
    }

    res.status(200).json({
      user: userProfile,
    });
  } catch (err) {
    console.error('Get Profile Controller Error:', err);
    res.status(500).json({ error: 'Server error while fetching profile' });
  } finally {
    await prisma.$disconnect();
  }
};

exports.changePassword = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const userId = res.locals.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: { passwordHash: newPasswordHash }
    });

    // Log audit action
    await logAuditAction(userId, userId, 'user', 'update', {
      field: 'password',
      action: 'password_change'
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change Password Controller Error:', err);
    res.status(500).json({ error: 'Server error while changing password' });
  } finally {
    await prisma.$disconnect();
  }
};

exports.changeEmail = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const userId = res.locals.userId;
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'New email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Check if new email already exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: newEmail,
        userId: { not: BigInt(userId) }
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Update email
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: { email: newEmail }
    });

    // Log audit action
    await logAuditAction(userId, userId, 'user', 'update', {
      field: 'email',
      oldValue: user.email,
      newValue: newEmail
    });

    res.status(200).json({ message: 'Email updated successfully' });
  } catch (err) {
    console.error('Change Email Controller Error:', err);
    res.status(500).json({ error: 'Server error while changing email' });
  } finally {
    await prisma.$disconnect();
  }
};

exports.updateProfile = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const userId = res.locals.userId;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Validate username (basic validation)
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: "Username must be between 3 and 50 characters" });
    }

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username,
        userId: { not: BigInt(userId) },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Update username
    const updatedUser = await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: {
        username: username,
        updatedAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const roles = updatedUser.roles.map((userRole) => userRole.role.roleName);

    const userProfile = {
      userId: updatedUser.userId.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt,
      roles: roles,
    };

    // Only include emailVerified if the column exists
    if (updatedUser.emailVerified !== undefined) {
      userProfile.emailVerified = updatedUser.emailVerified;
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: userProfile,
    });
  } catch (err) {
    console.error("Update Profile Controller Error:", err);
    res.status(500).json({ error: "Server error while updating profile" });
  } finally {
    await prisma.$disconnect();
  }
};

exports.verifyEmail = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: "Verification token is required.",
        errorType: "MISSING_TOKEN"
      });
    }

    // Find the verification token and check if it's not expired
    const verificationTokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        token: token,
        expiresAt: {
          gt: new Date(), // Token must not be expired
        },
      },
      include: {
        user: true,
      },
    });

    if (!verificationTokenRecord) {
      // Check if token exists but is expired
      const expiredToken = await prisma.emailVerificationToken.findFirst({
        where: { token: token },
        include: { user: true },
      });

      if (expiredToken) {
        return res.status(400).json({ 
          error: "This verification link has expired. Please request a new verification email.",
          errorType: "TOKEN_EXPIRED",
          userEmail: expiredToken.user.email
        });
      } else {
        return res.status(400).json({ 
          error: "Invalid verification link. Please check your email for the correct link or request a new one.",
          errorType: "INVALID_TOKEN"
        });
      }
    }

    if (verificationTokenRecord.user.emailVerified) {
      return res.status(400).json({ 
        error: "This email address is already verified. You can proceed to login.",
        errorType: "ALREADY_VERIFIED"
      });
    }

    // Update user email verification status and delete the token
    await prisma.$transaction([
      prisma.user.update({
        where: { userId: verificationTokenRecord.userId },
        data: {
          emailVerified: true,
          updatedAt: new Date(),
        },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { userId: verificationTokenRecord.userId },
      }),
    ]);

    res.status(200).json({ message: "Email verified successfully." });

  } catch (err) {
    console.error("Email Verification Controller Error:", err);
    res.status(500).json({ error: "Server error during email verification" });
  } finally {
    await prisma.$disconnect();
  }
};

exports.resendVerificationEmail = async (req, res) => {
  const prisma = new PrismaClient();
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: "Email is required.",
        errorType: "MISSING_EMAIL"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: "Please enter a valid email address.",
        errorType: "INVALID_EMAIL_FORMAT"
      });
    }

    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ 
        error: "No account found with this email address. Please check your email or register for a new account.",
        errorType: "USER_NOT_FOUND"
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        error: "This email address is already verified. You can proceed to login.",
        errorType: "ALREADY_VERIFIED"
      });
    }

    // Delete any existing verification tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.userId },
    });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create new verification token (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.userId,
        token: verificationToken,
        createdAt: new Date(),
        expiresAt: expiresAt,
      },
    });

    // Send verification email
    const emailResult = await sendEmailVerificationEmail(email, verificationToken);
    
    if (emailResult.success) {
      const responseData = {
        message: "Verification email has been sent. Please check your email and spam folder.",
        success: true
      };
      
      // Include preview URL for development/testing (Ethereal Email)
      if (emailResult.previewUrl) {
        responseData.previewUrl = emailResult.previewUrl;
        console.log(`📧 Verification email preview URL: ${emailResult.previewUrl}`);
      }
      
      res.status(200).json(responseData);
    } else {
      // Log the error but don't expose email service issues to the user
      console.error("Email service error:", emailResult.error);
      res.status(500).json({
        error: "Failed to send verification email. This might be due to email service issues. Please try again in a few minutes.",
        errorType: "EMAIL_SERVICE_ERROR"
      });
    }

  } catch (err) {
    console.error("Resend Verification Email Controller Error:", err);
    res.status(500).json({ error: "Server error during verification email resend" });
  } finally {
    await prisma.$disconnect();
  }
};

