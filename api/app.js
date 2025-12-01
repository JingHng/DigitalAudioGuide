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

app.use('/public', express.static(path.join(__dirname, 'src', 'public')));

// Serve frontend static files - different paths for development vs production
const isProduction = process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME; // Azure sets WEBSITE_SITE_NAME
const frontendBuildPath = isProduction 
  ? path.join(__dirname, 'public')  // Azure: files copied to api/public during deployment
  : path.join(__dirname, '..', 'web', 'dist'); // Local: files in web/dist

console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log('Frontend build path:', frontendBuildPath);

app.use(express.static(frontendBuildPath));
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

// Catch-all handler for React Router (production only)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Additional logging for debugging
console.log('Middleware and routes setup complete.');
console.log('Frontend build path:', frontendBuildPath);

module.exports = app;
