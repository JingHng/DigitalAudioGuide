# CI/CD Demo Application

A full-stack task management application with user authentication, task assignment, and user management features. Built with React, Node.js, Express, Prisma, and PostgreSQL.

## Features

- **Authentication System**: User registration and login with JWT tokens
- **Task Management**: Create, edit, delete, and assign tasks to users
- **User Management**: View users with pagination and role management
- **Backend Pagination**: Efficient database pagination for large datasets
- **Responsive Design**: Mobile-friendly interface with hamburger navigation
- **Comprehensive Testing**: E2E testing with Playwright
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

## Tech Stack

### Frontend
- React 19 with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Vite for build tooling
- Playwright for E2E testing

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication
- bcrypt for password hashing

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ci-cd-demo
   ```

2. **Set up the database**
   ```bash
   # Create a PostgreSQL database
   # Update the DATABASE_URL in ci-cd-demo/api/.env
   ```

3. **Install API dependencies**
   ```bash
   cd api
   npm install
   ```

4. **Install Web dependencies**
   ```bash
   cd ../web
   npm install
   ```

5. **Set up database schema**
   ```bash
   cd ../api
   npx prisma migrate dev
   npx prisma db seed
   ```

6. **Start the applications**
   
   Terminal 1 (API):
   ```bash
   cd api
   npm run dev
   ```
   
   Terminal 2 (Web):
   ```bash
   cd web
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:5175

## Default Users

After seeding the database, you can log in with:
- **Admin**: admin@example.com
- **Regular User**: user@example.com

## Testing

### E2E Testing with Playwright

1. **Install Playwright browsers**
   ```bash
   cd web
   npx playwright install
   ```

2. **Run tests**
   ```bash
   # Run all tests
   npm run e2e
   
   # Run tests in headed mode (visible browser)
   npx playwright test --headed
   
   # Run specific test file
   npx playwright test tests/e2e/auth.spec.ts
   
   # Run tests in debug mode
   npx playwright test --debug
   ```

3. **View test reports**
   ```bash
   npm run e2e:report
   ```

### Test Coverage

Our test suite covers:

#### Authentication Tests (`auth.spec.ts`)
- Login page display and navigation
- User registration flow
- Login with existing users
- Error handling for invalid inputs
- Mobile navigation menu
- Logout functionality

#### Task Management Tests (`tasks.spec.ts`)
- Task creation and assignment
- Task editing and cancellation
- Task status toggling (done/pending)
- Task deletion with confirmation
- Pagination controls
- Date display

#### User Management Tests (`users.spec.ts`)
- User table display with pagination
- Users per page dropdown functionality
- Navigation between pages
- Table styling and alternating rows
- Mobile responsive behavior
- URL-based pagination state

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/refresh` - Token refresh

### Tasks
- `GET /api/tasks?page=1&limit=10` - Get paginated tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Users
- `GET /api/users?page=1&limit=10` - Get paginated users

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:

### On Pull Requests:
- Lints code
- Runs security scans
- Runs all Playwright tests
- Uploads test reports as artifacts

### On Main Branch Push:
- Runs full test suite
- Builds both applications
- Creates deployment artifacts
- Ready for deployment to various platforms

### Pipeline Features:
- **PostgreSQL Service**: Spins up database for testing
- **Caching**: NPM dependencies cached for faster builds
- **Parallel Jobs**: Lint, test, and security scan run efficiently
- **Artifacts**: Test reports and deployment packages saved
- **Error Handling**: Comprehensive error reporting

## Development

### Project Structure
```
ci-cd-demo/
├── api/                 # Backend application
│   ├── src/            # Source code
│   ├── prisma/         # Database schema and migrations
│   └── package.json
├── web/                # Frontend application
│   ├── src/            # React components and pages
│   ├── tests/e2e/      # Playwright tests
│   └── package.json
└── .github/workflows/   # CI/CD pipeline
```

### Environment Variables

#### API (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
NODE_ENV="development"
PORT=5175
```

#### Web (.env.development)
```env
VITE_API_TARGET="http://localhost:5175"
```

### Key Features Implementation

#### Backend Pagination
- Efficient database queries with `skip` and `take`
- Metadata returned with pagination info
- URL parameters for page and limit

#### Authentication
- JWT access and refresh tokens
- Password hashing with bcrypt
- Role-based access control

#### Task Assignment
- Many-to-one relationship between tasks and users
- Optional assignment (tasks can be unassigned)
- User profiles with full names

## Deployment

The application is ready for deployment to various platforms:

### Example Deployment Targets:
- **Vercel** (Frontend) + **Railway/Heroku** (Backend)
- **AWS** (Full stack)
- **Docker** containers
- **Traditional VPS** with nginx

Deployment configurations are commented in the GitHub Actions workflow and can be easily enabled.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests as needed
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the ISC License.
