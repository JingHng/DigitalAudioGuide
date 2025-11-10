# API Tests

This directory contains unit tests for the API endpoints and controllers.

## Test Structure

- `authController.test.js` - Tests for user registration, validation, and authentication logic

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Test Environment

Tests use the following environment variables (set automatically in CI):
- `DATABASE_URL` - PostgreSQL test database connection string
- `NODE_ENV=test` - Test environment mode
- `JWT_SECRET_KEY` - JWT secret key for testing
- `JWT_EXPIRES_IN` - JWT expiration time (default: 24h)
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `FRONTEND_URL` - Frontend URL for email verification links

## Test Coverage

The registration tests cover:
1. **Validation Tests**
   - Required field validation (username, email, password)
   - Username length validation (3-100 characters)
   - Email format validation
   - Password length validation (minimum 6 characters)
   - Input normalization (trimming, lowercase email)

2. **Duplicate User Checks**
   - Duplicate username rejection
   - Duplicate email rejection
   - Case-insensitive duplicate checks

3. **Successful Registration**
   - User creation in database
   - Password hashing
   - Email verification token creation
   - Visitor role assignment
   - JWT token generation data preparation
   - Email preview URL (for Ethereal Email in test environment)

## Mocking

Tests use mocks for:
- Email service (to avoid sending real emails)
- Audit log controller (to avoid database overhead)

## Database Cleanup

Tests automatically clean up test data after each test to ensure isolation.

