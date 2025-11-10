# Email Configuration Guide

## Current Status

Your application is currently using **Ethereal Email**, which is a **TEST SERVICE** that does NOT send real emails to your inbox.

### What is Ethereal Email?

Ethereal Email is a testing service provided by Nodemailer. When you register or request a verification email:
- ❌ **No real email is sent** to your email address
- ✅ **A preview URL is generated** that you can open in your browser to view the email
- ✅ This is perfect for **development and testing**

### How to View Verification Emails (Development Mode)

1. **After Registration**: Check the backend console for a preview URL, or look for the yellow warning box on the verification page
2. **Click the Preview URL**: This will open the email in your browser
3. **Click the Verification Link**: The verification link in the email will verify your account and redirect you to login

## Setting Up Real Email (Gmail)

To send real emails to actual email addresses, you need to configure Gmail credentials:

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account settings
2. Enable 2-Factor Authentication (required for App Passwords)

### Step 2: Generate an App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other (Custom name)" as the device
4. Enter "CICD Project" or any name
5. Click "Generate"
6. Copy the 16-character password (no spaces)

### Step 3: Configure Environment Variables

Add the following to your `api/.env` file:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

**Important**: 
- Use your full Gmail address for `EMAIL_USER`
- Use the 16-character App Password (not your regular Gmail password)
- Never commit your `.env` file to version control

### Step 4: Restart the Server

After adding the email credentials, restart your backend server:

```bash
cd api
npm run dev
```

### Step 5: Verify Email Sending

1. Register a new account
2. Check your email inbox (and spam folder)
3. Click the verification link in the email
4. You should be redirected to the login page

## Troubleshooting

### Emails Still Not Arriving

1. **Check Spam Folder**: Gmail sometimes marks automated emails as spam
2. **Verify App Password**: Make sure you're using the App Password, not your regular password
3. **Check Backend Logs**: Look for error messages in the console
4. **Test Connection**: The backend will log whether it's using Gmail or Ethereal Email

### Still Using Ethereal Email?

If you see preview URLs after configuring Gmail:
1. Check that `EMAIL_USER` and `EMAIL_PASS` are in your `.env` file
2. Make sure there are no typos or extra spaces
3. Restart the backend server after making changes
4. Check the backend console for error messages

### Gmail Security Warnings

If Gmail blocks the login:
1. Make sure 2-Factor Authentication is enabled
2. Use an App Password (not your regular password)
3. Check Google Account security settings for any blocked apps

## Alternative Email Services

If you don't want to use Gmail, you can modify `api/src/utils/emailService.js` to use other services:
- **SendGrid**: Requires API key
- **Mailgun**: Requires API key and domain
- **AWS SES**: Requires AWS credentials
- **SMTP Server**: Any SMTP server with authentication

## Development vs Production

- **Development**: Ethereal Email is fine for testing (preview URLs)
- **Production**: Always use a real email service (Gmail, SendGrid, etc.)

For production, also consider:
- Email delivery services (SendGrid, Mailgun)
- Email templates
- Email queuing for reliability
- Rate limiting to prevent spam

