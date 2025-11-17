# Test Credentials

## Admin User

The admin user is pre-seeded in the database with the following credentials:

- **Username**: `admin`
- **Email**: `admin@audiomuseum.com`
- **Password**: `admin123`
- **Role**: `admin`

## Regular Users

Regular users should be registered through the registration flow in the application. The tests will:
1. Register a new user during test setup
2. Use those credentials for login/logout testing

## Password Hash Generation

The seed file generates the admin password hash dynamically using bcrypt. If you need to generate a hash manually, run:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 12).then(h => console.log(h));"
```

## Verifying Password Hash

If you need to verify that a password hash is correct, you can use:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.compare('admin123', 'HASH_HERE').then(r => console.log(r ? 'Match' : 'No match'));"
```

Replace `HASH_HERE` with the actual hash from the seed file.

## Test Flow

1. **Admin Login Tests**: Use the pre-seeded admin user (`admin` / `admin123`)
2. **Regular User Tests**: Register a new user via the registration flow, then test login/logout with those credentials
3. **Email Verification**: Note that newly registered users require email verification before they can log in

