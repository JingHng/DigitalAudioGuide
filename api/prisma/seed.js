const { Client } = require("pg");
require("dotenv").config();

require('dotenv').config();
const PORT = process.env.PORT || 5175;

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
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // 1.1 EXHIBITIONS table
    await client.query(`
  CREATE TABLE exhibitions (
    exhibition_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`);

  // 2. badge table
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

    
    // 2. EXHIBIT table
    await client.query(`
      CREATE TABLE exhibit (
        exhibit_id BIGSERIAL PRIMARY KEY,
        exhibition_id BIGINT REFERENCES exhibitions(exhibition_id) ON DELETE CASCADE,
        badge_id BIGINT UNIQUE REFERENCES badge(badge_id) ON DELETE SET NULL, -- NEW FIELD
        title VARCHAR(255) NOT NULL,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. QR_CODE table to link exhibits and QR URLs
    await client.query(`
      CREATE TABLE qr_code (
        qr_id SERIAL PRIMARY KEY,
        exhibit_id BIGINT NOT NULL REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
        qr_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. LANGUAGE table
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

    // 5. USER table
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

      // 2. badge table
    await client.query(`
    CREATE TABLE user_badge (
    user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
    badge_id BIGINT REFERENCES badge(badge_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id) 
    );
    `);

    // 6. ROLES table
    await client.query(`
      CREATE TABLE roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. PERMISSIONS table
    await client.query(`
      CREATE TABLE permissions (
        permission_id SERIAL PRIMARY KEY,
        permission_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. USERROLES junction table
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

    // 9. ROLES_PERMISSION junction table
    await client.query(`
      CREATE TABLE roles_permission (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
      );
    `);

    // 10. SESSIONS table
    await client.query(`
      CREATE TABLE sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
      );
    `);

    // 11. PASSWORD_RESET_TOKEN table
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

    // 12. EMAIL_VERIFICATION_TOKEN table
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

    // 13. AUDIO table
    await client.query(`
      CREATE TABLE audio (
        audio_id SERIAL PRIMARY KEY,
        exhibit_id BIGINT REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
        language_id BIGINT REFERENCES language(language_id) ON DELETE SET NULL,
        file_url VARCHAR(512),
        title TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. IMAGES table
    await client.query(`
  CREATE TABLE images (
    image_id BIGSERIAL PRIMARY KEY,
    exhibit_id BIGINT REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
    exhibition_id BIGINT REFERENCES exhibitions(exhibition_id) ON DELETE CASCADE, 
    title TEXT,
    description TEXT,
    file_url VARCHAR(512),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`);

    // 15. SUBTITLE table
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

    // 16. FEEDBACK table
    await client.query(`
      CREATE TABLE feedback (
        feedback_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
        exhibit_id BIGINT REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. AUDIO_PLAYBACK_LOGS table
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

    // 18. AUDIT_LOGS table
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

      -- Exhibit and content indexes
      CREATE INDEX idx_exhibit_title ON exhibit(title);
      CREATE INDEX idx_exhibit_created_at ON exhibit(created_at);

      -- QR Code indexes
      CREATE INDEX idx_qr_code_exhibit_id ON qr_code(exhibit_id);
      CREATE INDEX idx_qr_code_url ON qr_code(qr_url);

      -- Audio indexes
      CREATE INDEX idx_audio_exhibit_id ON audio(exhibit_id);
      CREATE INDEX idx_audio_language_id ON audio(language_id);
      CREATE INDEX idx_audio_title ON audio(title);
      CREATE INDEX idx_audio_created_at ON audio(created_at);

      -- Image indexes
      CREATE INDEX idx_images_exhibit_id ON images(exhibit_id);
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

      -- Feedback indexes
      CREATE INDEX idx_feedback_user_id ON feedback(user_id);
      CREATE INDEX idx_feedback_exhibit_id ON feedback(exhibit_id);
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

      -- Composite indexes for common queries
      CREATE INDEX idx_user_email_status ON "user"(email, status_id);
      CREATE INDEX idx_feedback_user_exhibit ON feedback(user_id, exhibit_id);
      CREATE INDEX idx_audio_exhibit_language ON audio(exhibit_id, language_id);
      CREATE INDEX idx_subtitle_audio_language ON subtitle(audio_id, language_id);
    `);

    await client.query(`
  CREATE INDEX idx_images_exhibition_id ON images(exhibition_id);
`);

    // Add triggers for updated_at columns
    await client.query(`
      -- Function to update updated_at column
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply triggers to all tables with updated_at columns
      CREATE TRIGGER update_user_updated_at
          BEFORE UPDATE ON "user"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_exhibit_updated_at
          BEFORE UPDATE ON exhibit
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
    `);

    // Add constraints
    await client.query(`
      -- Ensure only one default language
      CREATE UNIQUE INDEX idx_language_is_default_unique 
      ON language (is_default) WHERE is_default = true;

      -- Ensure only one primary image per exhibit
      CREATE UNIQUE INDEX idx_images_exhibit_primary_unique 
      ON images (exhibit_id) WHERE is_primary = true;

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
    
    await client.query(`
      INSERT INTO "user" (username, email, password_hash, email_verified, status_id, last_login_at) VALUES
      ($1, $2, $3, true, 1, CURRENT_TIMESTAMP - INTERVAL '2 hours')
    `, ['admin', 'admin@audiomuseum.com', adminHash]);

    // Generate 100+ users with varying registration dates for trend analysis
    const users = [];
    const usernames = [];
    const emails = [];
    const statuses = [1, 1, 1, 1, 2, 3]; // Mostly active, some inactive/suspended
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Blake', 'Cameron', 'Devon', 'Emery', 'Harper', 'Hayden', 'Jamie', 'Kennedy', 'Logan', 'Madison', 'Parker'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

    // Create users spanning the last 12 months with realistic distribution
    for (let i = 1; i <= 120; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      
      // Distribute registrations over past 12 months with higher activity in recent months
      const daysAgo = Math.floor(Math.random() * 365);
      const weight = Math.max(0.1, 1 - (daysAgo / 365)); // More users in recent months
      const adjustedDaysAgo = Math.random() < weight ? Math.floor(Math.random() * 90) : daysAgo;
      
      const createdAt = `CURRENT_TIMESTAMP - INTERVAL '${adjustedDaysAgo} days' - INTERVAL '${Math.floor(Math.random() * 24)} hours'`;
      const statusId = statuses[Math.floor(Math.random() * statuses.length)];
      const emailVerified = Math.random() > 0.1; // 90% email verified
      const hasLoggedIn = Math.random() > 0.2; // 80% have logged in
      const lastLoginAt = hasLoggedIn ? 
        `CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * adjustedDaysAgo + 1)} days'` : 
        'NULL';

      users.push(`('${username}', '${email}', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ${emailVerified}, ${statusId}, ${lastLoginAt}, ${createdAt})`);
      usernames.push(username);
      emails.push(email);
    }

    // Insert users in batches to avoid query size limits
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await client.query(`
        INSERT INTO "user" (username, email, password_hash, email_verified, status_id, last_login_at, created_at) VALUES
        ${batch.join(', ')};
      `);
    }

    console.log(`Inserted ${users.length + 1} users total (including admin and ${users.length} test users)`);

    // Assign roles to users - admin first
    await client.query(`
      INSERT INTO userroles (user_id, role_id) VALUES 
      (1, 1); -- admin user gets admin role
    `);

    // Assign visitor role to all other users (user_id > 1)
    await client.query(`
      INSERT INTO userroles (user_id, role_id)
      SELECT user_id, 3 FROM "user" WHERE user_id > 1;
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

    // Insert exhibitions
    await client.query(`
      INSERT INTO exhibitions (title, description, status_id) VALUES
      ('Sandbox', 'A journey through Singapore''s evolving challenges and perspectives.', 1),
      ('Through The Lens of Time', 'Explore how Singapore came to be through trade, migration, and conflict.', 1);
    `);

    // Insert exhibits for Sandbox (exhibition_id = 1)
    await client.query(`
      INSERT INTO exhibit (exhibition_id, title, description, status_id) VALUES
      (1, 'Enter The Sandbox', 'We have witnessed Singapore''s journey to nationhood... Leave your unique imprint on our present and future here in the Sandbox today.', 1),
      (1, 'Particles of Change', 'Immerse in an experience where play meets inspiration.', 1),
      (1, 'Strength of Our Nation', 'The peace we experience in Singapore today is in no small part due to our men and women in uniform...', 1),
      (1, 'Staying Resilient Amid Tough Times', 'Singaporeans have shown resilience amid challenges...', 1),
      (1, 'Adaptable in the Face of Challenges', 'Your attitude is your anchor. See how Singaporeans rise up to meet threats.', 1),
      (1, 'Case Notes: Captain Cherie Chua', 'Air warfare officer on staying resilient in a dynamic environment.', 1),
      (1, 'Case Notes: Dr Gabriel Ong', 'Helping ex-offenders reintegrate into society with psychological support.', 1),
      (1, 'Case Notes: Lieutenant (NS) Max West', 'Mental fortitude during National Service and pushing past limits.', 1),
      (1, 'Case Notes: Mr Joel Quek Wee Teck', 'Resilience of frontline nurses during the COVID-19 pandemic.', 1),
      (1, 'Future-Proofing With the Power of Foresight', 'Moving into the future prepared with technological upskilling.', 1),
      (1, 'Zone 2: Our People, Our Home', 'Celebrate multiculturalism and shared identity.', 1),
      (1, 'Zone 3: Onward to Our Future', 'Economic prosperity through the Singaporean enterprising spirit.', 1),
      (1, 'Zone 4: Fast Forward', 'What is the future you imagine for Singapore?', 1),
      (1, 'Zone 5: The Interchange', 'Where ideas connect. Live performances and co-creation experiences.', 1)
    `);

    // Insert exhibits for Through The Lens of Time (exhibition_id = 2)
    await client.query(`
      INSERT INTO exhibit (exhibition_id, title, description, status_id) VALUES
      (2, 'The Turning Point', 'Stories of courage and resilience amid war.', 1),
      (2, 'Days of Darkness', 'Terror and hardship during Japanese Occupation.', 1),
      (2, 'Resistance and Resilience', 'Local resistance fighters defend Singapore.', 1),
      (2, 'Against All Odds', 'Singapore’s fight for sovereignty.', 1),
      (2, 'HEAD-TO-HEAD', 'Confrontation and sabotage during Konfrontasi.', 1),
      (2, 'Relentless Sabotage', '42 sabotage acts during Konfrontasi period.', 1),
      (2, 'The Road of Independence', 'The journey toward Singapore’s sovereignty.', 1),
      (2, 'Building Our Foundation', 'Milestones of national development post-independence.', 1),
      (2, 'The 1983 Cable Car Tragedy', 'Oil vessel crash causes cable car disaster.', 1),
      (2, 'The Rescue Mission', 'Joint SAF and civil service rescue effort.', 1),
      (2, 'Our Milestones', 'Singapore’s achievements and moments of celebration.', 1)
    `);

    // Insert badges automatically for each exhibit
    // Get all exhibits
    const exhibits = await client.query(`SELECT exhibit_id, title, description FROM exhibit`);

    function toSafeFileName(title) {
      return title
        .trim()
        .replace(/:/g, "")
        .replace(/\s+/g, "_") 
        .replace(/[^a-zA-Z0-9_-]/g, ""); 
    }

    // Loop through exhibits and insert corresponding badges
    for (const exhibit of exhibits.rows) {
    const { exhibit_id, title, description } = exhibit;
    const safeFileName = toSafeFileName(title);

    const badgeResult = await client.query(
      `INSERT INTO badge (name, description, image_url, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING badge_id`,
      [title, description, `http://localhost:${PORT}/public/images/badge/${safeFileName}.png`]
    );

      const badgeId = badgeResult.rows[0].badge_id;

      // Update exhibit to link this badge
      await client.query(
        `UPDATE exhibit SET badge_id = $1 WHERE exhibit_id = $2`,
        [badgeId, exhibit_id]
      );
    }

    // Insert userBadges (4 badges are earned by admin 1)
    await client.query(`
      INSERT INTO user_badge (user_id, badge_id, created_at) VALUES
      (1, 1, NOW()),
      (1, 2, NOW()),
      (1, 3, NOW()),
      (1, 4, NOW());
    `);

    // Insert QR codes dynamically
    await client.query(`
      INSERT INTO qr_code (exhibit_id, qr_url)
      SELECT exhibit_id, 'http://localhost:5173/exhibits/' || exhibit_id FROM exhibit;
    `);

    // Insert image files 
    await client.query(`
      INSERT INTO images (exhibit_id, exhibition_id, title, description, file_url, is_primary) VALUES
      (1, 1, 'Enter The Sandbox', '', '/images/enterthesandbox.jpg', true),
      (2, 1, 'Particles of Change', '', '/images/particlesofchange.jpg', true),
      (3, 1, 'Strength of Our Nation', '', '/images/strengthofournation.jpg', true),
      (4, 1, 'Staying Resilient', '', '/images/stayresilient.jpg', true),
      (5, 1, 'Adaptable', '', '/images/adaptable.jpg', true),
      (6, 1, 'A Second Chance', 'Dr Gabriel Ong gives ex-offenders hope.', '/images/asecondchance.jpg', true),
      (7, 1, 'Mastering the Fight and the Flight', 'Captain Cherie Chua defends Singapore''s skies.', '/images/masteringthefightandtheflight.jpg', true),
      (8, 1, 'The Backbone', 'Lieutenant Max West shares his NS experience.', '/images/thebackbone.jpg', true),
      (9, 1, 'Diving Into the Unknown', 'Nurse Joel Quek during the COVID-19 crisis.', '/images/divingintotheunknown.jpg', true),
      (10, 1, 'Futureproofing', 'Being prepared with foresight for change.', '/images/futureproofing.jpg', true),
      (11, 1, 'Our People Our Home', 'Embracing Singapore''s multiculturalism.', '/images/ourpeopleourhome.jpg', true),
      (12, 1, 'Onward to Our Future', 'Singapore''s drive toward innovation and growth.', '/images/onwardtoourfuture.jpg', true),
      (13, 1, 'Fast Forward', 'Imagining a bold and collaborative future.', '/images/fastforward.jpg', true),
      (14, 1, 'The Interchange', 'Live dome performances and idea sharing.', '/images/theinterchange.jpg', true),

      (15, 2, 'The Turning Point', '', '/images/The Turning Point.jpg', true),
      (16, 2, 'Days of Darkness', '', '/images/daysofdarkness.jpg', true),
      (17, 2, 'Resistance and Resilience', '', '/images/resistanceandresilience.jpg', true),
      (18, 2, 'Against All Odds', '', '/images/Against All Odds.jpg', true),
      (19, 2, 'Head-to-Head', '', '/images/headtohead.jpg', true),
      (20, 2, 'Relentless Sabotage', '', '/images/relentlesssabotage.jpg', true),
      (21, 2, 'The Road to Independence', '', '/images/theroadtoindependence.jpg', true),
      (22, 2, 'Enduring the Scars of War', '', '/images/enduringthescarsofwar.jpg', true),
      (23, 2, 'The 1983 Cable Car Tragedy', '', '/images/the1983cablecartragedy.jpg', true),
      (24, 2, 'The Rescue Mission', '', '/images/therescuemission.jpg', true),
      (25, 2, 'Our Milestones', '', '/images/ourmilestones.jpg', true)
    `);





    // Insert feedback
    await client.query(`
  INSERT INTO feedback (user_id, exhibit_id, rating, description) VALUES
  (3, 1, 5, 'Immersive and emotional storytelling about early Singapore. Loved how the visuals brought the maritime past to life.'),
  (4, 2, 5, 'Very powerful depiction of wartime courage. The Resistance and Resilience segment was especially moving.'),
  (3, 3, 4, 'Strong narrative on Singapore’s struggle for independence. The sabotage acts were intense!'),
  (4, 4, 4, 'Great insight into Singapore’s milestones. The Cable Car Tragedy was deeply impactful.');
`);


    // Insert sessions
    await client.query(`
      INSERT INTO sessions (user_id) VALUES (1), (2), (3), (4);
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

    // Insert audit logs
    await client.query(`
      INSERT INTO audit_logs (admin_user_id, target_user_id, resource, action, changes, metadata) VALUES
      (1, 3, 'user', 'create', '{"username": "john_doe", "email": "john@example.com"}', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}'),
      (1, 4, 'user', 'create', '{"username": "jane_smith", "email": "jane@example.com"}', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}'),
      (1, NULL, 'exhibit', 'create', '{"title": "The Digital Frontier", "description": "Technology through the ages"}', '{"ip_address": "192.168.1.100"}'),
      (2, NULL, 'exhibit', 'update', '{"title": "The Digital Frontier", "description": "Updated description"}', '{"ip_address": "192.168.1.101"}'),
      (1, 2, 'user', 'update', '{"role": "moderator", "status": "active"}', '{"ip_address": "192.168.1.100"}'),
      (1, NULL, 'permission', 'create', '{"name": "manage_users", "description": "Can manage user accounts"}', '{"ip_address": "192.168.1.100"}'),
      (1, NULL, 'role', 'create', '{"name": "curator", "description": "Museum curator role"}', '{"ip_address": "192.168.1.100"}'),
      (2, 3, 'user', 'delete', '{"username": "john_doe", "reason": "account_cleanup"}', '{"ip_address": "192.168.1.101"}'),
      (1, NULL, 'exhibit', 'delete', '{"title": "Old Exhibit", "reason": "content_outdated"}', '{"ip_address": "192.168.1.100"}'),
      (NULL, NULL, 'system', 'backup', '{"type": "full_backup", "size": "2.5GB"}', '{"scheduled": true, "duration": "45min"}');
    `);

    // Clean up expired tokens as demonstration
    await client.query("SELECT cleanup_expired_tokens();");

    console.log("✅ Seeding complete!");
    console.log("📊 Database ready with:");
    console.log("   - 121 users (admin + 120 test users with varied registration dates)");
    console.log(
      "   - 3 roles with proper permissions (including password reset & email verification)"
    );
    console.log("   - 10 languages with English as default");
    console.log("   - 2 exhibitions with 25 exhibits total, QR codes, images and feedback");
    console.log("   - Password reset and email verification token tables");
    console.log(
      "   - Sample tokens for testing (1 expired, cleaned up automatically)"
    );
    console.log("   - 10 sample audit log entries");
    console.log(
      "   - Comprehensive performance indexes and constraints applied"
    );
    console.log("   - Automatic token cleanup function available");
    console.log("   - User registration data distributed over 12 months for trend analysis");
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
