const { PrismaClient } = require('../../generated/prisma');

exports.checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const prisma = new PrismaClient(); // Create client per request
    try {
      const userId = res.locals.userId; 
      if (!userId) {
        return res.status(403).json({ error: 'Forbidden: User ID not found in token.' });
      }

      const userWithPermissions = await prisma.user.findUnique({
        where: { userId: BigInt(userId) },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  rolePermissions: {
                    select: {
                      permission: {
                        select: {
                          permissionName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const permissionsSet = new Set(
        userWithPermissions.roles
          .flatMap(role => role.role.rolePermissions)
          .map(p => p.permission.permissionName)
      );
        
      if (permissionsSet.has(requiredPermission)) {
        next();
      } else {
        res.status(403).json({ error: `Forbidden: This action requires the '${requiredPermission}' permission.` });
      }
    } catch (err) {
      console.error('Permission Check Middleware Error:', err);
      res.status(500).json({ error: 'Server error during permission check.' });
    } finally {
      await prisma.$disconnect(); // Disconnect client when done
    }
  };
};