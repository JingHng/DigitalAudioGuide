const express = require('express');
const router = express.Router();
// 1. Controller file path and variable name change
const schoolsController = require('../controllers/schoolController'); 
const jwtMiddleware = require("../middleware/jwtMiddleware"); 
const { checkPermission } = require("../middleware/permissionMiddleware"); 
const { uploadImage } = require('../middleware/fileUploads');


// --- PUBLIC ROUTES ---
// 2. Change base route from '/api/exhibitions' to '/api/schools'
// This route gets the list of all main schools
router.get('/', schoolsController.getAllSchools);
// This route gets a single school and the list of courses inside it
router.get('/:id', schoolsController.getSchoolById);


// --- ADMIN-ONLY ROUTES ---
// 3. Update permissions from 'create_exhibit' to 'create_course'
// Route to create a new main school
router.post(
    '/',
    jwtMiddleware.verifyToken,
    checkPermission('create_course'),
    uploadImage.single('image'), 
    schoolsController.createSchool // Function name change
);

// 4. Update permissions from 'update_exhibit' to 'update_course'
// Route to update a main school
router.put(
    '/:id',
    jwtMiddleware.verifyToken,
    checkPermission('update_course'),
    uploadImage.single('image'), 
    schoolsController.updateSchool // Function name change
);

// 5. Update permissions from 'delete_exhibit' to 'delete_course'
// Route to delete a main school
router.delete(
    '/:id',
    jwtMiddleware.verifyToken,
    checkPermission('delete_course'),
    schoolsController.deleteSchool // Function name change
);


// 6. Update permissions from 'read_exhibit' to 'read_course'
router.get(
    '/admin/all',
    jwtMiddleware.verifyToken,
    checkPermission('read_course'),
    schoolsController.getAllSchoolsWithCourses // Function name change
);

// 7. Update permissions from 'update_exhibit' to 'update_course'
router.patch(
    '/:id/reactivate',
    jwtMiddleware.verifyToken,
    checkPermission('update_course'), 
    schoolsController.reactivateSchool // Function name change
);


module.exports = router;