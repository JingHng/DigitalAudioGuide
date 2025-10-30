import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import bcrypt from "bcrypt";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authMiddleware 
} from "./auth";

const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();

app.get("/api/health", async (_, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Registration endpoint
app.post("/api/register", async (req, res) => {
  const { email, password, username } = req.body;
  
  console.log('Registration attempt:', { email, username, hasPassword: !!password });
  
  if (!email || !username) {
    return res.status(400).json({ error: "Email and username are required" });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
      console.log('Password hashed successfully');
    }

    // Ensure "user" role exists
    let userRole = await prisma.role.findUnique({
      where: { name: "user" }
    });

    if (!userRole) {
      console.log('Creating user role...');
      userRole = await prisma.role.create({
        data: { name: "user" }
      });
    }

    console.log('User role found/created:', userRole);

    // Create user with profile and role in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      console.log('Creating user in transaction...');
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          profile: {
            create: {
              fullName: username
            }
          },
          roles: {
            create: {
              roleId: userRole.id
            }
          }
        },
        include: {
          profile: true,
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      console.log('User created successfully:', { id: user.id, email: user.email, roles: user.roles.length });
      return user;
    });

    // Generate JWT tokens
    const tokenPayload = { userId: newUser.id, email: newUser.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    console.log('Registration completed successfully for:', email);

    // Return user data with tokens
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      username: newUser.profile?.fullName || username,
      fullName: newUser.profile?.fullName,
      roles: newUser.roles.map(r => r.role.name),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login endpoint with JWT tokens
app.post("/api/login", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate JWT tokens
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data with tokens
    res.json({
      id: user.id,
      email: user.email,
      username: user.profile?.fullName || email.split('@')[0],
      fullName: user.profile?.fullName,
      roles: user.roles.map(r => r.role.name),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Refresh token endpoint
app.post("/api/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// Protected endpoints - require authentication
app.get("/api/tasks", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata
  const totalTasks = await prisma.task.count();

  const tasks = await prisma.task.findMany({
    include: {
      assignedTo: {
        include: {
          profile: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: skip,
    take: limit
  });

  const totalPages = Math.ceil(totalTasks / limit);

  res.json({
    tasks,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalTasks,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
});

app.post("/api/tasks", authMiddleware, async (req, res) => {
  const { title, assignedToId } = req.body;
  const task = await prisma.task.create({ 
    data: { 
      title,
      assignedToId: assignedToId ? parseInt(assignedToId) : null
    },
    include: {
      assignedTo: {
        include: {
          profile: true
        }
      }
    }
  });
  res.status(201).json(task);
});

app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, assignedToId, done } = req.body;
  
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        title: title || undefined,
        assignedToId: assignedToId !== undefined ? (assignedToId ? parseInt(assignedToId) : null) : undefined,
        done: done !== undefined ? done : undefined
      },
      include: {
        assignedTo: {
          include: {
            profile: true
          }
        }
      }
    });
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(404).json({ error: "Task not found" });
  }
});

app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.task.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(404).json({ error: "Task not found" });
  }
});

app.get("/api/users", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata
  const totalUsers = await prisma.user.count();

  const users = await prisma.user.findMany({
    include: {
      profile: true,
      roles: {
        include: {
          role: true
        }
      }
    },
    skip: skip,
    take: limit,
    orderBy: {
      createdAt: 'asc'
    }
  });

  const totalPages = Math.ceil(totalUsers / limit);

  res.json({
    users,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalUsers,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
});

const PORT = Number(process.env.PORT || 5175);
app.listen(PORT, () => console.log(`API on :${PORT}`));
