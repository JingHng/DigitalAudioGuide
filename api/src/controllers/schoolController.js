const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

const { logAuditAction } = require("./auditLogsController");

/**
 * @route   GET /api/schools
 * @desc    Get all top-level schools for the main listing page
 * @access  Public
 */
exports.getAllSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      where: { statusId: 1 }, // Only fetch active schools
      include: {
        // 🔑 FIX: Eagerly load the 'courses' array for each school object.
        courses: { 
          where: { statusId: 1 }, // Only include active courses
          select: { 
            courseId: true, 
            title: true, 
            description: true, 
            // Include images for the 'featuredCourse' section in the frontend
            images: { where: { isPrimary: true }, take: 1 } 
          }
        }, 
        // Include images for the school card display
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { title: 'asc' }, // Sort schools alphabetically
    });
    
    res.status(200).json(schools);
  } catch (err) {
    console.error("Error fetching schools:", err);
    res.status(500).json({ message: "Error fetching schools" });
  }
};

/**
 * @route   GET /api/schools/:id
 * @desc    Get a single school and all of its associated courses
 * @access  Public
 */
exports.getSchoolById = async (req, res) => {
  try {
    // 1. Variable: exhibitionId -> schoolId
    const schoolId = BigInt(req.params.id);
    
    // 2. Model: exhibition -> school
    // 3. Relation: exhibits -> courses
    const school = await prisma.school.findFirst({ 
      where: {
        schoolId: schoolId,
        statusId: 1, 
      },
      select: {
        schoolId: true,
        title: true,
        description: true,
        courses: { // exhibits -> courses
          where: { statusId: 1 },
          select: {
            courseId: true, // exhibitId -> courseId
            title: true,
            description: true,
            images: {
              select: {
                fileUrl: true,
              },
              where: { isPrimary: true },
              take: 1,
            },
          },
          orderBy: {
            title: 'asc',
          },
        },
      },
    });

    if (!school) { // exhibition -> school
      return res.status(404).json({ message: "Active school not found" });
    }
    // 4. Variable/Log: exhibition -> school
    res.status(200).json(school);
  } catch (err) {
    console.error("Error fetching school by ID:", err);
    res.status(500).json({ message: "Error fetching school" });
  }
};


/**
 * @route   POST /api/schools
 * @desc    Create a new main school
 * @access  Private (Admin)
 */
exports.createSchool = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    if (!title) {
      return res.status(400).json({ error: 'School title is required.' }); // Exhibition -> School
    }

    const imageUrl = file ? `/images/${file.filename}` : null;

    // Call the stored procedure - MUST BE UPDATED TO NEW PROC NAME!
    // NOTE: This assumes you have updated the stored procedure name.
    const result = await prisma.$queryRaw`CALL sp_create_school(${title}, ${description}, ${imageUrl}, NULL::bigint);`; 
    
    // New variable name for the output ID
    const newSchoolId = result[0].p_new_school_id;
    if (!newSchoolId) {
        throw new Error("School creation failed in database."); // Exhibition -> School
    }

    await logAuditAction(
      adminUserId, null, "school", "create", // exhibition -> school
      { schoolId: newSchoolId.toString(), title, hasCoverImage: !!file }, // exhibitionId -> schoolId
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(201).json({ message: "School created successfully", schoolId: newSchoolId }); // exhibitionId -> schoolId
  } catch (err) {
    console.error("Error creating school:", err); // exhibition -> school
    res.status(500).json({ message: "Failed to create school" }); // exhibition -> school
  }
};


/**
 * @route   PUT /api/schools/:id
 * @desc    Update an existing main school
 * @access  Private (Admin)
 */
exports.updateSchool = async (req, res) => {
  try {
    // 1. Variable: exhibitionId -> schoolId
    const schoolId = BigInt(req.params.id);
    const { title, description } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    // 2. Model: exhibition -> school (in findUnique)
    const originalSchool = await prisma.school.findUnique({ where: { schoolId } });
    if (!originalSchool) {
      return res.status(404).json({ message: "School not found." }); // Exhibition -> School
    }

    await prisma.$transaction(async (tx) => {
        // 3. Model: exhibition -> school (in update)
        await tx.school.update({
            where: { schoolId },
            data: { title, description },
        });

        // 4. Update image foreign key references
        if (file) {
            await tx.image.deleteMany({
                where: {
                    schoolId: schoolId, // exhibitionId -> schoolId
                    isPrimary: true,
                }
            });

            await tx.image.create({
                data: {
                    fileUrl: `/images/${file.filename}`,
                    title: `Cover for ${title}`,
                    schoolId: schoolId, // exhibitionId -> schoolId
                    isPrimary: true,
                }
            });
        }
    });

    // 5. Model: exhibition -> school (in findUnique)
    const updatedSchool = await prisma.school.findUnique({ where: { schoolId } });

    await logAuditAction(
      adminUserId,
      null,
      "school", // exhibition -> school
      "update",
      {
        schoolId: schoolId.toString(), // exhibitionId -> schoolId
        changes: {
          title: { from: originalSchool.title, to: updatedSchool.title },
          description: { from: originalSchool.description, to: updatedSchool.description },
        },
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json(updatedSchool);
  } catch (err) {
    console.error("Error updating school:", err); // exhibition -> school
    res.status(500).json({ message: "Failed to update school" }); // exhibition -> school
  }
};

/**
 * @route   DELETE /api/schools/:id
 * @desc    Delete a main school (and all courses within it)
 * @access  Private (Admin)
 */
exports.deleteSchool = async (req, res) => {
  try {
    // 1. Variable: exhibitionId -> schoolId
    const schoolId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    // 2. Model: exhibition -> school
    // 3. Relation: exhibits -> courses (in _count)
    const schoolToDeactivate = await prisma.school.findUnique({
      where: { schoolId },
      include: { _count: { select: { courses: true } } }, 
    });

    if (!schoolToDeactivate) {
      return res.status(404).json({ message: "School not found." }); // Exhibition -> School
    }

    // Call the stored procedure - MUST BE UPDATED TO NEW PROC NAME!
    await prisma.$executeRaw`CALL sp_deactivate_school(${schoolId});`;

    await logAuditAction(
      adminUserId, null, "school", "deactivate", // exhibition -> school
      {
        schoolId: schoolId.toString(), // exhibitionId -> schoolId
        title: schoolToDeactivate.title,
        deactivatedCoursesCount: schoolToDeactivate._count.courses, // deactivatedExhibitsCount -> deactivatedCoursesCount
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "School and its courses were marked as inactive." }); // Exhibition -> School
  } catch (err) {
    console.error("Error deactivating school:", err); // exhibition -> school
    res.status(500).json({ message: "Failed to deactivate school" }); // exhibition -> school
  }
};


/**
 * @route   GET /api/schools/admin/all
 * @desc    Get all schools with their nested courses for the admin panel
 * @access  Private (Admin)
 */
exports.getAllSchoolsWithCourses = async (req, res) => {
  try {
    // 1. Variable: exhibitionsWithExhibits -> schoolsWithCourses
    // 2. Model: exhibition -> school
    // 3. Relation: exhibits -> courses
    const schoolsWithCourses = await prisma.school.findMany({
      select: {
        schoolId: true, // exhibitionId -> schoolId
        title: true,
        description: true,
        status: {
          select: {
            statusId: true,
            statusName: true,
          }
        },
        courses: { // exhibits -> courses
          select: {
            courseId: true, // exhibitId -> courseId
            title: true,
            description: true,
            status: {
              select: {
                statusId: true,
                statusName: true,
              }
            },
            _count: {
              select: { images: true, audio: true },
            },
            images: {
              select: {
                imageId: true,
                fileUrl: true,
                title: true,
              },
              where: { isPrimary: true },
              take: 1,
            },
          },
          orderBy: {
            title: 'asc',
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });
    // 4. Variable/Log: exhibitionsWithExhibits -> schoolsWithCourses
    res.status(200).json(schoolsWithCourses);
  } catch (err) {
    console.error("Error fetching schools for admin:", err); // exhibitions -> schools
    res.status(500).json({ message: "Error fetching data for admin panel" });
  }
};


exports.reactivateSchool = async (req, res) => {
  try {
    // 1. Variable: exhibitionId -> schoolId
    const schoolId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    // 2. Model: exhibition -> school
    // 3. Relation: exhibits -> courses (in _count)
    const schoolToReactivate = await prisma.school.findUnique({
      where: { schoolId },
      include: { _count: { select: { courses: true } } },
    });

    if (!schoolToReactivate) {
      return res.status(404).json({ message: "School not found." }); // Exhibition -> School
    }

    // Call the stored procedure - MUST BE UPDATED TO NEW PROC NAME!
    await prisma.$executeRaw`CALL sp_reactivate_school(${schoolId});`;

    await logAuditAction(
      adminUserId, null, "school", "reactivate", // exhibition -> school
      {
        schoolId: schoolId.toString(), // exhibitionId -> schoolId
        title: schoolToReactivate.title,
        reactivatedCoursesCount: schoolToReactivate._count.courses, // reactivatedExhibitsCount -> reactivatedCoursesCount
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "School and its courses were reactivated." }); // Exhibition -> School
  } catch (err) {
    console.error("Error reactivating school:", err); // exhibition -> school
    res.status(500).json({ message: "Failed to reactivate school" }); // exhibition -> school
  }
};