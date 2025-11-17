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
let secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN || '24h';
const envAlgorithm = (process.env.JWT_ALGORITHM || 'HS256').toUpperCase();
const allowedAlgorithms = [
  'HS256', 'HS384', 'HS512',
  'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512',
  'ES256', 'ES384', 'ES512',
  'EdDSA'
];
const tokenAlgorithm = allowedAlgorithms.includes(envAlgorithm) ? envAlgorithm : 'HS256';

if (!secretKey) {
  // Development fallback: create a deterministic secret per machine session
  secretKey = 'dev-insecure-secret-change-me';
  console.warn('⚠️  JWT_SECRET_KEY not set, using an insecure development default.');
}

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.generateToken = (req, res, next) => {
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
      console.error("Error jwt:", err);
      res.status(500).json(err);
    } else {
      res.locals.token = token;
      next();
    }
  };

  const token = jwt.sign(payload, secretKey, options, callback);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.sendToken = (req, res, next) => {
  res.status(200).json({
    message: res.locals.message,
    token: res.locals.token,
    // Only present in test/dev when using Ethereal Email
    emailPreviewUrl: res.locals.emailPreviewUrl,
    user: {
      userId: res.locals.userId,
      username: res.locals.username,
      roles: res.locals.roles || [],
      permissions: res.locals.permissions || [],
    },
  });
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
//////////////////////////////////////////////////////
// module.exports.verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ error: "Please Login to Continue" });
//   }

//   const token = authHeader.substring(7);

//   if (!token) {
//     return res.status(401).json({ error: "Please Login to Continue" });
//   }

//   const callback = (err, decoded) => {
//     if (err) {
//       return res.status(401).json({ error: "Invalid token" });
//     }

//     console.log("Decoded token", decoded);
//     res.locals.userId = decoded.userId;
//     res.locals.creator_id = decoded.userId;
//     res.locals.username = decoded.username;
//     res.locals.roles = decoded.roles || [];
//     res.locals.permissions = decoded.permissions || [];
//     res.locals.tokenTimestamp = decoded.timestamp;

//     next();
//   };

//   jwt.verify(token, secretKey, callback);
// };

module.exports.verifyToken = (req, res, next) => {
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



