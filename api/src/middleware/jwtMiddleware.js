//////////////////////////////////////////////////////
// REQUIRE DOTENV MODULE
//////////////////////////////////////////////////////
require("dotenv").config();
//////////////////////////////////////////////////////
// REQUIRE JWT MODULE
//////////////////////////////////////////////////////
const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////
// SET JWT CONFIGURATION
//////////////////////////////////////////////////////
const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN || "24h";
const tokenAlgorithm = process.env.JWT_ALGORITHM || "HS256";

// Validate that JWT_SECRET_KEY is set
if (!secretKey) {
  console.error("❌ ERROR: JWT_SECRET_KEY is not set in environment variables!");
  console.error("Please create a .env file in the api directory with:");
  console.error("JWT_SECRET_KEY=your-secret-key-here");
  console.error("JWT_EXPIRES_IN=24h");
  console.error("JWT_ALGORITHM=HS256");
  // Don't throw here, but we'll handle it in the middleware
}

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.generateToken = (req, res, next) => {
  // Check if secret key is set
  if (!secretKey) {
    console.error("❌ JWT_SECRET_KEY is not configured!");
    return res.status(500).json({ 
      error: "Server configuration error: JWT_SECRET_KEY is not set. Please configure your .env file.",
      details: "The server requires JWT_SECRET_KEY to be set in the environment variables."
    });
  }

  // Validate required fields
  if (!res.locals.userId || !res.locals.username) {
    console.error("❌ Missing required user data for JWT token");
    return res.status(500).json({ 
      error: "Server error: Missing user data for token generation"
    });
  }

  const payload = {
    userId: res.locals.userId,
    username: res.locals.username,
    roles: res.locals.roles || [], // Include user roles
    permissions: res.locals.permissions || [], // Include user permissions
    timestamp: new Date(),
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
  };

  const callback = (err, token) => {
    if (err) {
      console.error("❌ Error generating JWT token:", err);
      console.error("Error details:", {
        message: err.message,
        name: err.name
      });
      return res.status(500).json({ 
        error: "Failed to generate authentication token",
        details: err.message
      });
    } else {
      res.locals.token = token;
      next();
    }
  };

  // jwt.sign with callback is asynchronous
  // If secretKey is invalid, it will call the callback with an error
  // Synchronous errors (like missing secret) are handled by the callback
  jwt.sign(payload, secretKey, options, callback);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.sendToken = (req, res, next) => {
  const responseData = {
    message: res.locals.message,
    token: res.locals.token,
    user: {
      userId: res.locals.userId,
      username: res.locals.username,
      roles: res.locals.roles || [],
      permissions: res.locals.permissions || [],
    },
  };
  
  // Include email preview URL if available (for development/testing)
  if (res.locals.emailPreviewUrl) {
    responseData.emailPreviewUrl = res.locals.emailPreviewUrl;
  }
  
  // Include verification token in test mode for automated testing
  if (process.env.NODE_ENV === 'test' && res.locals.verificationToken) {
    responseData.verificationToken = res.locals.verificationToken;
  }
  
  res.status(200).json(responseData);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.verifyToken = (req, res, next) => {
  // Check if secret key is set
  if (!secretKey) {
    console.error("❌ JWT_SECRET_KEY is not configured!");
    return res.status(500).json({ 
      error: "Server configuration error: JWT_SECRET_KEY is not set. Please configure your .env file."
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please Login to Continue" });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({ error: "Please Login to Continue" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("Decoded token", decoded);

    // Attach to req.user for controller access
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      timestamp: decoded.timestamp,
    };

    // Also optional: attach to res.locals if needed by other middlewares
    res.locals.userId = decoded.userId;
    res.locals.username = decoded.username;
    res.locals.roles = decoded.roles || [];
    res.locals.permissions = decoded.permissions || [];

    next();
  });
};

// Middleware to require admin role
module.exports.requireAdmin = (req, res, next) => {
  if (!req.user || !Array.isArray(req.user.roles) || !req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};



