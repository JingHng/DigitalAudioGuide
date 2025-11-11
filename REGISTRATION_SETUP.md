# Registration Setup - Complete

## ✅ Files Copied and Configured

### Frontend Files
1. ✅ `web/src/routes/RegisterPage.tsx` - Registration form component
2. ✅ `web/src/css/RegisterPage.css` - Registration page styles
3. ✅ `web/src/routes/EmailVerificationPage.tsx` - Email verification component
4. ✅ `web/src/utils/apiClient.ts` - Axios client with token interceptor
5. ✅ `web/src/utils/authUtils.ts` - Authentication utilities

### Backend Files
1. ✅ `api/src/controllers/authController.js` - Authentication controller (register, login, email verification, etc.)
2. ✅ `api/src/routes/authRoutes.js` - Authentication routes
3. ✅ `api/src/middleware/jwtMiddleware.js` - JWT token middleware
4. ✅ `api/src/utils/emailService.js` - Email service for verification and password reset
5. ✅ `api/src/controllers/auditLogsController.js` - Audit logging controller

### Configuration Updates
1. ✅ `api/src/routes/mainRoutes.js` - Added auth routes
2. ✅ `web/src/App.tsx` - Added `/register` and `/verify-email` routes
3. ✅ `api/package.json` - Added `nodemailer` dependency
4. ✅ `api/app.js` - Fixed path and enabled dotenv

## 📦 Dependencies Installed
- ✅ `nodemailer` - Added to package.json and installed

## ⚙️ Required Environment Variables

Create or update `api/.env` file with the following:

```env
# Database
DATABASE_URL=postgres://username:password@host:port/database

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256

# Email Configuration (Optional - for Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Port
PORT=3000
```

## 🗄️ Database Requirements

The Prisma schema already includes all necessary models:
- ✅ `User` - with `emailVerified`, `passwordHash`, `statusId`
- ✅ `EmailVerificationToken` - for email verification
- ✅ `PasswordResetToken` - for password reset
- ✅ `AuditLog` - for audit logging
- ✅ `Role` and `UserRole` - for role management
- ✅ `Status` - for user status

### Required Database Records

Ensure your database has:

1. **Status Record** with `statusId=1` and `statusName='Active'`
2. **Role Record** with `roleName='visitor'`

You may need to run seed scripts or manually insert these records.

## 🚀 Next Steps

1. **Install dependencies** (if not already done):
   ```bash
   cd api
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   cd api
   npx prisma generate
   ```

3. **Run database migrations** (if needed):
   ```bash
   cd api
   npx prisma migrate dev
   ```

4. **Seed the database** with required roles and statuses:
   ```bash
   cd api
   npm run db:seed:dev
   ```

5. **Start the backend server**:
   ```bash
   cd api
   npm start
   # or
   npm run dev
   ```

6. **Start the frontend**:
   ```bash
   cd web
   npm run dev
   ```

## 🔍 Testing Registration

1. Navigate to `http://localhost:5173/register`
2. Fill in the registration form:
   - Username
   - Email
   - Password (min 6 characters)
   - Confirm Password
3. Submit the form
4. Check your email for verification link (or check console for Ethereal Email preview URL if using test email)
5. Click the verification link or navigate to `/verify-email` with the token
6. After verification, you can log in

## 📝 Notes

- Email service will use Ethereal Email (test service) if `EMAIL_USER` and `EMAIL_PASS` are not set
- Check console logs for email preview URLs when using Ethereal Email
- The registration process assigns the "visitor" role by default
- Users must verify their email before they can log in
- All registration actions are logged in the audit log

## 🐛 Troubleshooting

### Module Not Found Errors
- Ensure `nodemailer` is installed: `npm install nodemailer`
- Ensure Prisma client is generated: `npx prisma generate`
- Check that all file paths are correct

### Database Errors
- Verify database connection string in `.env`
- Ensure all migrations are applied
- Check that required roles and statuses exist in database

### Email Not Sending
- If using Gmail, ensure you're using an App Password (not your regular password)
- Check console logs for email preview URLs when using Ethereal Email
- Verify `FRONTEND_URL` is set correctly in `.env`

### Authentication Errors
- Verify JWT_SECRET_KEY is set in `.env`
- Check that JWT_EXPIRES_IN and JWT_ALGORITHM are set correctly
- Ensure token is being stored in localStorage after registration

