const prisma = require("../db/prisma");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { logAuditAction } = require("./auditLogsController");
const {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} = require("../utils/emailService");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: username }],
      },
      include: {
        status: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(401).json({
        error: "Please verify your email address before logging in.",
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    // Check if user status is 'Active'
    if (user.status && user.status.statusName !== "Active") {
      return res.status(403).json({
        error: `Your account is currently ${user.status.statusName}. Please contact an administrator.`,
      });
    }

    // Get the 'Active' status ID
    const activeStatus = await prisma.status.findFirst({
      where: { statusName: "Active" },
      select: { statusId: true },
    });

    if (!activeStatus) {
      console.error("Active status not found in the database");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Update last login timestamp and set user to Active status
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        lastLoginAt: new Date(),
        statusId: activeStatus.statusId,
      },
    });

    // Log the successful login and status update
    await logAuditAction(null, user.userId, "user", "login", {
      message: "User logged in, status set to Active",
    });

    // Extract roles and permissions
    const roles = user.roles.map((userRole) => userRole.role.roleName);
    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.rolePermissions.map(
        (rolePermission) => rolePermission.permission.permissionName,
      ),
    );

    res.locals.userId = user.userId?.toString();
    res.locals.username = user.username;
    res.locals.roles = roles;
    res.locals.permissions = [...new Set(permissions)]; // Remove duplicates
    res.locals.message = "Login successful";

    next();
  } catch (err) {
    console.error("Login Controller Error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        error:
          "First name, last name, username, email, and password are required.",
      });
    }

    // Trim names
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    // Validate names
    if (
      typeof trimmedFirstName !== "string" ||
      trimmedFirstName.length < 1 ||
      trimmedFirstName.length > 100
    ) {
      return res.status(400).json({
        error: "First name must be between 1 and 100 characters",
        field: "firstName",
      });
    }

    if (
      typeof trimmedLastName !== "string" ||
      trimmedLastName.length < 1 ||
      trimmedLastName.length > 100
    ) {
      return res.status(400).json({
        error: "Last name must be between 1 and 100 characters",
        field: "lastName",
      });
    }

    // Basic validation to satisfy API tests
    if (
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 100
    ) {
      return res.status(400).json({
        error: "Username must be between 3 and 100 characters",
        field: "username",
      });
    }
    // Basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address", field: "email" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long.",
        field: "password",
      });
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res
          .status(409)
          .json({ error: "Username already exists", field: "username" });
      }
      if (existingUser.email === email) {
        return res
          .status(409)
          .json({ error: "Email already exists", field: "email" });
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate a secure random token for email verification
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        username,
        email,
        passwordHash,
        emailVerified: false,
        statusId: 1, // Active status
      },
    });

    // Create email verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId: newUser.userId,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Ensure default visitor role exists, then assign
    let visitorRole = await prisma.role.findFirst({
      where: { roleName: "visitor" },
    });

    if (!visitorRole) {
      visitorRole = await prisma.role.create({
        data: { roleName: "visitor", description: "Default visitor role" },
      });
    }
    await prisma.userRole.create({
      data: {
        userId: newUser.userId,
        roleId: visitorRole.roleId,
      },
    });

    // Log the audit action for the successful registration
    await logAuditAction(null, newUser.userId, "user", "create", {
      username,
      email,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
    });

    // Send the verification email
    const emailResult = await sendEmailVerificationEmail(
      email,
      verificationToken,
    );

    // Prepare data for the JWT
    res.locals.userId = String(newUser.userId);
    res.locals.username = newUser.username;
    res.locals.roles = ["visitor"];
    res.locals.permissions = [];
    res.locals.message =
      "Registration successful. Please check your email to verify your account.";
    // Surface email preview URL in non-production for tests
    if (emailResult && emailResult.previewUrl) {
      res.locals.emailPreviewUrl = emailResult.previewUrl;
    }

    next();
  } catch (err) {
    console.error("Register Controller Error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

exports.setupProfile = async (req, res) => {
  try {
    const userId = res.locals.userId;

    const {
      gender,
      dateOfBirth,
      addressLine1,
      addressLine2,
      zipCode,
      phoneNumber,
    } = req.body;

    const hasAnyField =
      gender !== undefined ||
      dateOfBirth !== undefined ||
      addressLine1 !== undefined ||
      addressLine2 !== undefined ||
      zipCode !== undefined ||
      phoneNumber !== undefined;

    if (!hasAnyField) {
      return res
        .status(400)
        .json({ error: "At least one profile field is required" });
    }

    // Helpers (only for string fields)
    const sanitizeOptionalString = (v) => {
      if (v === undefined) return undefined; // skip update
      if (v === null) return null; // allow explicit clear
      if (typeof v !== "string") return undefined;
      const t = v.trim();
      return t === "" ? null : t;
    };

    // Build update payload dynamically (partial update)
    const data = { updatedAt: new Date() };

    // gender (no validation)
    if (gender !== undefined) data.gender = gender;

    // dateOfBirth (accept string "YYYY-MM-DD" or null/empty to clear)
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        data.dateOfBirth = null;
      } else {
        // accept string "YYYY-MM-DD" or a date-like string
        const parsed = new Date(dateOfBirth);
        if (!Number.isNaN(parsed.getTime())) {
          data.dateOfBirth = parsed;
        } else {
          return res.status(400).json({ error: "Invalid dateOfBirth value" });
        }
      }
    }

    // address lines
    const a1 = sanitizeOptionalString(addressLine1);
    const a2 = sanitizeOptionalString(addressLine2);
    if (a1 !== undefined) data.addressLine1 = a1;
    if (a2 !== undefined) data.addressLine2 = a2;

    // phone number
    const phone = sanitizeOptionalString(phoneNumber);
    if (phone !== undefined) data.phoneNumber = phone;

    // zipCode BigInt
    if (zipCode !== undefined) {
      if (zipCode === null || zipCode === "") {
        data.zipCode = null;
      } else {
        try {
          data.zipCode = BigInt(zipCode);
        } catch {
          return res.status(400).json({ error: "Invalid zipCode value" });
        }
      }
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { userId: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data,
    });

    return res.status(200).json({ message: "Profile setup saved" });
  } catch (err) {
    console.error("Setup Profile Controller Error:", err);
    return res
      .status(500)
      .json({ error: "Server error while setting up profile" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Generate the secure token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // If user exists, create password reset token
    if (user) {
      // Delete any existing password reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.userId },
      });

      // Create new password reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.userId,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      await sendPasswordResetEmail(email, resetToken);

      await logAuditAction(
        null, // No admin is performing this action
        user.userId, // The target user
        "auth",
        "forgot_password_request",
        { email: email, username: user.username },
      );
    }

    // Always return the same message for security
    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot Password Controller Error:", err);
    // Even on a server error, send a generic message if possible,
    // but logging the error is critical.
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long." });
    }

    // Find the password reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
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

    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { userId: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { passwordResetId: resetToken.passwordResetId },
    });

    // Log the password reset action
    await logAuditAction(null, resetToken.userId, "auth", "password_reset", {
      email: resetToken.user.email,
      username: resetToken.user.username,
    });

    res.status(200).json({ message: "Password has been successfully reset." });
  } catch (err) {
    console.error("Reset Password Controller Error:", err);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again." });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = res.locals.userId;

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        userId: true,
        username: true,
        email: true,
        profilePictureUrl: true,
        firstName: true,
        lastName: true,
        gender: true,
        phoneNumber: true,
        addressLine1: true,
        addressLine2: true,
        zipCode: true,
        dateOfBirth: true,
        languageId: true,
        createdAt: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract roles
    const roles = user.roles.map((userRole) => userRole.role.roleName);

    const userProfile = {
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,

      languageId: user.languageId ? user.languageId.toString() : null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      gender: user.gender ?? null,
      phoneNumber: user.phoneNumber ?? null,
      dateOfBirth: user.dateOfBirth ?? null,

      addressLine1: user.addressLine1 ?? null,
      addressLine2: user.addressLine2 ?? null,
      zipCode: user.zipCode ? user.zipCode.toString() : null,

      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
      roles,
      emailVerified: user.emailVerified ?? undefined,
    };

    // Only include emailVerified if the column exists
    if (user.emailVerified !== undefined) {
      userProfile.emailVerified = user.emailVerified;
    }

    res.status(200).json({
      user: userProfile,
    });
  } catch (err) {
    console.error("Get Profile Controller Error:", err);
    res.status(500).json({ error: "Server error while fetching profile" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: { passwordHash: newPasswordHash },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "password",
      action: "password_change",
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change Password Controller Error:", err);
    res.status(500).json({ error: "Server error while changing password" });
  }
};

exports.changeEmail = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res
        .status(400)
        .json({ error: "New email and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Password is incorrect" });
    }

    // Check if new email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: newEmail,
        userId: { not: BigInt(userId) },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Update email
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: { email: newEmail },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "email",
      oldValue: user.email,
      newValue: newEmail,
    });

    res.status(200).json({ message: "Email updated successfully" });
  } catch (err) {
    console.error("Change Email Controller Error:", err);
    res.status(500).json({ error: "Server error while changing email" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Validate username (basic validation)
    if (username.length < 3 || username.length > 50) {
      return res
        .status(400)
        .json({ error: "Username must be between 3 and 50 characters" });
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
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required.",
        errorType: "MISSING_TOKEN",
      });
    }

    // Find the verification token and check if it's not expired
    const verificationTokenRecord =
      await prisma.emailVerificationToken.findFirst({
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
          error:
            "This verification link has expired. Please request a new verification email.",
          errorType: "TOKEN_EXPIRED",
          userEmail: expiredToken.user.email,
        });
      } else {
        return res.status(400).json({
          error:
            "Invalid verification link. Please check your email for the correct link or request a new one.",
          errorType: "INVALID_TOKEN",
        });
      }
    }

    if (verificationTokenRecord.user.emailVerified) {
      return res.status(400).json({
        error:
          "This email address is already verified. You can proceed to login.",
        errorType: "ALREADY_VERIFIED",
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
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required.",
        errorType: "MISSING_EMAIL",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
        errorType: "INVALID_EMAIL_FORMAT",
      });
    }

    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({
        error:
          "No account found with this email address. Please check your email or register for a new account.",
        errorType: "USER_NOT_FOUND",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error:
          "This email address is already verified. You can proceed to login.",
        errorType: "ALREADY_VERIFIED",
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
    const emailResult = await sendEmailVerificationEmail(
      email,
      verificationToken,
    );

    if (emailResult.success) {
      res.status(200).json({
        message:
          "Verification email has been sent. Please check your email and spam folder.",
        success: true,
      });
    } else {
      // Log the error but don't expose email service issues to the user
      console.error("Email service error:", emailResult.error);
      res.status(500).json({
        error:
          "Failed to send verification email. This might be due to email service issues. Please try again in a few minutes.",
        errorType: "EMAIL_SERVICE_ERROR",
      });
    }
  } catch (err) {
    console.error("Resend Verification Email Controller Error:", err);
    res
      .status(500)
      .json({ error: "Server error during verification email resend" });
  }
};

exports.updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const profilePictureUrl = `${req.protocol}://${req.get("host")}/public/images/${
      file.filename
    }`;

    // Update the user's profilePictureUrl
    await prisma.user.update({
      where: { userId: BigInt(userId.toString()) },
      data: { profilePictureUrl },
      select: { userId: true, profilePictureUrl: true, username: true },
    });

    res.status(200).json({
      message: "Profile picture updated successfully!",
      profilePictureUrl,
    });
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changeUsername = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newUsername, password } = req.body;

    if (!newUsername || !password) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Validate username (basic validation)
    if (newUsername.length < 3 || newUsername.length > 50) {
      return res
        .status(400)
        .json({ error: "Username must be between 3 and 50 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { username: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: newUsername,
        userId: { not: BigInt(userId) },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Update username
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: {
        username: newUsername,
        updatedAt: new Date(),
      },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "username",
      oldValue: user.username,
      newValue: newUsername,
    });

    res.status(200).json({ message: "Username updated successfully" });
  } catch (err) {
    console.error("Update Username Controller Error:", err);
    res.status(500).json({ error: "Server error while updating username" });
  }
};

exports.changeName = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newFirstName, newLastName } = req.body;

    if (!newFirstName && !newLastName) {
      return res
        .status(400)
        .json({ error: "At least one name field is required" });
    }

    // basic validation
    const validateName = (value, fieldLabel) => {
      if (typeof value !== "string") return `${fieldLabel} must be a string`;
      const trimmed = value.trim();
      if (trimmed.length < 1 || trimmed.length > 100) {
        return `${fieldLabel} must be between 1 and 100 characters`;
      }
      return null;
    };

    if (newFirstName) {
      const errMsg = validateName(newFirstName, "First name");
      if (errMsg) return res.status(400).json({ error: errMsg });
    }

    if (newLastName) {
      const errMsg = validateName(newLastName, "Last name");
      if (errMsg) return res.status(400).json({ error: errMsg });
    }

    // fetch current values for audit logging
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { firstName: true, lastName: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // build update payload ONLY with updated fields
    const data = {
      updatedAt: new Date(),
    };

    if (newFirstName) data.firstName = newFirstName.trim();
    if (newLastName) data.lastName = newLastName.trim();

    // update name(s)
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data,
    });

    res.status(200).json({ message: "Name updated successfully" });
  } catch (err) {
    console.error("Update Name Controller Error:", err);
    res.status(500).json({ error: "Server error while updating names" });
  }
};

exports.changeGender = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newGender } = req.body;

    if (!newGender) {
      return res.status(400).json({ error: "Gender is required" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { gender: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If no actual change, short-circuit
    if (user.gender === newGender) {
      return res.status(200).json({
        message: "Gender is already set to this value",
      });
    }

    // Update gender
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: {
        gender: newGender,
        updatedAt: new Date(),
      },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "gender",
      oldValue: user.gender,
      newValue: newGender,
    });

    res.status(200).json({ message: "Gender updated successfully" });
  } catch (err) {
    console.error("Update Gender Controller Error:", err);
    res.status(500).json({ error: "Server error while updating gender" });
  }
};

exports.changeBirthdate = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newDateOfBirth } = req.body;

    if (!newDateOfBirth) {
      return res.status(400).json({ error: "Date of birth is required" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { dateOfBirth: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const parsed = new Date(newDateOfBirth);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "Invalid date of birth" });
    }

    // Update date of birth
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: { dateOfBirth: parsed, updatedAt: new Date() },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "dateOfBirth",
      oldValue: user.dateOfBirth,
      newValue: newDateOfBirth,
    });

    res.status(200).json({ message: "Date of birth updated successfully" });
  } catch (err) {
    console.error("Update Date of Birth Controller Error:", err);
    res
      .status(500)
      .json({ error: "Server error while updating date of birth" });
  }
};

exports.changePhoneNumber = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { newPhoneNumber } = req.body;

    if (!newPhoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate phone number (basic validation)
    if (newPhoneNumber.length !== 8) {
      return res.status(400).json({ error: "Phone number must be 8 digits" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: { phoneNumber: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if phone number is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phoneNumber: newPhoneNumber,
        userId: { not: BigInt(userId) },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Phone number is already taken" });
    }

    // Update phone number
    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: {
        phoneNumber: newPhoneNumber,
        updatedAt: new Date(),
      },
    });

    // Log audit action
    await logAuditAction(userId, userId, "user", "update", {
      field: "phoneNumber",
      oldValue: user.phoneNumber,
      newValue: newPhoneNumber,
    });

    res.status(200).json({ message: "Phone number updated successfully" });
  } catch (err) {
    console.error("Update Phone Number Controller Error:", err);
    res.status(500).json({ error: "Server error while updating phone number" });
  }
};

exports.changeAddress = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { addressLine1, addressLine2, zipCode } = req.body;

    if (!addressLine1 && !addressLine2 && zipCode === undefined) {
      return res.status(400).json({
        error: "At least one address field is required",
      });
    }

    // helpers
    const trimOrNull = (v) => {
      if (v === undefined) return undefined; // skip update
      if (v === null) return null; // explicit clear
      if (typeof v !== "string") return undefined;
      const t = v.trim();
      return t === "" ? null : t;
    };

    const a1 = trimOrNull(addressLine1);
    const a2 = trimOrNull(addressLine2);

    // validate address lengths
    const validateLen = (val, max, label) => {
      if (val == null) return null;
      if (val.length > max) return `${label} must be at most ${max} characters`;
      return null;
    };

    const err1 = validateLen(a1, 255, "Address line 1");
    if (err1) return res.status(400).json({ error: err1 });

    const err2 = validateLen(a2, 255, "Address line 2");
    if (err2) return res.status(400).json({ error: err2 });

    // zipCode handling (BigInt)
    let zipCodeBigInt;
    if (zipCode !== undefined) {
      // Allow string or number input
      if (
        (typeof zipCode !== "string" && typeof zipCode !== "number") ||
        zipCode === ""
      ) {
        return res.status(400).json({ error: "Invalid zip code" });
      }

      try {
        zipCodeBigInt = BigInt(zipCode);
      } catch {
        return res
          .status(400)
          .json({ error: "Zip code must be a valid number" });
      }
    }

    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        addressLine1: true,
        addressLine2: true,
        zipCode: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // build update payload
    const data = { updatedAt: new Date() };
    if (a1 !== undefined) data.addressLine1 = a1;
    if (a2 !== undefined) data.addressLine2 = a2;
    if (zipCode !== undefined) data.zipCode = zipCodeBigInt;

    await prisma.user.update({
      where: { userId: BigInt(userId) },
      data,
    });

    return res.status(200).json({ message: "Address updated successfully" });
  } catch (err) {
    console.error("Update Address Controller Error:", err);
    return res
      .status(500)
      .json({ error: "Server error while updating address" });
  }
};

exports.getConsents = async (req, res) => {
  try {
    const userId = res.locals.userId;

    const consents = await prisma.userConsent.findMany({
      where: { userId: BigInt(userId) },
      select: {
        type: true,
        granted: true,
        version: true,
        updatedAt: true,
      },
      orderBy: { type: "asc" },
    });

    const consentMap = consents.reduce((acc, c) => {
      acc[c.type] = c.granted;
      return acc;
    }, {});

    return res.status(200).json({
      consents: consentMap,
      rows: consents,
    });
  } catch (err) {
    console.error("Get Consents Controller Error:", err);
    return res.status(500).json({ error: "Server error while fetching consents" });
  }
};

exports.updateConsents = async (req, res) => {
  try {
    const userId = BigInt(res.locals.userId);

    const { marketingConsent, pictureConsent, version, consentText } = req.body;

    if (marketingConsent === undefined && pictureConsent === undefined) {
      return res
        .status(400)
        .json({ error: "At least one consent field is required" });
    }

    const updates = [];
    if (marketingConsent !== undefined) {
      updates.push({ type: "MARKETING", granted: Boolean(marketingConsent) });
    }
    if (pictureConsent !== undefined) {
      updates.push({ type: "PICTURE", granted: Boolean(pictureConsent) });
    }

    const results = await prisma.$transaction(
      updates.map((u) =>
        prisma.userConsent.upsert({
          where: {
            userId_type: {   
              userId,
              type: u.type,
            },
          },
          create: {
            userId,
            type: u.type,
            granted: u.granted,
            version: typeof version === "string" ? version : null,
            consentText: typeof consentText === "string" ? consentText : null,
          },
          update: {
            granted: u.granted,
            ...(typeof version === "string" ? { version } : {}),
            ...(typeof consentText === "string" ? { consentText } : {}),
          },
          select: {
            type: true,
            granted: true,
            version: true,
            updatedAt: true,
          },
        })
      )
    );

    const consentMap = results.reduce((acc, c) => {
      acc[c.type] = c.granted;
      return acc;
    }, {});

    return res.status(200).json({
      message: "Consents updated successfully",
      consents: consentMap,
      rows: results,
    });
  } catch (err) {
    console.error("Update Consents Controller Error:", err);
    return res.status(500).json({ error: "Server error while updating consents" });
  }
};



exports.updateLanguagePreference = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { languageId } = req.body;

    if (!languageId) {
      return res.status(400).json({ error: "Language ID is required" });
    }

    // Validate that the language exists
    const language = await prisma.language.findUnique({
      where: { languageId: BigInt(languageId) }
    });

    if (!language) {
      return res.status(404).json({ error: "Language not found" });
    }

    // Update user's language preference
    const updatedUser = await prisma.user.update({
      where: { userId: BigInt(userId) },
      data: {
        languageId: BigInt(languageId),
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        username: true,
        languageId: true,
        language: {
          select: {
            title: true,
            code: true
          }
        }
      }
    });

    res.status(200).json({
      message: "Language preference updated successfully",
      languageId: updatedUser.languageId.toString(),
      language: updatedUser.language
    });
  } catch (err) {
    console.error("Update Language Preference Controller Error:", err);
    res.status(500).json({ error: "Server error while updating language preference" });
  }
};