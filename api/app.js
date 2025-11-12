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
  origin: function (origin, callback) {
    // Allow requests with no origin 
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow Azure domain
    if (origin.includes('azurewebsites.net')) {
      return callback(null, true);
    }
    
    // Specific Azure domain 
    if (origin === 'https://sdcgroup3-bwbnekdtd7h8bzg4.malaysiawest-01.azurewebsites.net') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
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

// Health check endpoint (IMPORTANT FOR AZURE)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CICDP Group 3 API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/public/')) {
    return next();
  }
  

  
  // Serve frontend index.html for all other routes
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`ERROR: Failed to send index.html from: ${frontendBuildPath}`, err);
      res.status(500).json({ 
        error: 'Frontend application files are missing from the server.',
        path: indexPath 
      });
    }
  });
});

// Additional logging for debugging
console.log('Middleware and routes setup complete.');
console.log('Frontend build path:', frontendBuildPath);

module.exports = app;
