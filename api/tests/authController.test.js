import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcrypt';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Mock the email service
vi.mock('../src/utils/emailService.js', () => ({
  sendEmailVerificationEmail: vi.fn(async () => ({
    success: true,
    previewUrl: 'https://ethereal.email/preview/test-url-12345'
  })),
  sendPasswordResetEmail: vi.fn(async () => ({
    success: true,
    previewUrl: 'https://ethereal.email/preview/test-url-12345'
  }))
}));

// Mock the audit log controller
vi.mock('../src/controllers/auditLogsController.js', () => ({
  logAuditAction: vi.fn(async () => true)
}));

// Import CommonJS module using createRequire
const authController = require('../src/controllers/authController.js');

describe('Registration Controller Tests', () => {
  let prisma;
  let testUserData;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db?schema=public'
        }
      }
    });

    // Generate test user data
    testUserData = {
      username: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      password: 'TestPassword123!'
    };
  });

  afterAll(async () => {
    // Clean up test data
    if (prisma) {
      try {
        await prisma.emailVerificationToken.deleteMany({
          where: {
            user: {
              email: {
                contains: '@example.com'
              }
            }
          }
        });
        await prisma.userRole.deleteMany({
          where: {
            user: {
              email: {
                contains: '@example.com'
              }
            }
          }
        });
        await prisma.user.deleteMany({
          where: {
            email: {
              contains: '@example.com'
            }
          }
        });
        await prisma.$disconnect();
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    if (prisma) {
      try {
        await prisma.emailVerificationToken.deleteMany({
          where: {
            user: {
              email: {
                contains: '@example.com'
              }
            }
          }
        });
        await prisma.userRole.deleteMany({
          where: {
            user: {
              email: {
                contains: '@example.com'
              }
            }
          }
        });
        await prisma.user.deleteMany({
          where: {
            email: {
              contains: '@example.com'
            }
          }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Registration Validation', () => {
    it('should validate that username is required', async () => {
      const req = {
        body: {
          email: testUserData.email,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should validate that email is required', async () => {
      const req = {
        body: {
          username: testUserData.username,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should validate that password is required', async () => {
      const req = {
        body: {
          username: testUserData.username,
          email: testUserData.email
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should validate username length (minimum 3 characters)', async () => {
      const req = {
        body: {
          username: 'ab',
          email: testUserData.email,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('3 and 100 characters')
        })
      );
    });

    it('should validate username length (maximum 100 characters)', async () => {
      const req = {
        body: {
          username: 'a'.repeat(101),
          email: testUserData.email,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('3 and 100 characters')
        })
      );
    });

    it('should validate email format', async () => {
      const req = {
        body: {
          username: testUserData.username,
          email: 'invalid-email',
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('valid email address')
        })
      );
    });

    it('should validate password length (minimum 6 characters)', async () => {
      const req = {
        body: {
          username: testUserData.username,
          email: testUserData.email,
          password: '12345'
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('at least 6 characters')
        })
      );
    });
  });

  describe('Registration Controller - Duplicate User Checks', () => {
    it('should reject registration with duplicate username', async () => {
      // Create a user first
      const existingUser = await prisma.user.create({
        data: {
          username: testUserData.username,
          email: testUserData.email,
          passwordHash: await bcrypt.hash(testUserData.password, 10),
          emailVerified: false,
          statusId: 1
        }
      });

      const req = {
        body: {
          username: testUserData.username,
          email: `different_${testUserData.email}`,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Username already exists'),
          field: 'username'
        })
      );

      // Cleanup
      await prisma.user.delete({ where: { userId: existingUser.userId } });
    });

    it('should reject registration with duplicate email', async () => {
      // Create a user first
      const existingUser = await prisma.user.create({
        data: {
          username: testUserData.username,
          email: testUserData.email,
          passwordHash: await bcrypt.hash(testUserData.password, 10),
          emailVerified: false,
          statusId: 1
        }
      });

      const req = {
        body: {
          username: `different_${testUserData.username}`,
          email: testUserData.email,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Email already exists'),
          field: 'email'
        })
      );

      // Cleanup
      await prisma.user.delete({ where: { userId: existingUser.userId } });
    });
  });

  describe('Registration Controller - Successful Registration', () => {
    it('should successfully register a new user', async () => {
      const uniqueUsername = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueEmail = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      
      const req = {
        body: {
          username: uniqueUsername,
          email: uniqueEmail,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        locals: {}
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      // Check that user was created in database
      const user = await prisma.user.findFirst({
        where: { username: uniqueUsername }
      });

      expect(user).toBeTruthy();
      expect(user.email).toBe(uniqueEmail.toLowerCase());
      expect(user.emailVerified).toBe(false);

      // Check that password was hashed
      const isPasswordValid = await bcrypt.compare(testUserData.password, user.passwordHash);
      expect(isPasswordValid).toBe(true);

      // Check that email verification token was created
      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: { userId: user.userId }
      });
      expect(verificationToken).toBeTruthy();
      expect(verificationToken.token).toBeTruthy();

      // Check that visitor role was assigned
      const visitorRole = await prisma.role.findFirst({
        where: { roleName: 'visitor' }
      });
      if (visitorRole) {
        const userRole = await prisma.userRole.findFirst({
          where: {
            userId: user.userId,
            roleId: visitorRole.roleId
          }
        });
        expect(userRole).toBeTruthy();
      }

      // Check that res.locals was set for JWT token generation
      expect(res.locals.userId).toBe(user.userId.toString());
      expect(res.locals.username).toBe(uniqueUsername);
      expect(res.locals.roles).toContain('visitor');
      expect(res.locals.message).toContain('Registration successful');

      // Cleanup
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.userId }
      });
      await prisma.userRole.deleteMany({
        where: { userId: user.userId }
      });
      await prisma.user.delete({
        where: { userId: user.userId }
      });
    });

    it('should create visitor role if it does not exist', async () => {
      // Delete visitor role if it exists
      const existingVisitorRole = await prisma.role.findFirst({
        where: { roleName: 'visitor' }
      });
      if (existingVisitorRole) {
        await prisma.userRole.deleteMany({
          where: { roleId: existingVisitorRole.roleId }
        });
        await prisma.role.delete({
          where: { roleId: existingVisitorRole.roleId }
        });
      }

      const uniqueUsername = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueEmail = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      
      const req = {
        body: {
          username: uniqueUsername,
          email: uniqueEmail,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        locals: {}
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      // Check that visitor role was created
      const visitorRole = await prisma.role.findFirst({
        where: { roleName: 'visitor' }
      });
      expect(visitorRole).toBeTruthy();

      // Check that user was assigned the visitor role
      const user = await prisma.user.findFirst({
        where: { username: uniqueUsername }
      });
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId: user.userId,
          roleId: visitorRole.roleId
        }
      });
      expect(userRole).toBeTruthy();

      // Cleanup
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.userId }
      });
      await prisma.userRole.deleteMany({
        where: { userId: user.userId }
      });
      await prisma.user.delete({
        where: { userId: user.userId }
      });
    });

    it('should include emailPreviewUrl in response when using Ethereal Email', async () => {
      const uniqueUsername = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueEmail = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      
      const req = {
        body: {
          username: uniqueUsername,
          email: uniqueEmail,
          password: testUserData.password
        }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        locals: {}
      };
      const next = vi.fn();

      await authController.register(req, res, next);

      // Check that emailPreviewUrl was set in res.locals
      expect(res.locals.emailPreviewUrl).toBeTruthy();
      expect(res.locals.emailPreviewUrl).toContain('ethereal.email');

      // Cleanup
      const user = await prisma.user.findFirst({
        where: { username: uniqueUsername }
      });
      if (user) {
        await prisma.emailVerificationToken.deleteMany({
          where: { userId: user.userId }
        });
        await prisma.userRole.deleteMany({
          where: { userId: user.userId }
        });
        await prisma.user.delete({
          where: { userId: user.userId }
        });
      }
    });
  });
});
