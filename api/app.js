require('dotenv').config();
const express = require('express');
const mainRoutes = require('./src/routes/mainRoutes');
// const qrCodeRoute = require('./routes/qrCodeRoutes');
// const usersRoutes = require('./routes/usersRoutes');
// const rolesRoutes = require('./routes/rolesRoutes');
// const permissionsRoutes = require('./routes/permissionsRoutes');
// const auditLogsRoutes = require('./routes/auditLogsRoutes');
// const audioPlaybackRoutes = require('./routes/audioPlaybackRoutes');
// const audioRoutes = require('./routes/audioRoutes');
// const languageRoutes = require('./routes/languageRoutes');
// const translateRoutes = require('./routes/translationRoutes');
const path = require('path');
const cors = require('cors');

BigInt.prototype.toJSON = function() {
  return this.toString();
};


const app = express();

const corsOptions = {
  origin: 'http://localhost:5173', 
  
  credentials: true, 

  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));

const frontendBuildPath = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(frontendBuildPath));
app.use('/api', mainRoutes); // All routes under /api

// app.use('/api/qr', qrCodeRoute);
// app.use('/api/users', usersRoutes);
// app.use('/api/roles', rolesRoutes);
// app.use('/api/permissions', permissionsRoutes);
// app.use('/api/audit-logs', auditLogsRoutes);
// app.use('/api/audio-logs', audioPlaybackRoutes);
// app.use('/api/audio', audioRoutes);
// app.use('/api/language', languageRoutes);
// app.use('/api/translate', translateRoutes);

app.get('*', (req, res, next) => {
    // Check if the request is for a file that wasn't found (e.g., an image)
    // or if the request is for an API route that didn't match
    if (req.url.startsWith('/api')) {
        // If it's an API route that failed to match, let the server handle the 404/error
        return next();
    }
    
    // For all other requests, serve the main index.html file
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
        if (err) {
            // Log if the index.html file itself is missing, indicating a build/deployment issue
            console.error(`ERROR: Failed to send index.html from: ${frontendBuildPath}`, err);
            // Fallback for missing index.html
            res.status(500).send('Frontend application files are missing from the server.');
        }
    });
});

module.exports = app;
