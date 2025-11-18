const express = require("express");
const router = express.Router();
const imagesController = require("../controllers/imageController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

router.delete("/:id", jwtMiddleware.verifyToken, imagesController.deleteImage);

module.exports = router;
