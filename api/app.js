// require('dotenv').config();
const express = require('express');
const mainRoutes = require('../api/src/routes/mainRoutes');
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

// Additional logging for debugging
console.log('Middleware and routes setup complete.');

// Print registered routes for debugging
console.log('\n🔍 REGISTERED ROUTES:');
if (app._router && app._router.stack) {
  app._router.stack.forEach(middleware => {
    if(middleware.route){ // routes registered directly on the app
      console.log(`Route: ${middleware.route.path}`);
    } else if(middleware.name === 'router'){ // router middleware 
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = handler.route.path;
          console.log(`Route: ${path}`);
        }
      });
    }
  });
} else {
  console.error('Error: Router stack is not initialized.');
}

module.exports = app;
