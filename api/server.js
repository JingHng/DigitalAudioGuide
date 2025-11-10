require('dotenv').config();
const app = require('./app');

// Validate required environment variables
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET_KEY'];
  const missing = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('\n❌ ERROR: Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n📝 Please create a .env file in the api directory with the following:');
    console.error('   DATABASE_URL=postgresql://username:password@localhost:5432/database_name');
    console.error('   JWT_SECRET_KEY=your-secret-key-here (use a long, random string)');
    console.error('   JWT_EXPIRES_IN=24h (optional, defaults to 24h)');
    console.error('   JWT_ALGORITHM=HS256 (optional, defaults to HS256)');
    console.error('   PORT=5175 (optional, defaults to 5175)');
    console.error('   FRONTEND_URL=http://localhost:5173 (optional)');
    console.error('\n💡 You can generate a secure JWT secret using:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('\n');
    process.exit(1);
  }

  // Warn about optional but recommended variables
  if (!process.env.JWT_EXPIRES_IN) {
    console.log('⚠️  JWT_EXPIRES_IN not set, using default: 24h');
  }
  if (!process.env.JWT_ALGORITHM) {
    console.log('⚠️  JWT_ALGORITHM not set, using default: HS256');
  }
  if (!process.env.FRONTEND_URL) {
    console.log('⚠️  FRONTEND_URL not set, using default: http://localhost:5173');
  }
  
  // Warn about email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n⚠️  EMAIL_USER and EMAIL_PASS not configured');
    console.log('⚠️  The system will use Ethereal Email (TEST SERVICE) for email verification');
    console.log('⚠️  Ethereal Email does NOT send real emails - it creates preview URLs');
    console.log('⚠️  To send real emails, add the following to your .env file:');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASS=your-app-password');
    console.log('   (For Gmail, you need to generate an App Password: https://support.google.com/accounts/answer/185833)\n');
  } else {
    console.log('✅ Email service configured (Gmail)');
  }

  console.log('✅ Environment variables validated');
}

// Validate environment before starting server
validateEnvironment();

// Default to 5175 to match Vite proxy configuration, or use PORT from environment
const PORT = process.env.PORT || 5175;

// Print registered routes for debugging after server starts
function printRoutes() {
  console.log('\n🔍 REGISTERED ROUTES:');
  try {
    if (app._router && app._router.stack) {
      app._router.stack.forEach(middleware => {
        if(middleware.route){ // routes registered directly on the app
          console.log(`Route: ${middleware.route.path}`);
        } else if(middleware.name === 'router'){ // router middleware 
          if (middleware.handle && middleware.handle.stack) {
            middleware.handle.stack.forEach(handler => {
              if (handler.route) {
                const path = handler.route.path;
                console.log(`Route: ${path}`);
              }
            });
          }
        }
      });
    } else {
      console.log('Router stack will be initialized on first request.');
    }
  } catch (error) {
    console.log('Note: Route logging skipped (router may initialize lazily).');
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // Print routes after server is listening
  setTimeout(printRoutes, 100);
});
