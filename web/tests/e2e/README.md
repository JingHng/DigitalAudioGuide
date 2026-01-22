# E2E Tests

This directory contains end-to-end tests using Playwright.

## Test Structure

- `homepage.spec.ts` - Tests for homepage functionality and API integration
- `registration.spec.ts` - Tests for user registration flow (form → API → DB → email)
- `login.spec.ts` - Tests for login page functionality and basic login flows
- `auth-login-logout.spec.ts` - Comprehensive tests for login and logout flows for both regular users and admins
- `exhibitions.spec.ts` - Tests for exhibitions page functionality
- `profile-page.spec.ts` - Tests for profile page functionality

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test registration.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

## Test Environment

Tests require:
- Backend API server running on `http://localhost:5175`
- Frontend dev server running on `http://localhost:5173` (started automatically by Playwright)
- Test database with schema migrated and seeded

## Registration Test Coverage

The registration E2E tests cover:
1. **UI Tests**
   - Registration page display and form fields
   - Form validation (frontend)
   - Password mismatch validation
   - Successful registration flow
   - Redirect to email verification page

2. **API Integration Tests**
   - User creation via API
   - Database verification (user exists)
   - Email verification token creation
   - Visitor role assignment
   - Duplicate username/email rejection
   - Password hashing verification

3. **Full Flow Tests**
   - Form submission → API call → Database → Email verification
   - Email preview URL display (for Ethereal Email)
   - Redirect flow after registration

## Test Data

### Registration Tests
Registration tests generate unique test data for each test run to avoid conflicts:
- Username: `testuser_{timestamp}_{random}`
- Email: `test_{timestamp}_{random}@example.com`
- Password: `TestPassword123!`

### Login/Logout Tests
Login and logout tests use pre-seeded test users from the database:
- **Admin User**:
  - Username: `admin`
  - Email: `admin@audiomuseum.com`
  - Password: `TestPassword123!`
  - Role: `admin`
- **Regular User**:
  - Username: `testuser`
  - Email: `testuser@example.com`
  - Password: `TestPassword123!`
  - Role: `visitor`

## Test Coverage

### Login/Logout Tests (`auth-login-logout.spec.ts`)
1. **Regular User Login**
   - Login with username
   - Login with email
   - Redirect to home page after login
   - Token and user data storage

2. **Admin User Login**
   - Login with username
   - Login with email
   - Redirect to admin dashboard after login
   - Admin role verification

3. **Login Error Handling**
   - Invalid credentials
   - Empty fields validation
   - Error message display

4. **Logout Functionality**
   - Regular user logout and session clearing
   - Admin user logout and session clearing
   - Protected route access prevention after logout
   - Session persistence verification

5. **Session Management**
   - Session persistence across page navigation
   - Concurrent logout from multiple tabs

## CI/CD

Tests run automatically in GitHub Actions on every push and pull request. The CI pipeline includes:
- **Setup Job**: Validates database and API server setup
- **Registration Test Job**: Runs registration API unit tests and E2E tests
- **Login/Logout Test Job**: Runs comprehensive login and logout E2E tests
- **General E2E Test Job**: Runs other E2E tests (homepage, exhibitions, etc.)

All test jobs run in parallel for faster CI execution.

