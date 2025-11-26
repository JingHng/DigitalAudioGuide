const { Client } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // Terminate other connections to prevent deadlocks
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity 
      WHERE datname = current_database() 
      AND pid <> pg_backend_pid()
      AND state = 'active';
    `);

    // Wait a moment for connections to close
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Drop all existing tables dynamically
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT quote_ident(tablename) AS table_name
          FROM pg_tables
          WHERE schemaname = 'public'
        ) LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || r.table_name || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log("🧨 All existing tables dropped.");

    // 1. STATUS table (foundational)
    await client.query(`
      CREATE TABLE status (
        status_id SERIAL PRIMARY KEY,
        status_name VARCHAR(30) NOT NULL UNIQUE
      );
    `);

    await client.query(`
      INSERT INTO status (status_name) VALUES ('Active'), ('Inactive'), ('Suspended');
      `);

   // 2. SCHOOLS table (formerly EXHIBITIONS)
    await client.query(`
      CREATE TABLE schools (
        school_id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. badge table
    await client.query(`
    CREATE TABLE badge (
    badge_id BIGSERIAL PRIMARY KEY,
    name TEXT,
    description TEXT,
    image_url VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    `);

   // 4. COURSES table (formerly EXHIBIT)
    await client.query(`
      CREATE TABLE courses (
        course_id BIGSERIAL PRIMARY KEY,
        school_id BIGINT REFERENCES schools(school_id) ON DELETE CASCADE,
        badge_id BIGINT UNIQUE REFERENCES badge(badge_id) ON DELETE SET NULL, -- NEW FIELD
        title VARCHAR(255) NOT NULL,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. QR_CODE table to link courses and QR URLs
    await client.query(`
      CREATE TABLE qr_code (
        qr_id SERIAL PRIMARY KEY,
        course_id BIGINT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        qr_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. LANGUAGE table
    await client.query(`
      CREATE TABLE language (
        language_id BIGSERIAL PRIMARY KEY,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        lang_code VARCHAR(10) UNIQUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. USER table
    await client.query(`
      CREATE TABLE "user" (
        user_id BIGSERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(72) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. USER_BADGE table
    await client.query(`
    CREATE TABLE user_badge (
    user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
    badge_id BIGINT REFERENCES badge(badge_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id) 
    );
    `);

    // 9. ROLES table
    await client.query(`
      CREATE TABLE roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. PERMISSIONS table
    await client.query(`
      CREATE TABLE permissions (
        permission_id SERIAL PRIMARY KEY,
        permission_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. USER_ROLES junction table
    await client.query(`
      CREATE TABLE userroles (
        user_id BIGINT NOT NULL,
        role_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
      );
    `);

    // 12. ROLES_PERMISSION junction table
    await client.query(`
      CREATE TABLE roles_permission (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
      );
    `);

    // 13. SESSIONS table
    await client.query(`
      CREATE TABLE sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
      );
    `);

    // 14. PASSWORD_RESET_TOKEN table
    await client.query(`
      CREATE TABLE password_reset_token (
        password_reset_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
      );
    `);

    // 15. EMAIL_VERIFICATION_TOKEN table
    await client.query(`
      CREATE TABLE email_verification_token (
        email_verification_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
      );
    `);

    // 16. AUDIO table (FK updated to course_id)
    await client.query(`
      CREATE TABLE audio (
        audio_id SERIAL PRIMARY KEY,
        course_id BIGINT REFERENCES courses(course_id) ON DELETE CASCADE,
        language_id BIGINT REFERENCES language(language_id) ON DELETE SET NULL,
        file_url VARCHAR(512),
        title TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. IMAGES table (FKs updated to course_id and school_id)
    await client.query(`
      CREATE TABLE images (
        image_id BIGSERIAL PRIMARY KEY,
        course_id BIGINT REFERENCES courses(course_id) ON DELETE CASCADE,
        school_id BIGINT REFERENCES schools(school_id) ON DELETE CASCADE, 
        title TEXT,
        description TEXT,
        file_url VARCHAR(512),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. SUBTITLE table
    await client.query(`
      CREATE TABLE subtitle (
        subtitle_id BIGSERIAL PRIMARY KEY,
        audio_id INTEGER REFERENCES audio(audio_id) ON DELETE CASCADE,
        language_id BIGINT REFERENCES language(language_id) ON DELETE SET NULL,
        text JSONB,
        created_by BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

   // 19. FEEDBACK table (FK updated to course_id)
    await client.query(`
      CREATE TABLE feedback (
        feedback_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
        course_id BIGINT REFERENCES courses(course_id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 20. AUDIO_PLAYBACK_LOGS table
    await client.query(`
      CREATE TABLE audio_playback_logs (
        audio_logs_id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
        audio_id INTEGER REFERENCES audio(audio_id) ON DELETE CASCADE,
        audio_start TIMESTAMPTZ,
        audio_end TIMESTAMPTZ,
        duration_listened INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 21. AUDIT_LOGS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
      audit_log_id BIGSERIAL PRIMARY KEY,
      admin_user_id BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL,
      target_user_id BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      changes TEXT,
      metadata TEXT,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    `);

    // 19. SETTINGS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add comprehensive performance indexes
    await client.query(`
      -- User table indexes
      CREATE INDEX idx_user_username ON "user"(username);
      CREATE INDEX idx_user_email ON "user"(email);
      CREATE INDEX idx_user_status ON "user"(status_id);
      CREATE INDEX idx_user_created_at ON "user"(created_at);
      CREATE INDEX idx_user_last_login ON "user"(last_login_at);

      -- Session indexes
      CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX idx_sessions_created_at ON sessions(created_at);

      -- Password reset token indexes
      CREATE INDEX idx_password_reset_user_id ON password_reset_token(user_id);
      CREATE INDEX idx_password_reset_token ON password_reset_token(token);
      CREATE INDEX idx_password_reset_expires_at ON password_reset_token(expires_at);
      CREATE INDEX idx_password_reset_created_at ON password_reset_token(created_at);

      -- Email verification token indexes
      CREATE INDEX idx_email_verification_user_id ON email_verification_token(user_id);
      CREATE INDEX idx_email_verification_token ON email_verification_token(token);
      CREATE INDEX idx_email_verification_expires_at ON email_verification_token(expires_at);
      CREATE INDEX idx_email_verification_created_at ON email_verification_token(created_at);

      -- Role and permission indexes
      CREATE INDEX idx_userroles_user_id ON userroles(user_id);
      CREATE INDEX idx_userroles_role_id ON userroles(role_id);
      CREATE INDEX idx_roles_permission_role_id ON roles_permission(role_id);
      CREATE INDEX idx_roles_permission_permission_id ON roles_permission(permission_id);
      CREATE INDEX idx_roles_name ON roles(role_name);
      CREATE INDEX idx_permissions_name ON permissions(permission_name);

      -- Course (formerly Exhibit) and content indexes
      CREATE INDEX idx_course_title ON courses(title);
      CREATE INDEX idx_course_created_at ON courses(created_at);

      -- QR Code indexes (Table and column name updated)
      CREATE INDEX idx_qr_code_course_id ON qr_code(course_id);
      CREATE INDEX idx_qr_code_url ON qr_code(qr_url);

      -- Audio indexes (Column name updated)
      CREATE INDEX idx_audio_course_id ON audio(course_id);
      CREATE INDEX idx_audio_language_id ON audio(language_id);
      CREATE INDEX idx_audio_title ON audio(title);
      CREATE INDEX idx_audio_created_at ON audio(created_at);

      -- Image indexes (Column names updated)
      CREATE INDEX idx_images_course_id ON images(course_id);
      CREATE INDEX idx_images_is_primary ON images(is_primary);
      CREATE INDEX idx_images_title ON images(title);

      -- Language indexes
      CREATE INDEX idx_language_code ON language(lang_code);
      CREATE INDEX idx_language_is_default ON language(is_default);
      CREATE INDEX idx_language_status ON language(status_id);
      CREATE INDEX idx_language_title ON language(title);

      -- Subtitle indexes
      CREATE INDEX idx_subtitle_audio_id ON subtitle(audio_id);
      CREATE INDEX idx_subtitle_language_id ON subtitle(language_id);
      CREATE INDEX idx_subtitle_created_by ON subtitle(created_by);
      CREATE INDEX idx_subtitle_created_at ON subtitle(created_at);

      -- Feedback indexes (Column name updated)
      CREATE INDEX idx_feedback_user_id ON feedback(user_id);
      CREATE INDEX idx_feedback_course_id ON feedback(course_id);
      CREATE INDEX idx_feedback_rating ON feedback(rating);
      CREATE INDEX idx_feedback_created_at ON feedback(created_at);

      -- Audio playback log indexes
      CREATE INDEX idx_audio_playback_logs_user_id ON audio_playback_logs(user_id);
      CREATE INDEX idx_audio_playback_logs_audio_id ON audio_playback_logs(audio_id);
      CREATE INDEX idx_audio_playback_logs_created_at ON audio_playback_logs(created_at);
      CREATE INDEX idx_audio_playback_logs_audio_start ON audio_playback_logs(audio_start);

      -- Audit logs indexes
      CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
      CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id);
      CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

      -- Composite indexes for common queries (Columns updated)
      CREATE INDEX idx_user_email_status ON "user"(email, status_id);
      CREATE INDEX idx_feedback_user_course ON feedback(user_id, course_id);
      CREATE INDEX idx_audio_course_language ON audio(course_id, language_id);
      CREATE INDEX idx_subtitle_audio_language ON subtitle(audio_id, language_id);
    `);

    await client.query(`
  CREATE INDEX idx_images_school_id ON images(school_id);
  `);

    // Add triggers for updated_at columns
    await client.query(`
      -- Function to update updated_at column (NO CHANGE)
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply triggers to all tables with updated_at columns

      -- Trigger for the SCHOOLS table (formerly exhibitions)
      CREATE TRIGGER update_schools_updated_at
          BEFORE UPDATE ON schools
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
      -- Trigger for the COURSES table (formerly exhibit)
      CREATE TRIGGER update_courses_updated_at
          BEFORE UPDATE ON courses
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      CREATE TRIGGER update_user_updated_at
          BEFORE UPDATE ON "user"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
      CREATE TRIGGER update_language_updated_at
          BEFORE UPDATE ON language
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_roles_updated_at
          BEFORE UPDATE ON roles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_permissions_updated_at
          BEFORE UPDATE ON permissions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_audio_updated_at
          BEFORE UPDATE ON audio
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_images_updated_at
          BEFORE UPDATE ON images
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_qr_code_updated_at
          BEFORE UPDATE ON qr_code
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_subtitle_updated_at
          BEFORE UPDATE ON subtitle
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_feedback_updated_at
          BEFORE UPDATE ON feedback
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_audio_playback_logs_updated_at
          BEFORE UPDATE ON audio_playback_logs
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_badge_updated_at
          BEFORE UPDATE ON badge
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_settings_updated_at
          BEFORE UPDATE ON settings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add constraints
    await client.query(`
      -- Ensure only one default language
      CREATE UNIQUE INDEX idx_language_is_default_unique 
      ON language (is_default) WHERE is_default = true;

      -- Ensure only one primary image per course
      CREATE UNIQUE INDEX idx_images_course_primary_unique 
      ON images (course_id) WHERE is_primary = true;

      -- Add check constraint for rating values
      ALTER TABLE feedback ADD CONSTRAINT chk_feedback_rating 
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

      -- Add check constraint for audio duration
      ALTER TABLE audio_playback_logs ADD CONSTRAINT chk_duration_positive 
      CHECK (duration_listened IS NULL OR duration_listened >= 0);

      -- Add check constraint for token expiration (must be in future)
      ALTER TABLE password_reset_token ADD CONSTRAINT chk_password_reset_expires_future
      CHECK (expires_at > created_at);

      ALTER TABLE email_verification_token ADD CONSTRAINT chk_email_verification_expires_future
      CHECK (expires_at > created_at);
    `);

    // Add function to clean up expired tokens
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
      RETURNS void AS $$
      BEGIN
        DELETE FROM password_reset_token WHERE expires_at < CURRENT_TIMESTAMP;
        DELETE FROM email_verification_token WHERE expires_at < CURRENT_TIMESTAMP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log("🏗 Database schema created successfully!");

    // --- SEEDING DATA ---
    console.log("🌱 Starting data seeding...");

    // Insert roles
    await client.query(`
      INSERT INTO roles (role_name, description) VALUES
      ('admin', 'System administrator with full access'),
      ('moderator', 'Content moderator with limited admin access'),
      ('visitor', 'Guest user with minimal access');
    `);

    // Insert permissions (matching the SQL schema)
    await client.query(`
      INSERT INTO permissions (permission_name, description) VALUES
      -- User management permissions
      ('create_user', 'Create new user accounts'),
      ('read_user', 'View user information'),
      ('update_user', 'Modify user information'),
      ('delete_user', 'Delete user accounts'),
      
      -- Content management permissions
      ('create_exhibit', 'Create new exhibits'),
      ('read_exhibit', 'View exhibit information'),
      ('update_exhibit', 'Modify exhibit information'),
      ('delete_exhibit', 'Remove exhibits'),
      
      ('create_audio', 'Upload and create audio content'),
      ('read_audio', 'Access and listen to audio content'),
      ('update_audio', 'Modify audio content'),
      ('delete_audio', 'Remove audio content'),
      
      ('create_image', 'Upload and create image content'),
      ('read_image', 'View image content'),
      ('update_image', 'Modify image content'),
      ('delete_image', 'Remove image content'),
      
      ('create_subtitle', 'Create subtitle content'),
      ('read_subtitle', 'View subtitle content'),
      ('update_subtitle', 'Modify subtitle content'),
      ('delete_subtitle', 'Remove subtitle content'),
      
      -- System permissions
      ('manage_roles', 'Assign and manage user roles'),
      ('manage_permissions', 'Manage system permissions'),
      ('view_audit_logs', 'Access system audit logs'),
      ('manage_feedback', 'Moderate user feedback'),
      ('manage_languages', 'Manage language settings'),
      ('reset_password', 'Reset user passwords'),
      ('verify_email', 'Verify user email addresses');
    `);

    // Insert admin user first
    // Admin password: admin123
    // Generate hash for admin123 password
    const adminHash = await bcrypt.hash('admin123', 12);
    const moderatorHash = await bcrypt.hash('moderator123', 12);
    // Generate hash for User123$% password (used for all generated users)
    const userHash = await bcrypt.hash('User123$%', 12);
    
    await client.query(`
      INSERT INTO "user" (username, email, password_hash, email_verified, status_id, last_login_at) VALUES
      ($1, $2, $3, true, 1, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
      ($4, $5, $6, true, 1, CURRENT_TIMESTAMP - INTERVAL '1 day')
    `, ['admin', 'admin@audiomuseum.com', adminHash, 'moderator', 'moderator@audiomuseum.com', moderatorHash]);

    // Generate 100+ users with varying registration dates for trend analysis
    const users = [];
    const usernames = [];
    const emails = [];
    const statuses = [1, 1, 1, 1, 2, 3]; // Mostly active, some inactive/suspended
    const firstNames = [
      "Alex",
      "Sam",
      "Jordan",
      "Taylor",
      "Casey",
      "Morgan",
      "Riley",
      "Avery",
      "Quinn",
      "Blake",
      "Cameron",
      "Devon",
      "Emery",
      "Harper",
      "Hayden",
      "Jamie",
      "Kennedy",
      "Logan",
      "Madison",
      "Parker",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Perez",
      "Thompson",
      "White",
      "Harris",
    ];

    // Create users spanning the last 12 months with realistic distribution
    for (let i = 1; i <= 120; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

      // Distribute registrations over past 12 months with higher activity in recent months
      const daysAgo = Math.floor(Math.random() * 365);
      const weight = Math.max(0.1, 1 - daysAgo / 365); // More users in recent months
      const adjustedDaysAgo =
        Math.random() < weight ? Math.floor(Math.random() * 90) : daysAgo;

      const createdAt = `CURRENT_TIMESTAMP - INTERVAL '${adjustedDaysAgo} days' - INTERVAL '${Math.floor(
        Math.random() * 24
      )} hours'`;
      const statusId = statuses[Math.floor(Math.random() * statuses.length)];
      const emailVerified = Math.random() > 0.1; // 90% email verified
      const hasLoggedIn = Math.random() > 0.2; // 80% have logged in
      const lastLoginAt = hasLoggedIn
        ? `CURRENT_TIMESTAMP - INTERVAL '${Math.floor(
            Math.random() * adjustedDaysAgo + 1
          )} days'`
        : "NULL";

      users.push(`('${username}', '${email}', '${userHash}', ${emailVerified}, ${statusId}, ${lastLoginAt}, ${createdAt})`);
      usernames.push(username);
      emails.push(email);
    }

    // Insert users in batches to avoid query size limits
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await client.query(`
        INSERT INTO "user" (username, email, password_hash, email_verified, status_id, last_login_at, created_at) VALUES
        ${batch.join(", ")};
      `);
    }

    console.log(
      `Inserted ${users.length + 2} users total (including admin, moderator and ${users.length} test users)`
    );

    // Assign roles to users - admin and moderator first
    await client.query(`
      INSERT INTO userroles (user_id, role_id) VALUES 
      (1, 1), -- admin user gets admin role
      (2, 2); -- moderator user gets moderator role
    `);

    // Assign visitor role to all other users (user_id > 2)
    await client.query(`
      INSERT INTO userroles (user_id, role_id)
      SELECT user_id, 3 FROM "user" WHERE user_id > 2;
    `);

    // Assign permissions to roles
    await client.query(`
      -- Admin gets all permissions
      INSERT INTO roles_permission (role_id, permission_id)
      SELECT 1, permission_id FROM permissions;
    `);

    await client.query(`
      -- Moderator gets content management permissions
      INSERT INTO roles_permission (role_id, permission_id)
      SELECT 2, permission_id FROM permissions 
      WHERE permission_name IN (
          'read_user', 'read_exhibit', 'update_exhibit', 'create_exhibit',
          'read_audio', 'update_audio', 'create_audio',
          'read_image', 'update_image', 'create_image',
          'read_subtitle', 'update_subtitle', 'create_subtitle',
          'manage_feedback', 'reset_password', 'verify_email'
      );
    `);

    await client.query(`
      -- Visitor gets minimal read permissions
      INSERT INTO roles_permission (role_id, permission_id)
      SELECT 3, permission_id FROM permissions 
      WHERE permission_name IN (
          'read_exhibit', 'read_audio', 'read_image'
      );
    `);

    // Insert languages
    await client.query(`
      INSERT INTO language (title, lang_code, is_default, status_id) VALUES
      ('English', 'en', true, 1),
      ('Spanish', 'es', false, 1),
      ('French', 'fr', false, 1),
      ('German', 'de', false, 1),
      ('Italian', 'it', false, 1),
      ('Portuguese', 'pt', false, 1),
      ('Chinese (Simplified)', 'zh-CN', false, 1),
      ('Japanese', 'ja', false, 1),
      ('Korean', 'ko', false, 1),
      ('Arabic', 'ar', false, 1);
    `);

    // Insert Schools of Singapore Polytechnic (SP)
await client.query(`
    INSERT INTO schools (school_id, title, description, status_id) VALUES
        (1, 'School of Architecture & the Built Environment (ABE)', 'Focuses on student-centred learning and comprehensive training in design and construction.', 1),
        (2, 'School of Business (SB)', 'Provides quality business education and highly valued diplomas for admission to accelerated degree programmes.', 1),
        (3, 'School of Chemical & Life Sciences (CLS)', 'Offers valuable industry experience through work-based learning opportunities in chemical and life science fields.', 1),
        (4, 'School of Computing (SoC)', 'Prepares IT professionals for key roles in growing job markets, specialising in AI, cybersecurity, and data analytics.', 1),
        (5, 'School of Electrical & Electronic Engineering (EEE)', 'Known for high-quality courses in electrical and electronic engineering with over 60 years of history.', 1),
        (6, 'School of Mechanical & Aeronautical Engineering (MAE)', 'Has a strong tradition of excellence in engineering education since 1958, providing extensive hands-on experience.', 1),
        (7, 'Media, Arts & Design School (MAD)', 'Fosters future creative professionals, encouraging them to envision possibilities and transform industries.', 1),
        (8, 'School of Mathematics & Science (MS)', 'Offers programmes supporting students to excel in mathematics, analytics, statistics, sciences, and IT.', 1),
        (9, 'School of Life Skills & Communication (LSC)', 'Forms the foundational core of general modules for all SP students, focusing on critical thinking and communication.', 1),
        (10, 'Singapore Maritime Academy (SMA)', 'Leads in maritime education and training, featuring advanced laboratories and workshops.', 1),
        (11, 'Professional & Adult Continuing Education (PACE) Academy', 'Offers Continuing Education and Training (CET) courses, including Short Courses, Part-Time Diplomas, and Post-Diplomas.', 1);
    `);

    // Insert badges first (25 badges)
   await client.query(`
    INSERT INTO badge (badge_id, name, description, image_url) VALUES
    (1, 'Enter The Sandbox', 'We have witnessed Singapore''s journey to nationhood... Leave your unique imprint on our present and future here in the Sandbox today.', 'http://localhost:5175/public/images/badge/Enter_The_Sandbox.png'),
    (2, 'Particles of Change', 'Immerse in an experience where play meets inspiration.', 'http://localhost:5175/public/images/badge/Particles_of_Change.png'),
    (3, 'Strength of Our Nation', 'The peace we experience in Singapore today is in no small part due to our men and women in uniform...', 'http://localhost:5175/public/images/badge/Strength_of_Our_Nation.png'),
    (4, 'Staying Resilient Amid Tough Times', 'Singaporeans have shown resilience amid challenges...', 'http://localhost:5175/public/images/badge/Staying_Resilient_Amid_Tough_Times.png'),
    (5, 'Adaptable in the Face of Challenges', 'Your attitude is your anchor. See how Singaporeans rise up to meet threats.', 'http://localhost:5175/public/images/badge/Adaptable_in_the_Face_of_Challenges.png'),
    (6, 'Case Notes: Captain Cherie Chua', 'Air warfare officer on staying resilient in a dynamic environment.', 'http://localhost:5175/public/images/badge/Case_Notes_Captain_Cherie_Chua.png'),
    (7, 'Case Notes: Dr Gabriel Ong', 'Helping ex-offenders reintegrate into society with psychological support.', 'http://localhost:5175/public/images/badge/Case_Notes_Dr_Gabriel_Ong.png'),
    (8, 'Case Notes: Lieutenant (NS) Max West', 'Mental fortitude during National Service and pushing past limits.', 'http://localhost:5175/public/images/badge/Case_Notes_Lieutenant_NS_Max_West.png'),
    (9, 'Case Notes: Mr Joel Quek Wee Teck', 'Resilience of frontline nurses during the COVID-19 pandemic.', 'http://localhost:5175/public/images/badge/Case_Notes_Mr_Joel_Quek_Wee_Teck.png'),
    (10, 'Future-Proofing With the Power of Foresight', 'Moving into the future prepared with technological upskilling.', 'http://localhost:5175/public/images/badge/Future-Proofing_With_the_Power_of_Foresight.png')
   `);

    // Insert all core Courses for Singapore Polytechnic, starting from course_id 1
await client.query(`
    INSERT INTO courses (course_id, school_id, title, description, status_id) VALUES
    
    /* ---------------------------------------------------- */
    /* SCHOOL OF ARCHITECTURE & THE BUILT ENVIRONMENT (ABE) - ID 1 */
    /* ---------------------------------------------------- */
    (1, 1, 'Diploma in Architecture (DARCH)', 
    'A three-year programme focused on architectural design, building technology, and sustainable construction practices.', 1),
    (2, 1, 'Diploma in Civil Engineering (DCE)', 
    'Focuses on the design, construction, and maintenance of the built environment, including infrastructure like roads, bridges, and buildings.', 1),
    (3, 1, 'Diploma in Integrated Facility Management (DIFM)', 
    'Trains professionals to manage and operate smart, sustainable buildings using technology and resource management strategies.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF BUSINESS (SB) - ID 2 */
    /* ---------------------------------------------------- */
    (4, 2, 'Diploma in Business Administration (DBA)', 
    'A broad-based business course covering accounting, marketing, management, and business law.', 1),
    (5, 2, 'Diploma in Accountancy (DAC)', 
    'Provides intensive training in financial accounting, auditing, taxation, and business reporting standards.', 1),
    (6, 2, 'Diploma in Financial Technology (DFT)', 
    'Combines finance knowledge with technology skills, focusing on blockchain, data analytics, and digital payment systems.', 1),
    (7, 2, 'Diploma in Tourism and Resort Management (DTRM)', 
    'Focuses on the operational and strategic management of hotels, resorts, travel agencies, and related tourism sectors.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF CHEMICAL & LIFE SCIENCES (CLS) - ID 3 */
    /* ---------------------------------------------------- */
    (8, 3, 'Diploma in Biomedical Science (DBS)', 
    'Prepares students for work in medical laboratories and research, focusing on diagnostics, microbiology, and clinical chemistry.', 1),
    (9, 3, 'Diploma in Food Science & Technology (DFST)', 
    'Covers food safety, product development, quality control, and the processes involved in modern food production.', 1),
    (10, 3, 'Diploma in Perfumery & Cosmetic Science (DPCS)', 
    'A niche course focusing on the chemistry, formulation, and development of perfumes and cosmetic products.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF COMPUTING (SoC) - ID 4 */
    /* ---------------------------------------------------- */
    (11, 4, 'Diploma in Applied AI and Data (DAID)', 
    'Focuses on developing practical skills in applying Artificial Intelligence and managing complex data sets for business intelligence.', 1),
    (12, 4, 'Diploma in Cybersecurity and Digital Forensics (DCDF)', 
    'Trains students in network defense, ethical hacking, incident response, and forensic investigation of digital crimes.', 1),
    (13, 4, 'Diploma in Infocomm Media Engineering (DIME)', 
    'Integrates IT skills with media production, covering areas like cloud computing, web development, and media streaming technologies.', 1),
    (14, 4, 'Diploma in Information Technology (DIT)', 
    'Provides a broad foundation in software development, programming, systems analysis, and cloud infrastructure management.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF ELECTRICAL & ELECTRONIC ENGINEERING (EEE) - ID 5 */
    /* ---------------------------------------------------- */
    (15, 5, 'Diploma in Electrical Engineering (DEE)', 
    'Covers electrical power systems, smart grids, industrial automation, and electrical installation and safety.', 1),
    (16, 5, 'Diploma in Aeronautical Engineering (DARE)', 
    'Focuses on the electronic systems, communication, radar, and navigation equipment found in modern aircraft.', 1),
    (17, 5, 'Diploma in Computer Engineering (DCEG)', 
    'Combines hardware and software, focusing on embedded systems, IoT, and high-performance computing.', 1),
    (18, 5, 'Diploma in Engineering with Business (DEB)', 
    'A blend of engineering fundamentals and business management principles for technical project leadership.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF MECHANICAL & AERONAUTICAL ENGINEERING (MAE) - ID 6 */
    /* ---------------------------------------------------- */
    (19, 6, 'Diploma in Aeronautical Engineering (DAE)', 
    'Covers aircraft maintenance, propulsion systems, aerodynamics, and composite materials.', 1),
    (20, 6, 'Diploma in Mechanical Engineering (DME)', 
    'Focuses on the design, analysis, and manufacturing of mechanical systems using CAD and advanced technologies.', 1),
    (21, 6, 'Diploma in Mechatronics and Robotics (DMR)', 
    'Integrates mechanical design, electronics, and control systems to build automated machines and robotics.', 1),
    (22, 6, 'Diploma in Motorsports Engineering (DME)', 
    'Applies mechanical engineering principles specifically to high-performance vehicle design and racing technology.', 1),

    /* ---------------------------------------------------- */
    /* MEDIA, ARTS & DESIGN SCHOOL (MAD) - ID 7 */
    /* ---------------------------------------------------- */
    (23, 7, 'Diploma in MediaPost Production (DMPP)', 
    'Focuses on video editing, motion graphics, color grading, and audio post-production for film and broadcast.', 1),
    (24, 7, 'Diploma in Visual Communications (DVC)', 
    'Trains students in graphic design, branding, typography, and creative content creation across various media platforms.', 1),
    (25, 7, 'Diploma in Game Design & Development (DGDD)', 
    'Covers game conceptualization, 3D modeling, programming logic, and interactive storytelling.', 1),
    (26, 7, 'Diploma in Photography (DPHG)', 
    'A comprehensive course covering professional photography techniques, studio work, and digital image processing.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF MATHEMATICS & SCIENCE (MS) - ID 8 */
    /* ---------------------------------------------------- */
    (27, 8, 'Diploma in Applied Chemistry (DACP)', 
    'Provides strong theoretical and practical training in analytical, organic, and physical chemistry for various industries.', 1),
    (28, 8, 'Diploma in Mathematics with Finance (DMF)', 
    'A specialized course combining advanced mathematics, statistics, and financial modeling for the fintech sector.', 1),

    /* ---------------------------------------------------- */
    /* SCHOOL OF LIFE SKILLS & COMMUNICATION (LSC) - ID 9 */
    /* ---------------------------------------------------- */
    (29, 9, 'General Education Modules (GEM)', 
    'Represents the core communication and life skills modules required by all SP students, focusing on essential soft skills.', 1),

    /* ---------------------------------------------------- */
    /* SINGAPORE MARITIME ACADEMY (SMA) - ID 10 */
    /* ---------------------------------------------------- */
    (30, 10, 'Diploma in Marine Engineering (DMEG)', 
    'Focuses on the operation, maintenance, and repair of ship machinery and systems.', 1),
    (31, 10, 'Diploma in Nautical Studies (DNS)', 
    'Trains future ship officers in navigation, ship handling, safety management, and marine law.', 1),
    
    /* ---------------------------------------------------- */
    /* PACE ACADEMY (CET) - ID 11 */
    /* ---------------------------------------------------- */
    (32, 11, 'Part-Time & Continuing Education Courses (PCE)', 
    'A generic entry representing the diverse range of skills upgrading and lifelong learning courses offered to adults.', 1);
`);

    // Insert QR codes for ALL courses (ID 1 through 32)
await client.query(`
    INSERT INTO qr_code (qr_id, course_id, qr_url) VALUES
    (1, 1, 'http://localhost:5173/course/1'),
    (2, 2, 'http://localhost:5173/course/2'),
    (3, 3, 'http://localhost:5173/course/3'),
    (4, 4, 'http://localhost:5173/course/4'),
    (5, 5, 'http://localhost:5173/course/5'),
    (6, 6, 'http://localhost:5173/course/6'),
    (7, 7, 'http://localhost:5173/course/7'),
    (8, 8, 'http://localhost:5173/course/8'),
    (9, 9, 'http://localhost:5173/course/9'),
    (10, 10, 'http://localhost:5173/course/10'),
    (11, 11, 'http://localhost:5173/course/11'),
    (12, 12, 'http://localhost:5173/course/12'),
    (13, 13, 'http://localhost:5173/course/13'),
    (14, 14, 'http://localhost:5173/course/14'),
    (15, 15, 'http://localhost:5173/course/15'),
    (16, 16, 'http://localhost:5173/course/16'),
    (17, 17, 'http://localhost:5173/course/17'),
    (18, 18, 'http://localhost:5173/course/18'),
    (19, 19, 'http://localhost:5173/course/19'),
    (20, 20, 'http://localhost:5173/course/20'),
    (21, 21, 'http://localhost:5173/course/21'),
    (22, 22, 'http://localhost:5173/course/22'),
    (23, 23, 'http://localhost:5173/course/23'),
    (24, 24, 'http://localhost:5173/course/24'),
    (25, 25, 'http://localhost:5173/course/25'),
    (26, 26, 'http://localhost:5173/course/26'),
    (27, 27, 'http://localhost:5173/course/27'),
    (28, 28, 'http://localhost:5173/course/28'),
    (29, 29, 'http://localhost:5173/course/29'),
    (30, 30, 'http://localhost:5173/course/30'),
    (31, 31, 'http://localhost:5173/course/31'),
    (32, 32, 'http://localhost:5173/course/32');
`);

   // Insert School Cover Images (linked to school_id 1 through 11)
await client.query(`
    INSERT INTO images (image_id, course_id, school_id, title, description, file_url, is_primary) VALUES
    
    (1, NULL, 1, 'Cover for ABE School', 'Primary image for the ABE School page.', '/images/school_1_abe_cover.jpg', true),
    (2, NULL, 2, 'Cover for Business School', 'Primary image for the Business School page.', '/images/school_2_business_cover.jpg', true),
    (3, NULL, 3, 'Cover for CLS School', 'Primary image for the CLS School page.', '/images/school_3_cls_cover.jpg', true),
    (4, NULL, 4, 'Cover for Computing School', 'Primary image for the Computing School page.', '/images/school_4_soc_cover.jpg', true),
    (5, NULL, 5, 'Cover for EEE School', 'Primary image for the EEE School page.', '/images/school_5_eee_cover.jpg', true),
    (6, NULL, 6, 'Cover for MAE School', 'Primary image for the MAE School page.', '/images/school_6_mae_cover.jpg', true),
    (7, NULL, 7, 'Cover for MAD School', 'Primary image for the MAD School page.', '/images/school_7_mad_cover.jpg', true),
    (8, NULL, 8, 'Cover for Maths & Science School', 'Primary image for the Maths & Science School page.', '/images/school_8_ms_cover.jpg', true),
    (9, NULL, 9, 'Cover for LSC School', 'Primary image for the LSC School page.', '/images/school_9_lsc_cover.jpg', true),
    (10, NULL, 10, 'Cover for Maritime Academy', 'Primary image for the Singapore Maritime Academy page.', '/images/school_10_sma_cover.jpg', true),
    (11, NULL, 11, 'Cover for PACE Academy', 'Primary image for the PACE Academy page.', '/images/school_11_pace_cover.jpg', true);
`);

// Insert Course Primary Images (linked to course_id 1 through 32)
await client.query(`
    INSERT INTO images (image_id, course_id, school_id, title, description, file_url, is_primary) VALUES
    
    (12, 1, NULL, 'Cover for DARCH', 'Primary image for Diploma in Architecture.', '/images/course_1_darch_primary.jpg', true),
    (13, 2, NULL, 'Cover for DCE', 'Primary image for Diploma in Civil Engineering.', '/images/course_2_dce_primary.jpg', true),
    (14, 3, NULL, 'Cover for DIFM', 'Primary image for Diploma in Integrated Facility Management.', '/images/course_3_difm_primary.jpg', true),
    (15, 4, NULL, 'Cover for DBA', 'Primary image for Diploma in Business Administration.', '/images/course_4_dba_primary.jpg', true),
    (16, 5, NULL, 'Cover for DAC', 'Primary image for Diploma in Accountancy.', '/images/course_5_dac_primary.jpg', true),
    (17, 6, NULL, 'Cover for DFT', 'Primary image for Diploma in Financial Technology.', '/images/course_6_dft_primary.jpg', true),
    (18, 7, NULL, 'Cover for DTRM', 'Primary image for Diploma in Tourism and Resort Management.', '/images/course_7_dtrm_primary.jpg', true),
    (19, 8, NULL, 'Cover for DBS', 'Primary image for Diploma in Biomedical Science.', '/images/course_8_dbs_primary.jpg', true),
    (20, 9, NULL, 'Cover for DFST', 'Primary image for Diploma in Food Science & Technology.', '/images/course_9_dfst_primary.jpg', true),
    (21, 10, NULL, 'Cover for DPCS', 'Primary image for Diploma in Perfumery & Cosmetic Science.', '/images/course_10_dpcs_primary.jpg', true),
    (22, 11, NULL, 'Cover for DAID', 'Primary image for Diploma in Applied AI and Data.', '/images/course_11_daid_primary.jpg', true),
    (23, 12, NULL, 'Cover for DCDF', 'Primary image for Diploma in Cybersecurity and Digital Forensics.', '/images/course_12_dcdf_primary.jpg', true),
    (24, 13, NULL, 'Cover for DIME', 'Primary image for Diploma in Infocomm Media Engineering.', '/images/course_13_dime_primary.jpg', true),
    (25, 14, NULL, 'Cover for DIT', 'Primary image for Diploma in Information Technology.', '/images/course_14_dit_primary.jpg', true),
    (26, 15, NULL, 'Cover for DEE', 'Primary image for Diploma in Electrical Engineering.', '/images/course_15_dee_primary.jpg', true),
    (27, 16, NULL, 'Cover for DARE', 'Primary image for Diploma in Aeronautical Engineering (Electronics).', '/images/course_16_dare_primary.jpg', true),
    (28, 17, NULL, 'Cover for DCEG', 'Primary image for Diploma in Computer Engineering.', '/images/course_17_dceg_primary.jpg', true),
    (29, 18, NULL, 'Cover for DEB', 'Primary image for Diploma in Engineering with Business.', '/images/course_18_deb_primary.jpg', true),
    (30, 19, NULL, 'Cover for DAE', 'Primary image for Diploma in Aeronautical Engineering (Mechanical).', '/images/course_19_dae_primary.jpg', true),
    (31, 20, NULL, 'Cover for DME', 'Primary image for Diploma in Mechanical Engineering.', '/images/course_20_dme_primary.jpg', true),
    (32, 21, NULL, 'Cover for DMR', 'Primary image for Diploma in Mechatronics and Robotics.', '/images/course_21_dmr_primary.jpg', true),
    (33, 22, NULL, 'Cover for DME', 'Primary image for Diploma in Motorsports Engineering.', '/images/course_22_dme_primary.jpg', true),
    (34, 23, NULL, 'Cover for DMPP', 'Primary image for Diploma in MediaPost Production.', '/images/course_23_dmpp_primary.jpg', true),
    (35, 24, NULL, 'Cover for DVC', 'Primary image for Diploma in Visual Communications.', '/images/course_24_dvc_primary.jpg', true),
    (36, 25, NULL, 'Cover for DGDD', 'Primary image for Diploma in Game Design & Development.', '/images/course_25_dgdd_primary.jpg', true),
    (37, 26, NULL, 'Cover for DPHG', 'Primary image for Diploma in Photography.', '/images/course_26_dphg_primary.jpg', true),
    (38, 27, NULL, 'Cover for DACP', 'Primary image for Diploma in Applied Chemistry.', '/images/course_27_dacp_primary.jpg', true),
    (39, 28, NULL, 'Cover for DMF', 'Primary image for Diploma in Mathematics with Finance.', '/images/course_28_dmf_primary.jpg', true),
    (40, 29, NULL, 'Cover for GEM', 'Primary image for General Education Modules.', '/images/course_29_gem_primary.jpg', true),
    (41, 30, NULL, 'Cover for DMEG', 'Primary image for Diploma in Marine Engineering.', '/images/course_30_dmeg_primary.jpg', true),
    (42, 31, NULL, 'Cover for DNS', 'Primary image for Diploma in Nautical Studies.', '/images/course_31_dns_primary.jpg', true),
    (43, 32, NULL, 'Cover for PCE', 'Primary image for Part-Time & Continuing Education Courses.', '/images/course_32_pce_primary.jpg', true);
`);

    // // Insert audio records (matching seed data)
    // await client.query(`
    //   INSERT INTO audio (audio_id, exhibit_id, language_id, file_url, title, description) VALUES
    //   (804, 29, 1, '/audios/exhibit-29-en-1763374477414.mp3', 'Maritime Roots Interactive Gallery (English)', ''),
    //   (805, 30, 1, '/audios/exhibit-30-en-1763374570355.mp3', 'Ancient Singapore Map Table (English)', ''),
    //   (806, 31, 1, '/audios/exhibit-31-en-1763374624474.mp3', 'Wartime Bunker Immersion Room (English)', ''),
    //   (807, 32, 1, '/audios/exhibit-32-en-1763374670485.mp3', 'Faces of the Occupation Story Wall (English)', '');
    // `);

    // Insert subtitle records (matching seed data with JSONB)
    // const subtitle1 = JSON.stringify([{"end": 0.79999995, "word": "Welcome", "start": 0.39999998}, {"end": 0.96, "word": "to", "start": 0.79999995}, {"end": 1.1999999, "word": "the", "start": 0.96}, {"end": 1.6999999, "word": "beginnings.", "start": 1.1999999}, {"end": 2.6399999, "word": "Long", "start": 2.32}, {"end": 3.12, "word": "before", "start": 2.6399999}, {"end": 3.62, "word": "Singapore", "start": 3.12}, {"end": 4.08, "word": "became", "start": 3.84}, {"end": 4.24, "word": "a", "start": 4.08}, {"end": 4.72, "word": "modern", "start": 4.24}, {"end": 5.22, "word": "nation,", "start": 4.72}, {"end": 5.68, "word": "it", "start": 5.44}, {"end": 5.92, "word": "was", "start": 5.68}, {"end": 6.3999996, "word": "already", "start": 5.92}, {"end": 6.64, "word": "a", "start": 6.3999996}, {"end": 7.14, "word": "vibrant", "start": 6.64}, {"end": 7.7, "word": "crossroads", "start": 7.2}, {"end": 8.08, "word": "for", "start": 7.8399997}, {"end": 8.559999, "word": "traders", "start": 8.08}, {"end": 8.8, "word": "from", "start": 8.559999}, {"end": 9.28, "word": "across", "start": 8.8}, {"end": 9.78, "word": "Asia.", "start": 9.28}, {"end": 10.48, "word": "As", "start": 10.32}, {"end": 10.8, "word": "you", "start": 10.48}, {"end": 11.2, "word": "explore", "start": 10.8}, {"end": 11.44, "word": "this", "start": 11.2}, {"end": 11.94, "word": "gallery,", "start": 11.44}, {"end": 12.719999, "word": "notice", "start": 12.4}, {"end": 12.96, "word": "the", "start": 12.719999}, {"end": 13.46, "word": "ships,", "start": 12.96}, {"end": 14.179999, "word": "markets,", "start": 13.679999}, {"end": 14.9, "word": "and", "start": 14.4}, {"end": 15.554999, "word": "artifacts", "start": 15.235}, {"end": 15.875, "word": "that", "start": 15.554999}, {"end": 16.275, "word": "reveal", "start": 15.875}, {"end": 16.515, "word": "how", "start": 16.275}, {"end": 16.994999, "word": "people", "start": 16.515}, {"end": 17.235, "word": "from", "start": 16.994999}, {"end": 17.635, "word": "different", "start": 17.235}, {"end": 18.135, "word": "cultures", "start": 17.635}, {"end": 18.695, "word": "met,", "start": 18.195}, {"end": 19.414999, "word": "traded,", "start": 18.914999}, {"end": 19.875, "word": "and", "start": 19.635}, {"end": 20.275, "word": "shared", "start": 19.875}, {"end": 20.775, "word": "ideas.", "start": 20.275}, {"end": 21.795, "word": "These", "start": 21.555}, {"end": 22.195, "word": "early", "start": 21.795}, {"end": 22.695, "word": "exchanges", "start": 22.195}, {"end": 23.235, "word": "laid", "start": 22.994999}, {"end": 23.395, "word": "the", "start": 23.235}, {"end": 23.895, "word": "foundations", "start": 23.395}, {"end": 24.435, "word": "for", "start": 24.275}, {"end": 24.935, "word": "Singapore's", "start": 24.435}, {"end": 25.474998, "word": "growth", "start": 25.154999}, {"end": 25.634998, "word": "as", "start": 25.474998}, {"end": 25.875, "word": "a", "start": 25.634998}, {"end": 26.375, "word": "strategic", "start": 25.875}, {"end": 26.935, "word": "maritime", "start": 26.435}, {"end": 27.654999, "word": "port.", "start": 27.154999}, {"end": 28.480936, "word": "Tap", "start": 28.240936}, {"end": 28.800936, "word": "on", "start": 28.480936}, {"end": 29.120937, "word": "any", "start": 28.800936}, {"end": 29.620937, "word": "highlighted", "start": 29.120937}, {"end": 30.160936, "word": "object", "start": 29.680937}, {"end": 30.320936, "word": "to", "start": 30.160936}, {"end": 30.560936, "word": "hear", "start": 30.320936}, {"end": 30.960938, "word": "more", "start": 30.560936}, {"end": 31.280937, "word": "about", "start": 30.960938}, {"end": 31.520937, "word": "its", "start": 31.280937}, {"end": 31.920937, "word": "role", "start": 31.520937}, {"end": 32.080936, "word": "in", "start": 31.920937}, {"end": 32.560936, "word": "shaping", "start": 32.080936}, {"end": 32.720936, "word": "our", "start": 32.560936}, {"end": 33.220936, "word": "island's", "start": 32.720936}, {"end": 33.680935, "word": "early", "start": 33.280937}, {"end": 34.180935, "word": "history.", "start": 33.680935}]);
    
    // const subtitle2 = JSON.stringify([{"end": 0.32, "word": "You", "start": 0.16}, {"end": 0.48, "word": "are", "start": 0.32}, {"end": 0.88, "word": "now", "start": 0.48}, {"end": 1.28, "word": "viewing", "start": 0.88}, {"end": 1.4399999, "word": "the", "start": 1.28}, {"end": 1.8399999, "word": "ancient", "start": 1.4399999}, {"end": 2.34, "word": "Singapore", "start": 1.8399999}, {"end": 3.06, "word": "map.", "start": 2.56}, {"end": 3.76, "word": "Over", "start": 3.36}, {"end": 4.08, "word": "seven", "start": 3.76}, {"end": 4.48, "word": "hundred", "start": 4.08}, {"end": 4.7999997, "word": "years", "start": 4.48}, {"end": 5.2999997, "word": "ago,", "start": 4.7999997}, {"end": 6.02, "word": "Singapore's", "start": 5.52}, {"end": 6.74, "word": "location", "start": 6.24}, {"end": 7.2, "word": "placed", "start": 6.8799996}, {"end": 7.44, "word": "it", "start": 7.2}, {"end": 7.6, "word": "at", "start": 7.44}, {"end": 7.7599998, "word": "the", "start": 7.6}, {"end": 8.08, "word": "heart", "start": 7.7599998}, {"end": 8.24, "word": "of", "start": 8.08}, {"end": 8.72, "word": "major", "start": 8.24}, {"end": 9.22, "word": "regional", "start": 8.72}, {"end": 9.679999, "word": "trade", "start": 9.28}, {"end": 10.179999, "word": "routes.", "start": 9.679999}, {"end": 11.219999, "word": "Merchants", "start": 10.719999}, {"end": 11.5199995, "word": "from", "start": 11.28}, {"end": 11.679999, "word": "the", "start": 11.5199995}, {"end": 12.16, "word": "Malay", "start": 11.679999}, {"end": 12.66, "word": "Archipelago,", "start": 12.16}, {"end": 14.255, "word": "China,", "start": 13.755}, {"end": 14.975, "word": "India,", "start": 14.475}, {"end": 15.355, "word": "and", "start": 15.115}, {"end": 15.855, "word": "beyond", "start": 15.355}, {"end": 16.155, "word": "pass", "start": 15.915}, {"end": 16.475, "word": "through", "start": 16.155}, {"end": 16.795, "word": "these", "start": 16.475}, {"end": 17.295, "word": "waters,", "start": 16.795}, {"end": 18.095, "word": "carrying", "start": 17.595}, {"end": 18.654999, "word": "goods,", "start": 18.154999}, {"end": 19.455, "word": "culture,", "start": 18.955}, {"end": 19.994999, "word": "and", "start": 19.675}, {"end": 20.494999, "word": "knowledge.", "start": 19.994999}, {"end": 21.275, "word": "As", "start": 21.035}, {"end": 21.515, "word": "you", "start": 21.275}, {"end": 21.994999, "word": "explore", "start": 21.515}, {"end": 22.075, "word": "the", "start": 21.994999}, {"end": 22.575, "word": "map,", "start": 22.075}, {"end": 23.115, "word": "watch", "start": 22.795}, {"end": 23.355, "word": "how", "start": 23.115}, {"end": 23.515, "word": "the", "start": 23.355}, {"end": 23.994999, "word": "island", "start": 23.515}, {"end": 24.494999, "word": "transforms", "start": 23.994999}, {"end": 25.195, "word": "across", "start": 24.715}, {"end": 25.595, "word": "different", "start": 25.195}, {"end": 26.095, "word": "eras,", "start": 25.595}, {"end": 26.895, "word": "revealing", "start": 26.395}, {"end": 27.535, "word": "Singapore's", "start": 27.035}, {"end": 27.994999, "word": "early", "start": 27.675}, {"end": 28.41, "word": "role", "start": 27.994999}, {"end": 28.57, "word": "as", "start": 28.41}, {"end": 28.81, "word": "a", "start": 28.57}, {"end": 29.21, "word": "vital", "start": 28.81}, {"end": 29.71, "word": "maritime", "start": 29.21}, {"end": 30.43, "word": "crossroads.", "start": 29.93}, {"end": 31.77, "word": "Select", "start": 31.289999}, {"end": 32.09, "word": "any", "start": 31.77}, {"end": 32.59, "word": "highlighted", "start": 32.09}, {"end": 33.23, "word": "region", "start": 32.73}, {"end": 33.45, "word": "to", "start": 33.29}, {"end": 33.93, "word": "discover", "start": 33.45}, {"end": 34.25, "word": "more", "start": 33.93}, {"end": 34.57, "word": "about", "start": 34.25}, {"end": 34.73, "word": "the", "start": 34.57}, {"end": 35.21, "word": "traders", "start": 34.73}, {"end": 35.45, "word": "and", "start": 35.21}, {"end": 35.95, "word": "kingdoms", "start": 35.45}, {"end": 36.25, "word": "that", "start": 36.01}, {"end": 36.57, "word": "once", "start": 36.25}, {"end": 36.89, "word": "shaped", "start": 36.57}, {"end": 37.13, "word": "our", "start": 36.89}, {"end": 37.63, "word": "shores.", "start": 37.13}]);
    
    // const subtitle3 = JSON.stringify([{"end": 0.39999998, "word": "You", "start": 0.16}, {"end": 0.48, "word": "are", "start": 0.39999998}, {"end": 0.88, "word": "now", "start": 0.48}, {"end": 1.28, "word": "entering", "start": 0.88}, {"end": 1.52, "word": "the", "start": 1.28}, {"end": 2.02, "word": "wartime", "start": 1.52}, {"end": 2.58, "word": "bunker.", "start": 2.08}, {"end": 3.4399998, "word": "In", "start": 3.04}, {"end": 3.9399998, "word": "nineteen", "start": 3.4399998}, {"end": 4.3199997, "word": "forty", "start": 4}, {"end": 4.8199997, "word": "two,", "start": 4.3199997}, {"end": 5.54, "word": "Singapore", "start": 5.04}, {"end": 6.08, "word": "faced", "start": 5.7599998}, {"end": 6.24, "word": "one", "start": 6.08}, {"end": 6.3999996, "word": "of", "start": 6.24}, {"end": 6.72, "word": "its", "start": 6.3999996}, {"end": 7.2, "word": "darkest", "start": 6.72}, {"end": 7.7, "word": "chapters", "start": 7.2}, {"end": 7.9199996, "word": "as", "start": 7.8399997}, {"end": 8.16, "word": "the", "start": 7.9199996}, {"end": 8.66, "word": "Japanese", "start": 8.16}, {"end": 9.22, "word": "invasion", "start": 8.72}, {"end": 10.099999, "word": "intensified.", "start": 9.599999}, {"end": 11.5199995, "word": "Within", "start": 11.04}, {"end": 12.0199995, "word": "bunkers", "start": 11.5199995}, {"end": 12.24, "word": "like", "start": 12.08}, {"end": 12.74, "word": "this,", "start": 12.24}, {"end": 13.395, "word": "soldiers", "start": 12.96}, {"end": 14.135, "word": "coordinated", "start": 13.635}, {"end": 14.8550005, "word": "defenses,", "start": 14.3550005}, {"end": 15.975, "word": "civilians", "start": 15.475}, {"end": 16.515, "word": "sought", "start": 16.275}, {"end": 17.015, "word": "shelter,", "start": 16.515}, {"end": 17.555, "word": "and", "start": 17.235}, {"end": 18.055, "word": "uncertainty", "start": 17.555}, {"end": 18.675, "word": "filled", "start": 18.355}, {"end": 18.755001, "word": "the", "start": 18.675}, {"end": 19.255001, "word": "air.", "start": 18.755001}, {"end": 19.875, "word": "As", "start": 19.635}, {"end": 20.035, "word": "you", "start": 19.875}, {"end": 20.275, "word": "look", "start": 20.035}, {"end": 20.775, "word": "around,", "start": 20.275}, {"end": 21.475, "word": "take", "start": 21.155}, {"end": 21.715, "word": "note", "start": 21.475}, {"end": 21.875, "word": "of", "start": 21.715}, {"end": 22.035, "word": "the", "start": 21.875}, {"end": 22.535, "word": "messages,", "start": 22.035}, {"end": 23.575, "word": "maps,", "start": 23.075}, {"end": 24.035, "word": "and", "start": 23.715}, {"end": 24.515, "word": "equipment", "start": 24.035}, {"end": 24.755001, "word": "that", "start": 24.515}, {"end": 25.235, "word": "reveal", "start": 24.755001}, {"end": 25.395, "word": "the", "start": 25.235}, {"end": 25.895, "word": "difficult", "start": 25.395}, {"end": 26.455, "word": "decisions", "start": 25.955}, {"end": 26.994999, "word": "made", "start": 26.595001}, {"end": 27.315, "word": "during", "start": 26.994999}, {"end": 27.555, "word": "this", "start": 27.315}, {"end": 28.055, "word": "time.", "start": 27.555}, {"end": 28.924936, "word": "Tap", "start": 28.684937}, {"end": 29.324936, "word": "any", "start": 28.924936}, {"end": 29.824936, "word": "highlighted", "start": 29.324936}, {"end": 30.364937, "word": "panel", "start": 29.884937}, {"end": 30.524937, "word": "to", "start": 30.364937}, {"end": 31.024937, "word": "discover", "start": 30.524937}, {"end": 31.404938, "word": "key", "start": 31.084936}, {"end": 31.884937, "word": "events", "start": 31.404938}, {"end": 32.044937, "word": "that", "start": 31.884937}, {"end": 32.364937, "word": "shaped", "start": 32.044937}, {"end": 32.44494, "word": "the", "start": 32.364937}, {"end": 32.844936, "word": "battle", "start": 32.44494}, {"end": 33.084938, "word": "for", "start": 32.844936}, {"end": 33.584938, "word": "Singapore.", "start": 33.084938}]);
    
    // const subtitle4 = JSON.stringify([{"end": 0.48, "word": "This", "start": 0.24}, {"end": 0.71999997, "word": "is", "start": 0.48}, {"end": 0.88, "word": "the", "start": 0.71999997}, {"end": 1.28, "word": "faces", "start": 0.88}, {"end": 1.52, "word": "of", "start": 1.28}, {"end": 1.76, "word": "the", "start": 1.52}, {"end": 2.26, "word": "occupation", "start": 1.76}, {"end": 3.06, "word": "story", "start": 2.56}, {"end": 3.62, "word": "wall.", "start": 3.12}, {"end": 4.24, "word": "During", "start": 3.9199998}, {"end": 4.48, "word": "the", "start": 4.24}, {"end": 4.98, "word": "Japanese", "start": 4.48}, {"end": 5.7, "word": "occupation,", "start": 5.2}, {"end": 6.8799996, "word": "ordinary", "start": 6.3999996}, {"end": 7.3599997, "word": "people", "start": 6.8799996}, {"end": 7.8599997, "word": "endured", "start": 7.3599997}, {"end": 8.42, "word": "hardship,", "start": 7.9199996}, {"end": 9.38, "word": "loss,", "start": 8.88}, {"end": 9.92, "word": "and", "start": 9.44}, {"end": 10.42, "word": "uncertainty.", "start": 9.92}, {"end": 11.679999, "word": "Each", "start": 11.36}, {"end": 12.179999, "word": "portrait", "start": 11.679999}, {"end": 12.48, "word": "you", "start": 12.32}, {"end": 12.799999, "word": "see", "start": 12.48}, {"end": 13.299999, "word": "represents", "start": 12.799999}, {"end": 13.575, "word": "a", "start": 13.415}, {"end": 13.815, "word": "real", "start": 13.575}, {"end": 14.315, "word": "individual", "start": 13.815}, {"end": 14.855, "word": "whose", "start": 14.535}, {"end": 15.175, "word": "life", "start": 14.855}, {"end": 15.415, "word": "was", "start": 15.175}, {"end": 15.915, "word": "transformed", "start": 15.415}, {"end": 16.375, "word": "by", "start": 16.055}, {"end": 16.875, "word": "war.", "start": 16.375}, {"end": 17.895, "word": "Select", "start": 17.415}, {"end": 18.135, "word": "any", "start": 17.895}, {"end": 18.455, "word": "face", "start": 18.135}, {"end": 18.695, "word": "to", "start": 18.455}, {"end": 18.935, "word": "hear", "start": 18.695}, {"end": 19.255001, "word": "their", "start": 18.935}, {"end": 19.755001, "word": "story,", "start": 19.255001}, {"end": 20.135, "word": "how", "start": 19.895}, {"end": 20.455, "word": "they", "start": 20.135}, {"end": 20.955, "word": "lived,", "start": 20.455}, {"end": 21.595, "word": "adapted,", "start": 21.095}, {"end": 22.295, "word": "and", "start": 21.895}, {"end": 22.694937, "word": "persevere", "start": 22.295}, {"end": 23.334936, "word": "during", "start": 23.014936}, {"end": 23.494936, "word": "one", "start": 23.334936}, {"end": 23.814938, "word": "of", "start": 23.494936}, {"end": 24.314938, "word": "Singapore's", "start": 23.814938}, {"end": 24.694937, "word": "most", "start": 24.374937}, {"end": 25.194937, "word": "challenging", "start": 24.694937}, {"end": 25.834936, "word": "periods.", "start": 25.334936}, {"end": 26.934937, "word": "These", "start": 26.614937}, {"end": 27.414936, "word": "personal", "start": 26.934937}, {"end": 27.914936, "word": "accounts", "start": 27.414936}, {"end": 28.294937, "word": "remind", "start": 27.974937}, {"end": 28.534937, "word": "us", "start": 28.294937}, {"end": 28.854937, "word": "that", "start": 28.534937}, {"end": 29.254936, "word": "history", "start": 28.854937}, {"end": 29.414936, "word": "is", "start": 29.254936}, {"end": 29.654938, "word": "not", "start": 29.414936}, {"end": 29.974937, "word": "just", "start": 29.654938}, {"end": 30.294937, "word": "dates", "start": 29.974937}, {"end": 30.534937, "word": "and", "start": 30.294937}, {"end": 31.034937, "word": "events,", "start": 30.534937}, {"end": 31.654938, "word": "but", "start": 31.414936}, {"end": 32.054935, "word": "the", "start": 31.654938}, {"end": 32.554935, "word": "experiences", "start": 32.054935}, {"end": 32.934937, "word": "of", "start": 32.774937}, {"end": 33.254936, "word": "people", "start": 32.934937}, {"end": 33.494938, "word": "who", "start": 33.254936}, {"end": 33.814938, "word": "lived", "start": 33.494938}, {"end": 34.054935, "word": "through", "start": 33.814938}, {"end": 34.554935, "word": "them.", "start": 34.054935}]);
    
    // await client.query(`
    //   INSERT INTO subtitle (subtitle_id, audio_id, language_id, text, created_by) VALUES
    //   (4, 804, 1, $1::jsonb, NULL),
    //   (5, 805, 1, $2::jsonb, NULL),
    //   (6, 806, 1, $3::jsonb, NULL),
    //   (7, 807, 1, $4::jsonb, NULL);
    // `, [subtitle1, subtitle2, subtitle3, subtitle4]);


    // Insert sessions (matching seed data with specific UUIDs)
    await client.query(`
      INSERT INTO sessions (session_id, user_id) VALUES
      ('62261df8-29cf-4732-9547-2bb2ad05afab', 1),
      ('c12366bc-d38d-4455-ad9c-822e08e88eb0', 2),
      ('1fd03c96-c976-47a9-9026-66229bd5e7f5', 3),
      ('7ecefa11-b1d8-47d2-b9f5-31dcaf974647', 4);
    `);

    // Insert sample password reset tokens (valid for testing)
    await client.query(`
      INSERT INTO password_reset_token (user_id, token, expires_at) VALUES
      (3, 'token_123', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
      (4, 'valid_token_456', CURRENT_TIMESTAMP + INTERVAL '24 hours');
    `);

    // Insert sample email verification tokens
    await client.query(`
      INSERT INTO email_verification_token (user_id, token, expires_at) VALUES
      (3, 'verify_email_789', CURRENT_TIMESTAMP + INTERVAL '24 hours'),
      (4, 'verify_email_101', CURRENT_TIMESTAMP + INTERVAL '48 hours');
    `);

    // Insert settings
    await client.query(`
      INSERT INTO settings (key, value) VALUES
      ('inactivityThresholdDays', '"7"');
    `);

    // Insert audit logs (first 10 from seed data, then add more if needed)
    await client.query(`
      INSERT INTO audit_logs (audit_log_id, admin_user_id, target_user_id, resource, action, changes, metadata, timestamp) VALUES
      (1, 1, 3, 'user', 'create', '{"username": "john_doe", "email": "john@example.com"}', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', '2025-11-17 04:13:14.186392+00'),
      (2, 1, 4, 'user', 'create', '{"username": "jane_smith", "email": "jane@example.com"}', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', '2025-11-17 04:13:14.186392+00'),
      (3, 1, NULL, 'exhibit', 'create', '{"title": "The Digital Frontier", "description": "Technology through the ages"}', '{"ip_address": "192.168.1.100"}', '2025-11-17 04:13:14.186392+00'),
      (4, 2, NULL, 'exhibit', 'update', '{"title": "The Digital Frontier", "description": "Updated description"}', '{"ip_address": "192.168.1.101"}', '2025-11-17 04:13:14.186392+00'),
      (5, 1, 2, 'user', 'update', '{"role": "moderator", "status": "active"}', '{"ip_address": "192.168.1.100"}', '2025-11-17 04:13:14.186392+00'),
      (6, 1, NULL, 'permission', 'create', '{"name": "manage_users", "description": "Can manage user accounts"}', '{"ip_address": "192.168.1.100"}', '2025-11-17 04:13:14.186392+00'),
      (7, 1, NULL, 'role', 'create', '{"name": "curator", "description": "Museum curator role"}', '{"ip_address": "192.168.1.100"}', '2025-11-17 04:13:14.186392+00'),
      (8, 2, 3, 'user', 'delete', '{"username": "john_doe", "reason": "account_cleanup"}', '{"ip_address": "192.168.1.101"}', '2025-11-17 04:13:14.186392+00'),
      (9, 1, NULL, 'exhibit', 'delete', '{"title": "Old Exhibit", "reason": "content_outdated"}', '{"ip_address": "192.168.1.100"}', '2025-11-17 04:13:14.186392+00'),
      (10, NULL, NULL, 'system', 'backup', '{"type": "full_backup", "size": "2.5GB"}', '{"scheduled": true, "duration": "45min"}', '2025-11-17 04:13:14.186392+00'),
      (11, NULL, 1, 'user', 'login', '{"message":"User logged in, status set to Active"}', NULL, '2025-11-17 07:45:14.333+00'),
      (12, NULL, 1, 'user', 'login', '{"message":"User logged in, status set to Active"}', NULL, '2025-11-17 07:46:10.958+00');
    `);

    // Update sequences to match inserted IDs
    await client.query(`
    -- Reset sequence for schools (formerly exhibitions)
    SELECT setval('schools_school_id_seq', (SELECT MAX(school_id) FROM schools));
    
    -- Reset sequence for courses (formerly exhibit)
    SELECT setval('courses_course_id_seq', (SELECT MAX(course_id) FROM courses));
    
    -- Other tables remain the same, but include any new tables if applicable
    SELECT setval('badge_badge_id_seq', (SELECT MAX(badge_id) FROM badge));
    SELECT setval('audio_audio_id_seq', (SELECT MAX(audio_id) FROM audio));
    SELECT setval('subtitle_subtitle_id_seq', (SELECT MAX(subtitle_id) FROM subtitle));
    SELECT setval('images_image_id_seq', (SELECT MAX(image_id) FROM images));
    SELECT setval('qr_code_qr_id_seq', (SELECT MAX(qr_id) FROM qr_code));
`);

    // Clean up expired tokens as demonstration
    await client.query("SELECT cleanup_expired_tokens();");

    console.log("✅ Seeding complete!");
    
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(console.error);