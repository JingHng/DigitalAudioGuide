require('dotenv').config();
const express = require('express');
const mainRoutes = require('./src/routes/mainRoutes');
const qrCodeRoute = require('./src/routes/qrCodeRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const rolesRoutes = require('./src/routes/rolesRoutes');
const permissionsRoutes = require('./src/routes/permissionsRoutes');
const auditLogsRoutes = require('./src/routes/auditLogsRoutes');
const audioPlaybackRoutes = require('./src/routes/audioPlaybackRoutes');
const audioRoutes = require('./src/routes/audioRoutes');
const languageRoutes = require('./src/routes/languageRoutes');
const translateRoutes = require('./src/routes/translationRoutes');
const path = require('path');
const cors = require('cors');

// This is required to serialize BigInts (like Prisma IDs) to JSON.
BigInt.prototype.toJSON = function() {
  return this.toString();
};


const app = express();

const corsOptions = {
 origin: true, // Allow all origins temporarily
 credentials: true,
 optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Frontend build path: use api/public on Azure, ../web/dist locally
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.WEBSITE_SITE_NAME;

const frontendBuildPath = isProduction 
 ? path.join(__dirname, 'public') // production: api/public
 : path.join(__dirname, '..', 'web', 'dist'); // local: ../web/dist

console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME);
console.log('🔍 isProduction:', isProduction);
console.log('Frontend build path:', frontendBuildPath);

// === STATIC FILE SERVING FIX ===

const publicStaticPath = isProduction
 ? path.join(__dirname, 'src', 'public') // Production: images are at /wwwroot/src/public
 : path.join(__dirname, 'src', 'public'); // Localhost: files are in 'src/public'

// **LOGGING FOR DEBUGGING:**
console.log('✅ DEBUG: publicStaticPath resolved to:', publicStaticPath);
console.log('✅ DEBUG: frontendBuildPath resolved to:', frontendBuildPath);

// Use the explicit publicStaticPath for /public routes
app.use('/public', express.static(publicStaticPath));


// 2. Serve the main frontend assets (index.html, /assets/...) from the root (/).
app.use(express.static(frontendBuildPath));


// Additional static route for production (redundant with above, but kept for safety)
if (isProduction) {
    app.use(express.static(path.join(__dirname, 'public')));
}


// === API ROUTES ===

app.use('/api', mainRoutes); // All routes under /api
app.use('/api/qr', qrCodeRoute);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/audio-logs', audioPlaybackRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/translate', translateRoutes);

// SPA catch-all: serve index.html for non-API routes (client-side routing)
app.use((req, res, next) => {
 if (req.path.startsWith('/api')) return next();
 
 // If the request wasn't matched by the static middleware, we assume it's a client-side route
 
 const indexPath = path.join(frontendBuildPath, 'index.html');
 res.sendFile(indexPath);
});

module.exports = app;