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

// Frontend build path: use api/public on Azure, ../web/dist locally
const isProduction = process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME;
const frontendBuildPath = isProduction 
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..', 'web', 'dist');

console.log('Environment:', isProduction ? 'Production (Azure)' : 'Development (Local)');
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

// SPA catch-all: serve index.html for non-API routes (client-side routing)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath);
});

// Additional logging for debugging
console.log('Middleware and routes setup complete.');
console.log('Frontend build path:', frontendBuildPath);

module.exports = app;
