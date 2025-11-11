# E2E Tests

This directory contains end-to-end tests using Playwright.

## Test Structure

- `homepage.spec.ts` - Tests for homepage functionality and API integration
- `registration.spec.ts` - Tests for user registration flow (form → API → DB → email)

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

Tests generate unique test data for each test run to avoid conflicts:
- Username: `testuser_{timestamp}_{random}`
- Email: `test_{timestamp}_{random}@example.com`
- Password: `TestPassword123!`

## CI/CD

Tests run automatically in GitHub Actions on every push and pull request.

