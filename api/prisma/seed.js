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

    // 2. EXHIBITIONS table
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

    // 3. badge table
    await client.query(`
    CREATE TABLE badge (
    badge_id BIGSERIAL PRIMARY KEY,
    name TEXT,
    description TEXT,
    style VARCHAR(100),
    image_url VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    `);

    // 4. EXHIBIT table
    await client.query(`
      CREATE TABLE exhibit (
        exhibit_id BIGSERIAL PRIMARY KEY,
        exhibition_id BIGINT REFERENCES exhibitions(exhibition_id) ON DELETE CASCADE,
        badge_id BIGINT UNIQUE REFERENCES badge(badge_id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        status_id INTEGER REFERENCES status(status_id) ON DELETE SET NULL,
        description TEXT,
        additional_description TEXT,
        sequence INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_exhibition_sequence UNIQUE (exhibition_id, sequence)
      );
    `);

    // 5. QR_CODE table to link exhibits and QR URLs
    await client.query(`
      CREATE TABLE qr_code (
        qr_id SERIAL PRIMARY KEY,
        exhibit_id BIGINT NOT NULL REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
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
        profile_picture_url VARCHAR(255) NULL,
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

    // 16. AUDIO table
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

    // 17. IMAGES table
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

    // 18. SENDER_TYPE table for AI Assistant
    await client.query(`
      CREATE TABLE sender_type (
        sender_type_id SERIAL PRIMARY KEY,
        sender_type VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      INSERT INTO sender_type (sender_type_id, sender_type) VALUES
      (1, 'user'),
      (2, 'assistant');
    `);

    // 19. CONVERSATION table for AI Assistant
    await client.query(`
      CREATE TABLE conversation (
        conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL,
        title TEXT,
        status_id INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        modified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
        FOREIGN KEY (status_id) REFERENCES status(status_id) ON DELETE SET NULL
      );
    `);

    // 20. MESSAGE table for AI Assistant
    await client.query(`
      CREATE TABLE message (
        message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL,
        sender_type_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        status_id INTEGER NOT NULL DEFAULT 1 REFERENCES status(status_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id) ON DELETE CASCADE,
        FOREIGN KEY (sender_type_id) REFERENCES sender_type(sender_type_id) ON DELETE RESTRICT
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

    // 19. FEEDBACK table
    await client.query(`
      CREATE TABLE feedback (
        feedback_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
        exhibit_id BIGINT REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        description TEXT,
        is_hidden BOOLEAN DEFAULT FALSE,
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

      -- Exhibition indexes (CRITICAL for dashboard performance)
      CREATE INDEX idx_exhibitions_status ON exhibitions(status_id);
      CREATE INDEX idx_exhibitions_created_at ON exhibitions(created_at);
      CREATE INDEX idx_exhibitions_title ON exhibitions(title);

      -- Exhibit indexes (CRITICAL for tour management)
      CREATE INDEX idx_exhibit_exhibition_id ON exhibit(exhibition_id);
      CREATE INDEX idx_exhibit_status ON exhibit(status_id);
      CREATE INDEX idx_exhibit_badge_id ON exhibit(badge_id);
      CREATE INDEX idx_exhibit_sequence ON exhibit(sequence);
      CREATE INDEX idx_exhibit_exhibition_sequence ON exhibit(exhibition_id, sequence);
      CREATE INDEX idx_exhibit_title ON exhibit(title);
      CREATE INDEX idx_exhibit_created_at ON exhibit(created_at);

      -- Badge indexes
      CREATE INDEX idx_badge_created_at ON badge(created_at);

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

      -- AI Assistant (Omnie) indexes
      CREATE INDEX idx_message_conversation_status ON message(conversation_id, status_id, created_at, sender_type_id);
      CREATE INDEX idx_conversation_user_status ON conversation(user_id, status_id, created_at);

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

      CREATE TRIGGER update_badge_updated_at
          BEFORE UPDATE ON badge
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_exhibitions_updated_at
          BEFORE UPDATE ON exhibitions
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

    // Add stored procedures for exhibit and exhibition management
    console.log("🔧 Creating stored procedures...");

    // Stored procedure to create exhibit with images
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_create_exhibit(
        IN p_title TEXT,
        IN p_description TEXT,
        IN p_exhibition_id BIGINT,
        IN p_additional_description TEXT DEFAULT '',
        IN p_images JSONB DEFAULT NULL,
        IN p_qr_base_url TEXT DEFAULT '',
        INOUT p_new_exhibit_id BIGINT DEFAULT NULL
      ) 
      LANGUAGE plpgsql AS $$
      DECLARE
        v_exhibit_id BIGINT;
        v_badge_id BIGINT;
        v_qr_url TEXT;
        image_item JSONB;
      BEGIN
        -- Insert the exhibit and get the ID
        INSERT INTO exhibit (exhibition_id, title, description, additional_description, status_id)
        VALUES (p_exhibition_id, p_title, p_description, p_additional_description, 1)
        RETURNING exhibit_id INTO v_exhibit_id;
        
        -- Set the output parameter
        p_new_exhibit_id := v_exhibit_id;
        
        -- Create QR code if base URL provided
        IF p_qr_base_url IS NOT NULL AND p_qr_base_url != '' THEN
          v_qr_url := p_qr_base_url || v_exhibit_id;
          INSERT INTO qr_code (exhibit_id, qr_url) VALUES (v_exhibit_id, v_qr_url);
        END IF;
        
        -- Insert images if provided
        IF p_images IS NOT NULL THEN
          FOR image_item IN SELECT * FROM jsonb_array_elements(p_images) 
          LOOP
            INSERT INTO images (exhibit_id, file_url, title, is_primary)
            VALUES (
              v_exhibit_id, 
              image_item->>'file_url', 
              image_item->>'title',
              (image_item->>'is_primary')::boolean
            );
          END LOOP;
        END IF;
        
        COMMIT;
      END;
      $$;
    `);

    // Stored procedure to deactivate exhibit
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_deactivate_exhibit(
        IN p_exhibit_id BIGINT
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE exhibit 
        SET status_id = 2, updated_at = CURRENT_TIMESTAMP 
        WHERE exhibit_id = p_exhibit_id;
        
        COMMIT;
      END;
      $$;
    `);

    // Stored procedure to reactivate exhibit
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_reactivate_exhibit(
        IN p_exhibit_id BIGINT
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE exhibit 
        SET status_id = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE exhibit_id = p_exhibit_id;
        
        COMMIT;
      END;
      $$;
    `);

    // Stored procedure to create exhibition
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_create_exhibition(
        IN p_title TEXT,
        IN p_description TEXT,
        IN p_image_url TEXT DEFAULT NULL,
        INOUT p_new_exhibition_id BIGINT DEFAULT NULL
      )
      LANGUAGE plpgsql AS $$
      DECLARE
        v_exhibition_id BIGINT;
      BEGIN
        INSERT INTO exhibitions (title, description, status_id)
        VALUES (p_title, p_description, 1)
        RETURNING exhibition_id INTO v_exhibition_id;
        
        -- Set the output parameter
        p_new_exhibition_id := v_exhibition_id;
        
        -- Insert exhibition image if provided
        IF p_image_url IS NOT NULL AND p_image_url != '' THEN
          INSERT INTO images (exhibition_id, file_url, title, is_primary)
          VALUES (v_exhibition_id, p_image_url, p_title, true);
        END IF;
        
        COMMIT;
      END;
      $$;
    `);

    // Stored procedure to deactivate exhibition
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_deactivate_exhibition(
        IN p_exhibition_id BIGINT
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE exhibitions 
        SET status_id = 2, updated_at = CURRENT_TIMESTAMP 
        WHERE exhibition_id = p_exhibition_id;
        
        COMMIT;
      END;
      $$;
    `);

    // Stored procedure to reactivate exhibition
    await client.query(`
      CREATE OR REPLACE PROCEDURE sp_reactivate_exhibition(
        IN p_exhibition_id BIGINT
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE exhibitions 
        SET status_id = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE exhibition_id = p_exhibition_id;
        
        COMMIT;
      END;
      $$;
    `);

    console.log("✅ Stored procedures created successfully!");

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

    // Insert exhibitions (matching seed data IDs 6 and 7)
await client.query(`
    INSERT INTO exhibitions (exhibition_id, title, description, status_id) VALUES
    (1, 'Through the Lens of Time', 'Through the Lens of Time is a permanent, immersive gallery at the Singapore Discovery Centre that takes visitors on a multi-sensory journey through roughly 700 years of Singapore''s history. Designed in collaboration with experiential agency Pico, the exhibition uses a mix of theatrical settings, lights, sound, props, augmented reality (AR), and interactive multimedia to tell the story of Singapore from its early days to modern times', 2),
    (2, 'The Beginning', 'The Beginnings introduces visitors to Singapore''s early history, long before modern nationhood. This immersive zone uses large-scale projections, soundscapes, and theatrical lighting to recreate Singapore as a thriving maritime hub. It highlights early trade networks, cultural exchanges, and the island''s strategic importance, setting the foundation for understanding how Singapore evolved into a colonial port and eventually a modern nation.', 2),
    (3, 'SoC Tour', 'Join us for the SoC Tour, an exclusive opportunity to explore our cutting-edge facilities, meet our passionate faculty, and see firsthand how we''re shaping the next generation of tech innovators. Whether you''re curious about Artificial Intelligence (AI), Cybersecurity, Data Science, or Game Development, this tour is your gateway to understanding the diverse career pathways in the computing industry.', 1),
    (4, 'CLS Tour', 'School of Chemical & Life Sciences Tour - Explore cutting-edge laboratories, innovative programmes, and student research projects at Singapore Polytechnic. Discover how we prepare the next generation of scientists and life science professionals through hands-on learning and industry partnerships.', 1),
    (5, 'SoB Tour', 'School of Business Tour - Discover business-related diploma programmes, industry partnerships, and career pathways at the School of Business, Singapore Polytechnic. Learn about entrepreneurship, marketing, accounting, and business analytics in our modern learning facilities.', 1)
    `);

    // Insert badges first (25 badges)
   await client.query(`
    INSERT INTO badge (badge_id, name, description, style, image_url) VALUES
    (1, 'Enter The Sandbox', 'We have witnessed Singapore''s journey to nationhood... Leave your unique imprint on our present and future here in the Sandbox today.', 'cool', '/images/badge/Enter_The_Sandbox.png'),
    (2, 'Particles of Change', 'Immerse in an experience where play meets inspiration.', 'cool', '/images/badge/Particles_of_Change.png'),
    (3, 'Strength of Our Nation', 'The peace we experience in Singapore today is in no small part due to our men and women in uniform...', 'cool', '/images/badge/Strength_of_Our_Nation.png'),
    (4, 'Staying Resilient Amid Tough Times', 'Singaporeans have shown resilience amid challenges...', 'cool', '/images/badge/Staying_Resilient_Amid_Tough_Times.png'),
    (5, 'Special Badge Number 5', 'Malaysians have shown resilience amid challenges...', 'cool', '/images/badge/Staying_Resilient_Amid_Tough_Times.png'),
    (6, 'School of Computing Explorer', 'Scan here to discover the exciting world of computing at Singapore Polytechnic!', 'cool', '/images/badge/Our_Milestones.png'),
    (7, 'SP Counselling Guide', 'Learn about course counselling and find your perfect program at Singapore Polytechnic.', 'cool', '/images/badge/Relentless_Sabotage.png'),
    (8, 'SP Counselling CLS', 'Learn about course counselling and find your perfect program at Singapore Polytechnic.', 'cool', '/images/badge/Relentless_Sabotage.png'),
    (9, 'SP Counselling SOB', 'Learn about course counselling and find your perfect program at Singapore Polytechnic.', 'cool', '/images/badge/Relentless_Sabotage.png')

`);

    // Insert exhibits from seed data (exhibit_ids 1, 2, 3, 4, 5, 6)
await client.query(`
      INSERT INTO exhibit (exhibit_id, exhibition_id, badge_id, title, description, additional_description, status_id, sequence) VALUES
      (1, 1, 1, 'Maritime Roots Interactive Gallery', 'This exhibit recreates early Singapore as a bustling maritime hub. Visitors walk through a curved projection wall showing trading ships arriving from the region, bustling markets, and cultural exchanges. Interactive hotspots allow visitors to tap on historical objects—such as spices, pottery, and navigational tools—to learn how these items shaped Singapore''s early importance in regional trade.', 'Dive deeper into Singapore''s maritime heritage through immersive storytelling. This gallery features authentic artifacts recovered from archaeological sites, including ancient coins, ceramics, and navigation instruments. Advanced augmented reality stations let visitors virtually handle historical trading goods and understand their significance in Southeast Asian commerce. The exhibit showcases how Singapore''s strategic location attracted merchants from China, India, the Malay world, and beyond, creating the multicultural foundation that defines Singapore today.', 1, 1),
      (2, 1, 2, 'Ancient Singapore Map Table', 'This exhibit features a large illuminated table displaying an animated map of early Singapore and the surrounding region. As visitors move their hands over different areas, sensors highlight ancient trade routes, regional kingdoms, and important geographic features. The map shows how Singapore''s location made it a natural meeting point for merchants, sailors, and explorers. Visitors can select specific time periods to see how the island evolved before colonisation.', 'Experience 14th-century Singapore through cutting-edge cartographic technology. The interactive table combines historical maps from the British Library, National Archives of Singapore, and regional museums to create an unprecedented view of pre-colonial Southeast Asia. Gesture-controlled interfaces allow visitors to zoom from satellite views down to village level, revealing settlement patterns, monsoon trading cycles, and the rise and fall of maritime empires. Special focus is given to the Johor-Riau Sultanate and the role of Temasek in regional politics.', 1, 2),
      (3, 2, 3, 'Wartime Bunker Immersion Room', 'This exhibit recreates a WWII underground bunker with dim lighting, sandbags, and distant sounds of conflict. Visitors enter a narrow room where projected scenes show Singapore during the early days of the Japanese invasion. Ambient effects—sirens, footsteps, radio chatter—create the tense atmosphere experienced by soldiers and civilians. Interactive panels allow visitors to learn about key moments leading up to the fall of Singapore.', 'Step into February 1942 Singapore through this historically accurate bunker recreation. Built using original architectural plans from Fort Canning and Labrador, the space features period-correct equipment, uniforms, and communication devices. Carefully researched audio tracks include actual radio broadcasts, air raid sirens, and eyewitness accounts from the Imperial War Museum archives. Motion sensors trigger different scenarios as visitors move through the space, creating a deeply personal understanding of the fear, uncertainty, and courage displayed during Singapore''s darkest hours.', 1, 1),
      (4, 2, 4, 'Faces of the Occupation Story Wall', 'A large digital wall displays portraits of civilians during the Japanese Occupation—children, nurses, shopkeepers, and families. Selecting a face brings up their personal story through photos, reenacted clips, and historical documents. Visitors learn how everyday life changed under rationing, curfews, and fear. The aim is to humanise the impact of war through individual experiences.', 'Meet 50 real families who lived through the Japanese Occupation through this comprehensive digital memorial. Each story has been carefully researched using oral history archives, family documents, and wartime records. Professional actors perform dramatic readings of diary entries, letters, and testimonies, while period photographs and documents provide authentic context. The wall includes stories from all of Singapore''s communities—Chinese, Malay, Indian, Eurasian, and European—showing how war affected people regardless of background. Interactive family trees let visitors trace how occupation experiences shaped post-war Singapore society.', 1, 2),
      (5, 3, 5, 'Project INC', 'Project INC: Industry Now Curriculum Project INC (which stands for Industry Now Curriculum) is the Singapore Polytechnic School of Computing''s unique, industry-facing learning approach. It''s not just a final-year project; it''s an accelerated software house environment where students work as professional software developers on real, client-paid industry projects from leading companies.', 'Did You Know? In Project INC, Students get a chance to work with real life client projects! INC Students in 2025 got to work on client projects from SLA, CleoSpa and Singapore Poly Open House so far! What are You Waiting For? Join us Today!', 1, 2),
      (6, 3, 6, 'Registration Booth', 'Find out about the School of Computing! Discover our cutting-edge facilities, innovative programs, and how we are shaping the next generation of tech leaders. From AI and Machine Learning to Cybersecurity and Game Development, explore the diverse specializations that await you at Singapore Polytechnic School of Computing.', 'Welcome to the School of Computing Registration! Here you will learn about our state-of-the-art computing labs, industry partnerships with tech giants, and how our graduates are making waves in the tech industry. Our diploma programs cover everything from Software Development, Information Technology, to Immersive Media and Game Design. Find out about our hands-on learning approach, internship opportunities, and how we prepare students for real-world challenges. Scan the QR code to begin your computing journey today!', 1, 1),
      (7, 3, 7, 'Course Counselling', 'Get know more about Singapore Polytechnic counselling options. Get personalized guidance on choosing the right diploma program that matches your interests and career goals. Our experienced counsellors are here to help you navigate through course requirements, application processes, and scholarship opportunities.', 'Singapore Polytechnic Course Counselling - Your Guide to Success! Our dedicated counselling team provides comprehensive support for prospective students. Learn about entry requirements for different diploma courses, understand the application timeline, explore financial aid options, and discover career pathways after graduation. Whether you are interested in Engineering, Business, Design, Health Sciences, or Computing, our counsellors will help you make informed decisions about your educational journey. Book a one-on-one session to discuss your aspirations and find the perfect course for you!', 1, 3),
      (8, 4, 8, 'Course Counselling', 'Get know more about Singapore Polytechnic counselling options. Get personalized guidance on choosing the right diploma program that matches your interests and career goals. Our experienced counsellors are here to help you navigate through course requirements, application processes, and scholarship opportunities.', 'Singapore Polytechnic Course Counselling - Your Guide to Success! Our dedicated counselling team provides comprehensive support for prospective students. Learn about entry requirements for different diploma courses, understand the application timeline, explore financial aid options, and discover career pathways after graduation. Whether you are interested in Engineering, Business, Design, Health Sciences, or Computing, our counsellors will help you make informed decisions about your educational journey. Book a one-on-one session to discuss your aspirations and find the perfect course for you!', 1, 1),
      (9, 5, 9, 'Course Counselling', 'Get know more about Singapore Polytechnic counselling options. Get personalized guidance on choosing the right diploma program that matches your interests and career goals. Our experienced counsellors are here to help you navigate through course requirements, application processes, and scholarship opportunities.', 'Singapore Polytechnic Course Counselling - Your Guide to Success! Our dedicated counselling team provides comprehensive support for prospective students. Learn about entry requirements for different diploma courses, understand the application timeline, explore financial aid options, and discover career pathways after graduation. Whether you are interested in Engineering, Business, Design, Health Sciences, or Computing, our counsellors will help you make informed decisions about your educational journey. Book a one-on-one session to discuss your aspirations and find the perfect course for you!', 1, 1)

      `);

    // Clean up any existing QR codes first to prevent duplicates
    await client.query(`DELETE FROM qr_code WHERE qr_id IN (1, 2, 3, 4, 5, 6, 7);`);
    
    // Insert QR codes for exhibits (matching updated exhibit IDs)
    await client.query(`
      INSERT INTO qr_code (qr_id, exhibit_id, qr_url) VALUES
      (1, 1, 'http://localhost:5173/exhibit/1'),
      (2, 2, 'http://localhost:5173/exhibit/2'),
      (3, 3, 'http://localhost:5173/exhibit/3'),
      (4, 4, 'http://localhost:5173/exhibit/4'),
      (5, 5, 'http://localhost:5173/exhibit/5'),
      (6, 6, 'http://localhost:5173/exhibit/6'),
      (7, 7, 'http://localhost:5173/exhibit/7')
      ON CONFLICT (qr_id) DO UPDATE SET
        exhibit_id = EXCLUDED.exhibit_id,
        qr_url = EXCLUDED.qr_url;

    `);

    // // Insert image files (matching seed data)
    await client.query(`
      INSERT INTO images (image_id, exhibit_id, exhibition_id, title, description, file_url, is_primary) VALUES
      (1, NULL, 1, 'Cover for Through the Lens of Time', '', '/images/ThroughTheLensOfTime.jpg', true),
      (2, NULL, 2, 'Cover for The Beginning', '', '/images/TheBeginnings.jpg', true),
      (3, 1, NULL, 'resistanceandresilience.jpg', '', '/images/Bunker.jpg', true),
      (4, 2, NULL, 'headtohead.jpg', '', '/images/WallFaces.jpg', true),
      (5, 3, NULL, 'relentlesssabotage2.jpg', '', '/images/Bunker.jpg', true),
      (6, 4, NULL, 'divingintotheunknown.jpg', '', '/images/WallFaces.jpg', true),
      (7, NULL, 3, 'Project INC Image', '', '/images/UpdatedSoC.jpg', true),
      (8, 5, NULL, 'Project INC Image', '', '/images/UpdatedSoC.jpg', true),
      (9, 5, NULL, 'Project INC Image', '', '/images/SoC3.jpg', false),
      (10, 5, NULL, 'Project INC Image', '', '/images/SoC2.jpg', false),
      (11, 5, NULL, 'Project INC Image', '', '/images/SoC1.avif', false),
      (12, 6, NULL, 'Registration Booth Primary', '', '/images/RegistrationBooth.jpg', true),
      (13, 6, NULL, 'Registration Booth Secondary', '', '/images/AI.jpg', false),
      (14, 6, NULL, 'Registration Booth Tertiary', '', '/images/Cyber.jpg', false),
      (15, 7, NULL, 'Course Counselling Primary', '', '/images/Course.jpg', true),
      (16, 7, NULL, 'Course Counselling Secondary', '', '/images/Course2.png', false),
      (17, 7, NULL, 'Course Counselling Tertiary', '', '/images/Course3.jpg', false),
      (18, NULL, 4, 'Cover for CLS Tour', '', '/images/cls.webp', true),
      (19, NULL, 5, 'Cover for SOB Tour', '', '/images/sob.jpg', true),
      (20, 9, NULL, 'Cover for CLS Tour', '', '/images/cls.webp', true),
      (21, 8, NULL, 'Cover for CLS Tour', '', '/images/cls.webp', true)


      `);

    // Insert audio records (matching seed data)
    await client.query(`
      INSERT INTO audio (audio_id, exhibit_id, language_id, file_url, title, description) VALUES
      (804, 1, 1, '/audios/exhibit-29-en-1763374477414.mp3', 'Maritime Roots Interactive Gallery (English)', ''),
      (805, 2, 1, '/audios/exhibit-30-en-1763374570355.mp3', 'Ancient Singapore Map Table (English)', ''),
      (806, 3, 1, '/audios/exhibit-31-en-1763374624474.mp3', 'Wartime Bunker Immersion Room (English)', ''),
      (807, 4, 1, '/audios/exhibit-32-en-1763374670485.mp3', 'Faces of the Occupation Story Wall (English)', ''),
      (809,	5, 1,	'/audios/exhibit-9-en-1764337455157.mp3',	 'Project INC (English)',	''),
      (810, 6, 1, '/audios/exhibit-8-en-1764750075416.mp3', 'Registration Booth (English)', ''),
      (811, 7, 1, '/audios/exhibit-9-en-1764744551822.mp3', 'Course Counselling (English)', ''),
      (812, 7, 7, '/audios/exhibit-8-zh-1764754435539.mp3', 'Course Counsel Chinese', ''),
      (813, 5, 7, '/audios/exhibit-10-zh-1764755473083.mp3', 'INC Chinese', ''),
      (814, 6, 7, '/audios/exhibit-12-zh-1764753319939.mp3', 'Registration Booth (Chinese)', '')


      `);

     // Insert subtitle records (matching seed data with JSONB)
    const subtitle1 = JSON.stringify([{"end": 0.79999995, "word": "Welcome", "start": 0.39999998}, {"end": 0.96, "word": "to", "start": 0.79999995}, {"end": 1.1999999, "word": "the", "start": 0.96}, {"end": 1.6999999, "word": "beginnings.", "start": 1.1999999}, {"end": 2.6399999, "word": "Long", "start": 2.32}, {"end": 3.12, "word": "before", "start": 2.6399999}, {"end": 3.62, "word": "Singapore", "start": 3.12}, {"end": 4.08, "word": "became", "start": 3.84}, {"end": 4.24, "word": "a", "start": 4.08}, {"end": 4.72, "word": "modern", "start": 4.24}, {"end": 5.22, "word": "nation,", "start": 4.72}, {"end": 5.68, "word": "it", "start": 5.44}, {"end": 5.92, "word": "was", "start": 5.68}, {"end": 6.3999996, "word": "already", "start": 5.92}, {"end": 6.64, "word": "a", "start": 6.3999996}, {"end": 7.14, "word": "vibrant", "start": 6.64}, {"end": 7.7, "word": "crossroads", "start": 7.2}, {"end": 8.08, "word": "for", "start": 7.8399997}, {"end": 8.559999, "word": "traders", "start": 8.08}, {"end": 8.8, "word": "from", "start": 8.559999}, {"end": 9.28, "word": "across", "start": 8.8}, {"end": 9.78, "word": "Asia.", "start": 9.28}, {"end": 10.48, "word": "As", "start": 10.32}, {"end": 10.8, "word": "you", "start": 10.48}, {"end": 11.2, "word": "explore", "start": 10.8}, {"end": 11.44, "word": "this", "start": 11.2}, {"end": 11.94, "word": "gallery,", "start": 11.44}, {"end": 12.719999, "word": "notice", "start": 12.4}, {"end": 12.96, "word": "the", "start": 12.719999}, {"end": 13.46, "word": "ships,", "start": 12.96}, {"end": 14.179999, "word": "markets,", "start": 13.679999}, {"end": 14.9, "word": "and", "start": 14.4}, {"end": 15.554999, "word": "artifacts", "start": 15.235}, {"end": 15.875, "word": "that", "start": 15.554999}, {"end": 16.275, "word": "reveal", "start": 15.875}, {"end": 16.515, "word": "how", "start": 16.275}, {"end": 16.994999, "word": "people", "start": 16.515}, {"end": 17.235, "word": "from", "start": 16.994999}, {"end": 17.635, "word": "different", "start": 17.235}, {"end": 18.135, "word": "cultures", "start": 17.635}, {"end": 18.695, "word": "met,", "start": 18.195}, {"end": 19.414999, "word": "traded,", "start": 18.914999}, {"end": 19.875, "word": "and", "start": 19.635}, {"end": 20.275, "word": "shared", "start": 19.875}, {"end": 20.775, "word": "ideas.", "start": 20.275}, {"end": 21.795, "word": "These", "start": 21.555}, {"end": 22.195, "word": "early", "start": 21.795}, {"end": 22.695, "word": "exchanges", "start": 22.195}, {"end": 23.235, "word": "laid", "start": 22.994999}, {"end": 23.395, "word": "the", "start": 23.235}, {"end": 23.895, "word": "foundations", "start": 23.395}, {"end": 24.435, "word": "for", "start": 24.275}, {"end": 24.935, "word": "Singapore's", "start": 24.435}, {"end": 25.474998, "word": "growth", "start": 25.154999}, {"end": 25.634998, "word": "as", "start": 25.474998}, {"end": 25.875, "word": "a", "start": 25.634998}, {"end": 26.375, "word": "strategic", "start": 25.875}, {"end": 26.935, "word": "maritime", "start": 26.435}, {"end": 27.654999, "word": "port.", "start": 27.154999}, {"end": 28.480936, "word": "Tap", "start": 28.240936}, {"end": 28.800936, "word": "on", "start": 28.480936}, {"end": 29.120937, "word": "any", "start": 28.800936}, {"end": 29.620937, "word": "highlighted", "start": 29.120937}, {"end": 30.160936, "word": "object", "start": 29.680937}, {"end": 30.320936, "word": "to", "start": 30.160936}, {"end": 30.560936, "word": "hear", "start": 30.320936}, {"end": 30.960938, "word": "more", "start": 30.560936}, {"end": 31.280937, "word": "about", "start": 30.960938}, {"end": 31.520937, "word": "its", "start": 31.280937}, {"end": 31.920937, "word": "role", "start": 31.520937}, {"end": 32.080936, "word": "in", "start": 31.920937}, {"end": 32.560936, "word": "shaping", "start": 32.080936}, {"end": 32.720936, "word": "our", "start": 32.560936}, {"end": 33.220936, "word": "island's", "start": 32.720936}, {"end": 33.680935, "word": "early", "start": 33.280937}, {"end": 34.180935, "word": "history.", "start": 33.680935}]);
    
    const subtitle2 = JSON.stringify([{"end": 0.32, "word": "You", "start": 0.16}, {"end": 0.48, "word": "are", "start": 0.32}, {"end": 0.88, "word": "now", "start": 0.48}, {"end": 1.28, "word": "viewing", "start": 0.88}, {"end": 1.4399999, "word": "the", "start": 1.28}, {"end": 1.8399999, "word": "ancient", "start": 1.4399999}, {"end": 2.34, "word": "Singapore", "start": 1.8399999}, {"end": 3.06, "word": "map.", "start": 2.56}, {"end": 3.76, "word": "Over", "start": 3.36}, {"end": 4.08, "word": "seven", "start": 3.76}, {"end": 4.48, "word": "hundred", "start": 4.08}, {"end": 4.7999997, "word": "years", "start": 4.48}, {"end": 5.2999997, "word": "ago,", "start": 4.7999997}, {"end": 6.02, "word": "Singapore's", "start": 5.52}, {"end": 6.74, "word": "location", "start": 6.24}, {"end": 7.2, "word": "placed", "start": 6.8799996}, {"end": 7.44, "word": "it", "start": 7.2}, {"end": 7.6, "word": "at", "start": 7.44}, {"end": 7.7599998, "word": "the", "start": 7.6}, {"end": 8.08, "word": "heart", "start": 7.7599998}, {"end": 8.24, "word": "of", "start": 8.08}, {"end": 8.72, "word": "major", "start": 8.24}, {"end": 9.22, "word": "regional", "start": 8.72}, {"end": 9.679999, "word": "trade", "start": 9.28}, {"end": 10.179999, "word": "routes.", "start": 9.679999}, {"end": 11.219999, "word": "Merchants", "start": 10.719999}, {"end": 11.5199995, "word": "from", "start": 11.28}, {"end": 11.679999, "word": "the", "start": 11.5199995}, {"end": 12.16, "word": "Malay", "start": 11.679999}, {"end": 12.66, "word": "Archipelago,", "start": 12.16}, {"end": 14.255, "word": "China,", "start": 13.755}, {"end": 14.975, "word": "India,", "start": 14.475}, {"end": 15.355, "word": "and", "start": 15.115}, {"end": 15.855, "word": "beyond", "start": 15.355}, {"end": 16.155, "word": "pass", "start": 15.915}, {"end": 16.475, "word": "through", "start": 16.155}, {"end": 16.795, "word": "these", "start": 16.475}, {"end": 17.295, "word": "waters,", "start": 16.795}, {"end": 18.095, "word": "carrying", "start": 17.595}, {"end": 18.654999, "word": "goods,", "start": 18.154999}, {"end": 19.455, "word": "culture,", "start": 18.955}, {"end": 19.994999, "word": "and", "start": 19.675}, {"end": 20.494999, "word": "knowledge.", "start": 19.994999}, {"end": 21.275, "word": "As", "start": 21.035}, {"end": 21.515, "word": "you", "start": 21.275}, {"end": 21.994999, "word": "explore", "start": 21.515}, {"end": 22.075, "word": "the", "start": 21.994999}, {"end": 22.575, "word": "map,", "start": 22.075}, {"end": 23.115, "word": "watch", "start": 22.795}, {"end": 23.355, "word": "how", "start": 23.115}, {"end": 23.515, "word": "the", "start": 23.355}, {"end": 23.994999, "word": "island", "start": 23.515}, {"end": 24.494999, "word": "transforms", "start": 23.994999}, {"end": 25.195, "word": "across", "start": 24.715}, {"end": 25.595, "word": "different", "start": 25.195}, {"end": 26.095, "word": "eras,", "start": 25.595}, {"end": 26.895, "word": "revealing", "start": 26.395}, {"end": 27.535, "word": "Singapore's", "start": 27.035}, {"end": 27.994999, "word": "early", "start": 27.675}, {"end": 28.41, "word": "role", "start": 27.994999}, {"end": 28.57, "word": "as", "start": 28.41}, {"end": 28.81, "word": "a", "start": 28.57}, {"end": 29.21, "word": "vital", "start": 28.81}, {"end": 29.71, "word": "maritime", "start": 29.21}, {"end": 30.43, "word": "crossroads.", "start": 29.93}, {"end": 31.77, "word": "Select", "start": 31.289999}, {"end": 32.09, "word": "any", "start": 31.77}, {"end": 32.59, "word": "highlighted", "start": 32.09}, {"end": 33.23, "word": "region", "start": 32.73}, {"end": 33.45, "word": "to", "start": 33.29}, {"end": 33.93, "word": "discover", "start": 33.45}, {"end": 34.25, "word": "more", "start": 33.93}, {"end": 34.57, "word": "about", "start": 34.25}, {"end": 34.73, "word": "the", "start": 34.57}, {"end": 35.21, "word": "traders", "start": 34.73}, {"end": 35.45, "word": "and", "start": 35.21}, {"end": 35.95, "word": "kingdoms", "start": 35.45}, {"end": 36.25, "word": "that", "start": 36.01}, {"end": 36.57, "word": "once", "start": 36.25}, {"end": 36.89, "word": "shaped", "start": 36.57}, {"end": 37.13, "word": "our", "start": 36.89}, {"end": 37.63, "word": "shores.", "start": 37.13}]);
    
    const subtitle3 = JSON.stringify([{"end": 0.39999998, "word": "You", "start": 0.16}, {"end": 0.48, "word": "are", "start": 0.39999998}, {"end": 0.88, "word": "now", "start": 0.48}, {"end": 1.28, "word": "entering", "start": 0.88}, {"end": 1.52, "word": "the", "start": 1.28}, {"end": 2.02, "word": "wartime", "start": 1.52}, {"end": 2.58, "word": "bunker.", "start": 2.08}, {"end": 3.4399998, "word": "In", "start": 3.04}, {"end": 3.9399998, "word": "nineteen", "start": 3.4399998}, {"end": 4.3199997, "word": "forty", "start": 4}, {"end": 4.8199997, "word": "two,", "start": 4.3199997}, {"end": 5.54, "word": "Singapore", "start": 5.04}, {"end": 6.08, "word": "faced", "start": 5.7599998}, {"end": 6.24, "word": "one", "start": 6.08}, {"end": 6.3999996, "word": "of", "start": 6.24}, {"end": 6.72, "word": "its", "start": 6.3999996}, {"end": 7.2, "word": "darkest", "start": 6.72}, {"end": 7.7, "word": "chapters", "start": 7.2}, {"end": 7.9199996, "word": "as", "start": 7.8399997}, {"end": 8.16, "word": "the", "start": 7.9199996}, {"end": 8.66, "word": "Japanese", "start": 8.16}, {"end": 9.22, "word": "invasion", "start": 8.72}, {"end": 10.099999, "word": "intensified.", "start": 9.599999}, {"end": 11.5199995, "word": "Within", "start": 11.04}, {"end": 12.0199995, "word": "bunkers", "start": 11.5199995}, {"end": 12.24, "word": "like", "start": 12.08}, {"end": 12.74, "word": "this,", "start": 12.24}, {"end": 13.395, "word": "soldiers", "start": 12.96}, {"end": 14.135, "word": "coordinated", "start": 13.635}, {"end": 14.8550005, "word": "defenses,", "start": 14.3550005}, {"end": 15.975, "word": "civilians", "start": 15.475}, {"end": 16.515, "word": "sought", "start": 16.275}, {"end": 17.015, "word": "shelter,", "start": 16.515}, {"end": 17.555, "word": "and", "start": 17.235}, {"end": 18.055, "word": "uncertainty", "start": 17.555}, {"end": 18.675, "word": "filled", "start": 18.355}, {"end": 18.755001, "word": "the", "start": 18.675}, {"end": 19.255001, "word": "air.", "start": 18.755001}, {"end": 19.875, "word": "As", "start": 19.635}, {"end": 20.035, "word": "you", "start": 19.875}, {"end": 20.275, "word": "look", "start": 20.035}, {"end": 20.775, "word": "around,", "start": 20.275}, {"end": 21.475, "word": "take", "start": 21.155}, {"end": 21.715, "word": "note", "start": 21.475}, {"end": 21.875, "word": "of", "start": 21.715}, {"end": 22.035, "word": "the", "start": 21.875}, {"end": 22.535, "word": "messages,", "start": 22.035}, {"end": 23.575, "word": "maps,", "start": 23.075}, {"end": 24.035, "word": "and", "start": 23.715}, {"end": 24.515, "word": "equipment", "start": 24.035}, {"end": 24.755001, "word": "that", "start": 24.515}, {"end": 25.235, "word": "reveal", "start": 24.755001}, {"end": 25.395, "word": "the", "start": 25.235}, {"end": 25.895, "word": "difficult", "start": 25.395}, {"end": 26.455, "word": "decisions", "start": 25.955}, {"end": 26.994999, "word": "made", "start": 26.595001}, {"end": 27.315, "word": "during", "start": 26.994999}, {"end": 27.555, "word": "this", "start": 27.315}, {"end": 28.055, "word": "time.", "start": 27.555}, {"end": 28.924936, "word": "Tap", "start": 28.684937}, {"end": 29.324936, "word": "any", "start": 28.924936}, {"end": 29.824936, "word": "highlighted", "start": 29.324936}, {"end": 30.364937, "word": "panel", "start": 29.884937}, {"end": 30.524937, "word": "to", "start": 30.364937}, {"end": 31.024937, "word": "discover", "start": 30.524937}, {"end": 31.404938, "word": "key", "start": 31.084936}, {"end": 31.884937, "word": "events", "start": 31.404938}, {"end": 32.044937, "word": "that", "start": 31.884937}, {"end": 32.364937, "word": "shaped", "start": 32.044937}, {"end": 32.44494, "word": "the", "start": 32.364937}, {"end": 32.844936, "word": "battle", "start": 32.44494}, {"end": 33.084938, "word": "for", "start": 32.844936}, {"end": 33.584938, "word": "Singapore.", "start": 33.084938}]);
    
    const subtitle4 = JSON.stringify([{"end": 0.48, "word": "This", "start": 0.24}, {"end": 0.71999997, "word": "is", "start": 0.48}, {"end": 0.88, "word": "the", "start": 0.71999997}, {"end": 1.28, "word": "faces", "start": 0.88}, {"end": 1.52, "word": "of", "start": 1.28}, {"end": 1.76, "word": "the", "start": 1.52}, {"end": 2.26, "word": "occupation", "start": 1.76}, {"end": 3.06, "word": "story", "start": 2.56}, {"end": 3.62, "word": "wall.", "start": 3.12}, {"end": 4.24, "word": "During", "start": 3.9199998}, {"end": 4.48, "word": "the", "start": 4.24}, {"end": 4.98, "word": "Japanese", "start": 4.48}, {"end": 5.7, "word": "occupation,", "start": 5.2}, {"end": 6.8799996, "word": "ordinary", "start": 6.3999996}, {"end": 7.3599997, "word": "people", "start": 6.8799996}, {"end": 7.8599997, "word": "endured", "start": 7.3599997}, {"end": 8.42, "word": "hardship,", "start": 7.9199996}, {"end": 9.38, "word": "loss,", "start": 8.88}, {"end": 9.92, "word": "and", "start": 9.44}, {"end": 10.42, "word": "uncertainty.", "start": 9.92}, {"end": 11.679999, "word": "Each", "start": 11.36}, {"end": 12.179999, "word": "portrait", "start": 11.679999}, {"end": 12.48, "word": "you", "start": 12.32}, {"end": 12.799999, "word": "see", "start": 12.48}, {"end": 13.299999, "word": "represents", "start": 12.799999}, {"end": 13.575, "word": "a", "start": 13.415}, {"end": 13.815, "word": "real", "start": 13.575}, {"end": 14.315, "word": "individual", "start": 13.815}, {"end": 14.855, "word": "whose", "start": 14.535}, {"end": 15.175, "word": "life", "start": 14.855}, {"end": 15.415, "word": "was", "start": 15.175}, {"end": 15.915, "word": "transformed", "start": 15.415}, {"end": 16.375, "word": "by", "start": 16.055}, {"end": 16.875, "word": "war.", "start": 16.375}, {"end": 17.895, "word": "Select", "start": 17.415}, {"end": 18.135, "word": "any", "start": 17.895}, {"end": 18.455, "word": "face", "start": 18.135}, {"end": 18.695, "word": "to", "start": 18.455}, {"end": 18.935, "word": "hear", "start": 18.695}, {"end": 19.255001, "word": "their", "start": 18.935}, {"end": 19.755001, "word": "story,", "start": 19.255001}, {"end": 20.135, "word": "how", "start": 19.895}, {"end": 20.455, "word": "they", "start": 20.135}, {"end": 20.955, "word": "lived,", "start": 20.455}, {"end": 21.595, "word": "adapted,", "start": 21.095}, {"end": 22.295, "word": "and", "start": 21.895}, {"end": 22.694937, "word": "persevere", "start": 22.295}, {"end": 23.334936, "word": "during", "start": 23.014936}, {"end": 23.494936, "word": "one", "start": 23.334936}, {"end": 23.814938, "word": "of", "start": 23.494936}, {"end": 24.314938, "word": "Singapore's", "start": 23.814938}, {"end": 24.694937, "word": "most", "start": 24.374937}, {"end": 25.194937, "word": "challenging", "start": 24.694937}, {"end": 25.834936, "word": "periods.", "start": 25.334936}, {"end": 26.934937, "word": "These", "start": 26.614937}, {"end": 27.414936, "word": "personal", "start": 26.934937}, {"end": 27.914936, "word": "accounts", "start": 27.414936}, {"end": 28.294937, "word": "remind", "start": 27.974937}, {"end": 28.534937, "word": "us", "start": 28.294937}, {"end": 28.854937, "word": "that", "start": 28.534937}, {"end": 29.254936, "word": "history", "start": 28.854937}, {"end": 29.414936, "word": "is", "start": 29.254936}, {"end": 29.654938, "word": "not", "start": 29.414936}, {"end": 29.974937, "word": "just", "start": 29.654938}, {"end": 30.294937, "word": "dates", "start": 29.974937}, {"end": 30.534937, "word": "and", "start": 30.294937}, {"end": 31.034937, "word": "events,", "start": 30.534937}, {"end": 31.654938, "word": "but", "start": 31.414936}, {"end": 32.054935, "word": "the", "start": 31.654938}, {"end": 32.554935, "word": "experiences", "start": 32.054935}, {"end": 32.934937, "word": "of", "start": 32.774937}, {"end": 33.254936, "word": "people", "start": 32.934937}, {"end": 33.494938, "word": "who", "start": 33.254936}, {"end": 33.814938, "word": "lived", "start": 33.494938}, {"end": 34.054935, "word": "through", "start": 33.814938}, {"end": 34.554935, "word": "them.", "start": 34.054935}]);
    
    const subtitle5 = JSON.stringify([{"end": 0.71999997, "word": "Welcome", "start": 0.32}, {"end": 0.88, "word": "to", "start": 0.71999997}, {"end": 1.38, "word": "Project", "start": 0.88}, {"end": 1.9399999, "word": "INC.", "start": 1.4399999}, {"end": 2.98, "word": "Industry", "start": 2.48}, {"end": 3.4399998, "word": "Now", "start": 3.04}, {"end": 3.9399998, "word": "Curriculum.", "start": 3.4399998}, {"end": 4.7999997, "word": "You", "start": 4.56}, {"end": 4.96, "word": "are", "start": 4.7999997}, {"end": 5.3599997, "word": "now", "start": 4.96}, {"end": 5.8399997, "word": "standing", "start": 5.3599997}, {"end": 6, "word": "in", "start": 5.8399997}, {"end": 6.16, "word": "the", "start": 6}, {"end": 6.66, "word": "heartbeat", "start": 6.16}, {"end": 6.8799996, "word": "of", "start": 6.72}, {"end": 7.04, "word": "the", "start": 6.8799996}, {"end": 7.44, "word": "School", "start": 7.04}, {"end": 7.68, "word": "of", "start": 7.44}, {"end": 8.18, "word": "Computing's", "start": 7.68}, {"end": 8.82, "word": "practical", "start": 8.32}, {"end": 9.38, "word": "training.", "start": 8.88}, {"end": 10.16, "word": "This", "start": 9.92}, {"end": 10.4, "word": "is", "start": 10.16}, {"end": 10.639999, "word": "not", "start": 10.4}, {"end": 10.8, "word": "a", "start": 10.639999}, {"end": 11.28, "word": "typical", "start": 10.8}, {"end": 11.78, "word": "classroom.", "start": 11.28}, {"end": 12.825, "word": "It's", "start": 12.585}, {"end": 13.065001, "word": "a", "start": 12.825}, {"end": 13.565001, "word": "simulated", "start": 13.065001}, {"end": 14.365, "word": "software", "start": 13.865}, {"end": 14.925, "word": "house,", "start": 14.425}, {"end": 15.305, "word": "designed", "start": 14.985001}, {"end": 15.465, "word": "to", "start": 15.305}, {"end": 15.705, "word": "turn", "start": 15.465}, {"end": 15.945, "word": "you", "start": 15.705}, {"end": 16.185, "word": "from", "start": 15.945}, {"end": 16.345001, "word": "a", "start": 16.185}, {"end": 16.825, "word": "student", "start": 16.345001}, {"end": 17.065, "word": "into", "start": 16.825}, {"end": 17.225, "word": "a", "start": 17.065}, {"end": 17.725, "word": "professional", "start": 17.225}, {"end": 18.525, "word": "software", "start": 18.025}, {"end": 19.085, "word": "developer.", "start": 18.585}, {"end": 20.265, "word": "Forget", "start": 19.785}, {"end": 20.765, "word": "hypothetical", "start": 20.265}, {"end": 21.805, "word": "assignments.", "start": 21.305}, {"end": 23.005001, "word": "Project", "start": 22.505001}, {"end": 23.865, "word": "INC", "start": 23.465}, {"end": 24.025, "word": "is", "start": 23.865}, {"end": 24.265, "word": "where", "start": 24.025}, {"end": 24.425, "word": "you", "start": 24.265}, {"end": 24.744999, "word": "work", "start": 24.425}, {"end": 24.904999, "word": "on", "start": 24.744999}, {"end": 25.404999, "word": "real,", "start": 24.904999}, {"end": 26.025, "word": "client-paid", "start": 25.705}, {"end": 26.845001, "word": "projects,", "start": 26.345001}, {"end": 27.87, "word": "solutions", "start": 27.385}, {"end": 28.35, "word": "for", "start": 28.19}, {"end": 28.83, "word": "actual", "start": 28.35}, {"end": 29.33, "word": "industry", "start": 28.83}, {"end": 29.890001, "word": "partners,", "start": 29.390001}, {"end": 30.75, "word": "government", "start": 30.35}, {"end": 31.25, "word": "agencies", "start": 30.75}, {"end": 31.710001, "word": "like", "start": 31.470001}, {"end": 32.21, "word": "GovTech,", "start": 31.710001}, {"end": 32.91, "word": "and", "start": 32.59}, {"end": 33.39, "word": "major", "start": 32.91}, {"end": 33.63, "word": "tech", "start": 33.39}, {"end": 34.13, "word": "companies.", "start": 33.63}, {"end": 35.15, "word": "Sound", "start": 34.99}, {"end": 35.39, "word": "of", "start": 35.15}, {"end": 35.89, "word": "light,", "start": 35.39}, {"end": 36.85, "word": "fast", "start": 36.35}, {"end": 37.39, "word": "keyboard", "start": 36.91}, {"end": 37.89, "word": "typing.", "start": 37.39}, {"end": 38.510002, "word": "We", "start": 38.35}, {"end": 38.75, "word": "don't", "start": 38.510002}, {"end": 39.07, "word": "just", "start": 38.75}, {"end": 39.31, "word": "teach", "start": 39.07}, {"end": 39.63, "word": "you", "start": 39.31}, {"end": 40.13, "word": "skills.", "start": 39.63}, {"end": 40.83, "word": "We", "start": 40.59}, {"end": 41.07, "word": "give", "start": 40.83}, {"end": 41.23, "word": "you", "start": 41.07}, {"end": 41.39, "word": "a", "start": 41.23}, {"end": 41.89, "word": "job.", "start": 41.39}, {"end": 42.475002, "word": "You", "start": 42.235}, {"end": 42.715, "word": "will", "start": 42.475002}, {"end": 43.195, "word": "apply", "start": 42.715}, {"end": 43.695, "word": "Agile", "start": 43.195}, {"end": 44.255, "word": "methodologies,", "start": 43.755}, {"end": 45.435, "word": "manage", "start": 44.955}, {"end": 45.935, "word": "timelines,", "start": 45.435}, {"end": 46.555, "word": "and", "start": 46.315002}, {"end": 47.055, "word": "engage", "start": 46.555}, {"end": 47.675, "word": "directly", "start": 47.195}, {"end": 47.915, "word": "with", "start": 47.675}, {"end": 48.415, "word": "clients,", "start": 47.915}, {"end": 49.115, "word": "just", "start": 48.875}, {"end": 49.355, "word": "like", "start": 49.115}, {"end": 49.515, "word": "you", "start": 49.355}, {"end": 49.755, "word": "would", "start": 49.515}, {"end": 49.915, "word": "in", "start": 49.755}, {"end": 49.995, "word": "a", "start": 49.915}, {"end": 50.395, "word": "real", "start": 49.995}, {"end": 50.895, "word": "company.", "start": 50.395}, {"end": 51.595, "word": "It's", "start": 51.355}, {"end": 51.835, "word": "the", "start": 51.595}, {"end": 52.315002, "word": "ultimate", "start": 51.835}, {"end": 52.795, "word": "proving", "start": 52.315002}, {"end": 53.115, "word": "ground", "start": 52.795}, {"end": 53.275, "word": "for", "start": 53.115}, {"end": 53.515, "word": "your", "start": 53.275}, {"end": 53.915, "word": "tech", "start": 53.515}, {"end": 54.415, "word": "career.", "start": 53.915}])
    
    const subtitle6 = JSON.stringify([{"end":0.71999997,"word":"Welcome","start":0.32},{"end":0.88,"word":"to","start":0.71999997},{"end":1.12,"word":"the","start":0.88},{"end":1.4399999,"word":"School","start":1.12},{"end":1.68,"word":"of","start":1.4399999},{"end":2.1799998,"word":"Computing","start":1.68},{"end":2.82,"word":"registration","start":2.32},{"end":3.62,"word":"booth.","start":3.12},{"end":4.34,"word":"Here,","start":3.84},{"end":4.88,"word":"you'll","start":4.48},{"end":5.38,"word":"discover","start":4.88},{"end":5.92,"word":"everything","start":5.52},{"end":6.08,"word":"that","start":5.92},{"end":6.48,"word":"makes","start":6.08},{"end":6.98,"word":"Singapore","start":6.48},{"end":7.62,"word":"Polytechnic","start":7.12},{"end":8.08,"word":"a","start":7.9199996},{"end":8.48,"word":"leader","start":8.08},{"end":8.72,"word":"in","start":8.48},{"end":9.22,"word":"technology","start":8.72},{"end":9.94,"word":"education.","start":9.44},{"end":11.2,"word":"Learn","start":10.88},{"end":11.5199995,"word":"about","start":11.2},{"end":11.84,"word":"our","start":11.5199995},{"end":12.08,"word":"state","start":11.84},{"end":12.24,"word":"of","start":12.08},{"end":12.4,"word":"the","start":12.24},{"end":12.719999,"word":"art","start":12.4},{"end":12.975,"word":"labs,","start":12.719999},{"end":13.935,"word":"hands","start":13.535001},{"end":14.175,"word":"on","start":13.935},{"end":14.675,"word":"learning","start":14.175},{"end":15.235001,"word":"environment,","start":14.735001},{"end":15.935,"word":"and","start":15.695001},{"end":16.175,"word":"the","start":15.935},{"end":16.675,"word":"exciting","start":16.175},{"end":17.295,"word":"diploma","start":16.815},{"end":17.795,"word":"programs","start":17.295},{"end":18.095001,"word":"we","start":17.935001},{"end":18.595001,"word":"offer.","start":18.095001},{"end":19.375,"word":"From","start":19.055},{"end":19.875,"word":"artificial","start":19.375},{"end":20.595001,"word":"intelligence","start":20.095001},{"end":20.975,"word":"and","start":20.735},{"end":21.475,"word":"cybersecurity","start":20.975},{"end":22.335,"word":"to","start":22.175},{"end":22.835,"word":"software","start":22.335},{"end":23.455,"word":"development","start":22.975},{"end":23.695,"word":"and","start":23.455},{"end":24.195,"word":"immersive","start":23.695},{"end":24.835,"word":"media,","start":24.335},{"end":25.295,"word":"our","start":25.135},{"end":25.775,"word":"courses","start":25.295},{"end":25.935001,"word":"are","start":25.775},{"end":26.335,"word":"designed","start":25.935001},{"end":26.494999,"word":"to","start":26.335},{"end":26.895,"word":"prepare","start":26.494999},{"end":27.135,"word":"you","start":26.895},{"end":27.375,"word":"for","start":27.135},{"end":27.535,"word":"the","start":27.375},{"end":27.935001,"word":"future","start":27.535},{"end":28.175,"word":"of","start":27.935001},{"end":28.675,"word":"tech.","start":28.175},{"end":29.43,"word":"Find","start":29.27},{"end":29.67,"word":"out","start":29.43},{"end":30.070002,"word":"more","start":29.67},{"end":30.470001,"word":"about","start":30.070002},{"end":30.79,"word":"our","start":30.470001},{"end":31.27,"word":"industry","start":30.79},{"end":31.77,"word":"partnerships,","start":31.27},{"end":32.71,"word":"real","start":32.39},{"end":33.190002,"word":"world","start":32.71},{"end":33.690002,"word":"projects,","start":33.190002},{"end":34.31,"word":"and","start":33.99},{"end":34.81,"word":"internship","start":34.31},{"end":35.53,"word":"opportunities","start":35.03},{"end":35.99,"word":"that","start":35.75},{"end":36.31,"word":"help","start":35.99},{"end":36.47,"word":"our","start":36.31},{"end":36.95,"word":"students","start":36.47},{"end":37.27,"word":"gain","start":36.95},{"end":37.77,"word":"valuable","start":37.27},{"end":38.49,"word":"experience.","start":37.99}]);

    const subtitle7 = JSON.stringify([{"end":0.56,"word":"Welcome","start":0.24},{"end":0.79999995,"word":"to","start":0.56},{"end":1.04,"word":"the","start":0.79999995},{"end":1.4399999,"word":"course","start":1.04},{"end":1.9399999,"word":"counseling","start":1.4399999},{"end":2.32,"word":"booth","start":2},{"end":2.56,"word":"at","start":2.32},{"end":3.06,"word":"Singapore","start":2.56},{"end":3.6999998,"word":"Polytechnic.","start":3.1999998},{"end":4.96,"word":"Learn","start":4.64},{"end":5.2799997,"word":"more","start":4.96},{"end":5.7599998,"word":"about","start":5.2799997},{"end":6,"word":"our","start":5.7599998},{"end":6.5,"word":"counseling","start":6},{"end":7.12,"word":"options","start":6.64},{"end":7.3599997,"word":"and","start":7.12},{"end":7.68,"word":"get","start":7.3599997},{"end":8.18,"word":"personalized","start":7.68},{"end":8.98,"word":"guidance","start":8.48},{"end":9.28,"word":"on","start":9.04},{"end":9.679999,"word":"choosing","start":9.28},{"end":9.84,"word":"the","start":9.679999},{"end":10.16,"word":"right","start":9.84},{"end":10.66,"word":"diploma","start":10.16},{"end":11.3,"word":"program","start":10.8},{"end":11.86,"word":"that","start":11.36},{"end":12.895,"word":"matches","start":12.415},{"end":13.215,"word":"your","start":12.895},{"end":13.695001,"word":"interests","start":13.215},{"end":14.015,"word":"and","start":13.695001},{"end":14.415,"word":"career","start":14.015},{"end":14.915,"word":"goals.","start":14.415},{"end":15.695,"word":"Our","start":15.375},{"end":16.195,"word":"experienced","start":15.695},{"end":16.995,"word":"counselors","start":16.495},{"end":17.295,"word":"are","start":17.135},{"end":17.535,"word":"here","start":17.295},{"end":17.615,"word":"to","start":17.535},{"end":17.855,"word":"help","start":17.615},{"end":18.095001,"word":"you","start":17.855},{"end":18.595001,"word":"navigate","start":18.095001},{"end":19.135,"word":"course","start":18.655},{"end":19.635,"word":"requirements,","start":19.135},{"end":20.755001,"word":"application","start":20.255001},{"end":21.555,"word":"processes,","start":21.055},{"end":22.175,"word":"and","start":21.935001},{"end":22.675,"word":"scholarship","start":22.175},{"end":23.395,"word":"opportunities.","start":22.895},{"end":25.05,"word":"Singapore","start":24.55},{"end":25.689999,"word":"Polytechnic","start":25.189999},{"end":26.47,"word":"course","start":25.99},{"end":26.829998,"word":"counseling","start":26.47},{"end":27.189999,"word":"is","start":26.829998},{"end":27.43,"word":"your","start":27.189999},{"end":27.67,"word":"guide","start":27.43},{"end":27.91,"word":"to","start":27.67},{"end":28.41,"word":"success.","start":27.91},{"end":29.349998,"word":"Our","start":29.029999},{"end":29.849998,"word":"dedicated","start":29.349998},{"end":30.65,"word":"counseling","start":30.15},{"end":31.189999,"word":"team","start":30.789999},{"end":31.689999,"word":"provides","start":31.189999},{"end":32.25,"word":"comprehensive","start":31.75},{"end":33.11,"word":"support","start":32.629997},{"end":33.35,"word":"for","start":33.11},{"end":33.85,"word":"prospective","start":33.35},{"end":34.65,"word":"students.","start":34.15},{"end":35.67,"word":"Learn","start":35.35},{"end":36.07,"word":"about","start":35.67},{"end":36.47,"word":"entry","start":36.07},{"end":36.97,"word":"requirements","start":36.47},{"end":37.35,"word":"for","start":37.11},{"end":37.75,"word":"different","start":37.35},{"end":38.25,"word":"diploma","start":37.75},{"end":38.89,"word":"courses,","start":38.39},{"end":39.705,"word":"understand","start":39.27},{"end":40.185,"word":"the","start":40.105003},{"end":40.685,"word":"application","start":40.185},{"end":41.405003,"word":"timeline,","start":40.905003},{"end":42.445004,"word":"explore","start":41.945004},{"end":43.005,"word":"financial","start":42.505},{"end":43.305,"word":"aid","start":43.065002},{"end":43.805,"word":"options,","start":43.305},{"end":44.345,"word":"and","start":44.025},{"end":44.845,"word":"discover","start":44.345},{"end":45.405003,"word":"career","start":44.905003},{"end":45.965,"word":"pathways","start":45.465},{"end":46.425003,"word":"after","start":46.025},{"end":46.925003,"word":"graduation.","start":46.425003},{"end":48.105003,"word":"Whether","start":47.785004},{"end":48.265,"word":"you","start":48.105003},{"end":48.505,"word":"are","start":48.265},{"end":49.005,"word":"interested","start":48.505},{"end":49.305,"word":"in","start":49.065002},{"end":49.805,"word":"engineering,","start":49.305},{"end":51.005,"word":"business,","start":50.505},{"end":51.965,"word":"design,","start":51.465},{"end":52.745003,"word":"health","start":52.345},{"end":53.245003,"word":"sciences,","start":52.745003},{"end":53.945,"word":"or","start":53.625},{"end":54.445,"word":"computing,","start":53.945},{"end":55.38,"word":"our","start":55.140003},{"end":55.88,"word":"counselors","start":55.38},{"end":56.18,"word":"will","start":55.940002},{"end":56.420002,"word":"help","start":56.18},{"end":56.58,"word":"you","start":56.420002},{"end":56.9,"word":"make","start":56.58},{"end":57.38,"word":"informed","start":56.9},{"end":57.88,"word":"decisions","start":57.38},{"end":58.34,"word":"about","start":58.02},{"end":58.58,"word":"your","start":58.34},{"end":59.08,"word":"educational","start":58.58},{"end":59.88,"word":"journey.","start":59.38},{"end":60.82,"word":"Book","start":60.34},{"end":61.06,"word":"a","start":60.82},{"end":61.38,"word":"one","start":61.06},{"end":61.620003,"word":"on","start":61.38},{"end":61.940002,"word":"one","start":61.620003},{"end":62.34,"word":"session","start":61.940002},{"end":62.82,"word":"today","start":62.34},{"end":62.980003,"word":"to","start":62.82},{"end":63.38,"word":"discuss","start":62.980003},{"end":63.780003,"word":"your","start":63.38},{"end":64.28,"word":"aspirations","start":63.780003},{"end":64.82,"word":"and","start":64.58},{"end":65.14,"word":"find","start":64.82},{"end":65.3,"word":"the","start":65.14},{"end":65.78,"word":"perfect","start":65.3},{"end":66.18,"word":"course","start":65.78},{"end":66.42,"word":"for","start":66.18},{"end":66.92,"word":"you.","start":66.42}]);
    
    const subtitle8 = JSON.stringify([{"start":0.08,"end":0.16,"word":"欢"},{"start":0.24,"end":0.39999998,"word":"迎"},{"start":0.52,"end":0.64,"word":"来"},{"start":0.84,"end":1.04,"word":"到"},{"start":1.12,"end":1.36,"word":"新"},{"start":1.4399999,"end":1.5999999,"word":"加"},{"start":1.68,"end":1.8,"word":"坡"},{"start":1.92,"end":2.04,"word":"理"},{"start":2.1599998,"end":2.2799997,"word":"工"},{"start":2.3999999,"end":2.52,"word":"学"},{"start":2.6399999,"end":2.8,"word":"院"},{"start":2.8799999,"end":3,"word":"的"},{"start":3.12,"end":3.36,"word":"课"},{"start":3.4399998,"end":3.56,"word":"程"},{"start":3.6799998,"end":3.84,"word":"咨"},{"start":3.9199998,"end":4.16,"word":"询"},{"start":4.24,"end":4.98,"word":"展位"},{"start":5.3599997,"end":5.4399996,"word":"在"},{"start":5.52,"end":5.68,"word":"这"},{"start":5.8399997,"end":6.3399997,"word":"里"},{"start":6.56,"end":6.7999997,"word":"您"},{"start":6.8799996,"end":7.04,"word":"可"},{"start":7.12,"end":7.2799997,"word":"以"},{"start":7.3599997,"end":7.4399996,"word":"了"},{"start":7.52,"end":7.7599998,"word":"解"},{"start":7.8399997,"end":8.08,"word":"我"},{"start":8,"end":8.16,"word":"们"},{"start":8.32,"end":8.44,"word":"的"},{"start":8.559999,"end":8.88,"word":"课程"},{"start":8.96,"end":9.08,"word":"咨"},{"start":9.2,"end":9.36,"word":"询"},{"start":9.5199995,"end":9.599999,"word":"服"},{"start":9.679999,"end":10.039999,"word":"务"},{"start":10.4,"end":10.639999,"word":"并"},{"start":10.719999,"end":10.84,"word":"获"},{"start":10.96,"end":11.2,"word":"得"},{"start":11.28,"end":11.44,"word":"个"},{"start":11.5199995,"end":11.599999,"word":"性"},{"start":11.679999,"end":11.92,"word":"化"},{"start":12,"end":12.08,"word":"的"},{"start":12.16,"end":12.32,"word":"指导"},{"start":12.4,"end":12.795,"word":"帮助"},{"start":13.275,"end":13.435,"word":"您"},{"start":13.515,"end":13.835,"word":"选择"},{"start":13.915,"end":14.035,"word":"最"},{"start":14.155,"end":14.395,"word":"适"},{"start":14.475,"end":14.715,"word":"合"},{"start":15.035,"end":15.515,"word":"您"},{"start":15.275,"end":15.715,"word":"兴趣"},{"start":15.835,"end":16.155,"word":"和"},{"start":16.235,"end":16.355,"word":"未来"},{"start":16.475,"end":16.595001,"word":"职业"},{"start":16.715,"end":16.955,"word":"发展"},{"start":17.035,"end":17.115,"word":"的"},{"start":17.154999,"end":18.315,"word":"文凭课程"},{"start":18.955,"end":20.235,"word":"我们的专业课程顾问将协助您了解课程要求申请流程以及奖学金机会"},{"start":20.635,"end":21.755001,"word":"并提供全方位支持"}]);

    const subtitle9 = JSON.stringify([{"end": 0.19999999, "word": "欢", "start": 0.16}, {"end": 0.35999998, "word": "迎", "start": 0.24}, {"end": 0.79999995, "word": "来", "start": 0.48}, {"end": 0.96, "word": "到", "start": 0.88}, {"end": 1.36, "word": "课", "start": 1.12}, {"end": 1.56, "word": "程", "start": 1.4399999}, {"end": 1.92, "word": "业", "start": 1.68}, {"end": 2.1599998, "word": "界", "start": 2}, {"end": 2.56, "word": "当", "start": 2.32}, {"end": 2.7599998, "word": "下", "start": 2.6399999}, {"end": 3.12, "word": "课", "start": 2.8799999}, {"end": 3.3199997, "word": "程", "start": 3.1999998}, {"end": 3.56, "word": "项", "start": 3.4399998}, {"end": 3.84, "word": "目", "start": 3.6799998}, {"end": 4.24, "word": "你", "start": 4}, {"end": 4.3999996, "word": "现", "start": 4.3199997}, {"end": 4.7999997, "word": "在", "start": 4.48}, {"end": 5.04, "word": "正", "start": 4.88}, {"end": 5.2799997, "word": "站", "start": 5.12}, {"end": 5.6, "word": "在", "start": 5.3599997}, {"end": 5.7599998, "word": "计", "start": 5.68}, {"end": 6.08, "word": "算", "start": 5.8399997}, {"end": 6.3199997, "word": "机", "start": 6.16}, {"end": 6.4799995, "word": "学", "start": 6.3999996}, {"end": 6.7999997, "word": "院", "start": 6.56}, {"end": 7.12, "word": "实", "start": 6.8799996}, {"end": 7.3199997, "word": "践", "start": 7.2}, {"end": 7.56, "word": "培", "start": 7.44}, {"end": 7.8399997, "word": "训", "start": 7.68}, {"end": 8.04, "word": "的", "start": 7.9199996}, {"end": 8.4, "word": "心", "start": 8.16}, {"end": 8.72, "word": "跳", "start": 8.48}, {"end": 9.04, "word": "中", "start": 8.8}, {"end": 9.24, "word": "这", "start": 9.2}, {"end": 9.44, "word": "不", "start": 9.28}, {"end": 9.599999, "word": "是", "start": 9.5199995}, {"end": 9.84, "word": "一", "start": 9.679999}, {"end": 10.08, "word": "个", "start": 9.92}, {"end": 10.32, "word": "典", "start": 10.16}, {"end": 10.559999, "word": "型", "start": 10.48}, {"end": 10.8, "word": "的", "start": 10.639999}, {"end": 11, "word": "教", "start": 10.88}, {"end": 11.28, "word": "室", "start": 11.12}, {"end": 11.599999, "word": "这", "start": 11.44}, {"end": 11.84, "word": "是", "start": 11.679999}, {"end": 12, "word": "一", "start": 11.92}, {"end": 12.24, "word": "个", "start": 12.08}, {"end": 12.48, "word": "模", "start": 12.32}, {"end": 12.719999, "word": "拟", "start": 12.559999}, {"end": 13.04, "word": "软", "start": 12.799999}, {"end": 13.28, "word": "体", "start": 13.12}, {"end": 13.605, "word": "公", "start": 13.36}, {"end": 13.891071, "word": "司", "start": 13.748035}, {"end": 14.177142, "word": "旨", "start": 14.034107}, {"end": 14.463214, "word": "在", "start": 14.320178}, {"end": 14.749286, "word": "将", "start": 14.60625}, {"end": 15.0353565, "word": "您", "start": 14.892321}, {"end": 15.321428, "word": "从", "start": 15.178392}, {"end": 15.6075, "word": "学", "start": 15.464464}, {"end": 15.893571, "word": "生", "start": 15.750536}, {"end": 16.179642, "word": "转", "start": 16.036606}, {"end": 16.465714, "word": "变", "start": 16.322678}, {"end": 16.751785, "word": "为", "start": 16.60875}, {"end": 17.037857, "word": "专", "start": 16.894821}, {"end": 17.323929, "word": "业", "start": 17.180893}, {"end": 17.61, "word": "软", "start": 17.466965}, {"end": 17.896072, "word": "体", "start": 17.753036}, {"end": 18.182142, "word": "开", "start": 18.039106}, {"end": 18.468214, "word": "发", "start": 18.325178}, {"end": 18.754286, "word": "人", "start": 18.61125}, {"end": 19.040358, "word": "员", "start": 18.897322}, {"end": 19.326427, "word": "忘", "start": 19.183393}, {"end": 19.6125, "word": "记", "start": 19.469463}, {"end": 19.898571, "word": "假", "start": 19.755535}, {"end": 20.184643, "word": "设", "start": 20.041607}, {"end": 20.470715, "word": "的", "start": 20.327679}, {"end": 20.756786, "word": "任", "start": 20.61375}, {"end": 21.042858, "word": "务", "start": 20.899822}, {"end": 21.328928, "word": "是", "start": 21.185894}, {"end": 21.615, "word": "您", "start": 21.471964}, {"end": 21.901072, "word": "从", "start": 21.758036}, {"end": 22.187143, "word": "事", "start": 22.044107}, {"end": 22.473213, "word": "真", "start": 22.33018}, {"end": 22.759285, "word": "实", "start": 22.61625}, {"end": 23.045357, "word": "客", "start": 22.90232}, {"end": 23.331429, "word": "户", "start": 23.188393}, {"end": 23.6175, "word": "付", "start": 23.474464}, {"end": 23.903572, "word": "费", "start": 23.760536}, {"end": 24.189644, "word": "项", "start": 24.046608}, {"end": 24.475716, "word": "目", "start": 24.33268}, {"end": 24.761787, "word": "的", "start": 24.618752}, {"end": 25.047857, "word": "地", "start": 24.904821}, {"end": 25.33393, "word": "方", "start": 25.190893}, {"end": 25.62, "word": "为", "start": 25.476965}, {"end": 25.877813, "word": "实", "start": 25.748907}, {"end": 26.135626, "word": "际", "start": 26.00672}, {"end": 26.393438, "word": "的", "start": 26.264532}, {"end": 26.65125, "word": "行", "start": 26.522345}, {"end": 26.909063, "word": "业", "start": 26.780157}, {"end": 27.166876, "word": "合", "start": 27.03797}, {"end": 27.424688, "word": "作", "start": 27.295782}, {"end": 27.6825, "word": "伙", "start": 27.553595}, {"end": 27.940313, "word": "伴", "start": 27.811407}, {"end": 28.198126, "word": "政", "start": 28.06922}, {"end": 28.455938, "word": "府", "start": 28.327032}, {"end": 28.71375, "word": "机", "start": 28.584845}, {"end": 28.971563, "word": "构", "start": 28.842657}, {"end": 29.229376, "word": "和", "start": 29.10047}, {"end": 29.487188, "word": "大", "start": 29.358282}, {"end": 29.745, "word": "型", "start": 29.616095}, {"end": 30.002813, "word": "科", "start": 29.873907}, {"end": 30.260626, "word": "技", "start": 30.13172}, {"end": 30.518438, "word": "公", "start": 30.389532}, {"end": 30.77625, "word": "司", "start": 30.647345}, {"end": 31.034063, "word": "提", "start": 30.905157}, {"end": 31.291876, "word": "供", "start": 31.16297}, {"end": 31.549688, "word": "解", "start": 31.420782}, {"end": 31.807499, "word": "决", "start": 31.678595}, {"end": 32.06531, "word": "方", "start": 31.936405}, {"end": 32.323124, "word": "案", "start": 32.194218}, {"end": 32.580936, "word": "轻", "start": 32.45203}, {"end": 32.83875, "word": "快", "start": 32.709843}, {"end": 33.09656, "word": "的", "start": 32.967655}, {"end": 33.354374, "word": "声", "start": 33.225468}, {"end": 33.612186, "word": "音", "start": 33.48328}, {"end": 33.87, "word": "快", "start": 33.741093}, {"end": 34.12781, "word": "速", "start": 33.998905}, {"end": 34.385624, "word": "键", "start": 34.256718}, {"end": 34.643436, "word": "盘", "start": 34.51453}, {"end": 34.90125, "word": "打", "start": 34.772343}, {"end": 35.15906, "word": "字", "start": 35.030155}, {"end": 35.416874, "word": "我", "start": 35.287968}, {"end": 35.674686, "word": "们", "start": 35.54578}, {"end": 35.9325, "word": "不", "start": 35.803593}, {"end": 36.19031, "word": "只", "start": 36.061405}, {"end": 36.448124, "word": "是", "start": 36.319218}, {"end": 36.705936, "word": "教", "start": 36.57703}, {"end": 36.96375, "word": "你", "start": 36.834843}, {"end": 37.22156, "word": "技", "start": 37.092655}, {"end": 37.479374, "word": "巧", "start": 37.350468}, {"end": 37.737186, "word": "我", "start": 37.60828}, {"end": 37.995, "word": "们", "start": 37.866093}, {"end": 40.625202, "word": "给", "start": 40.550102}, {"end": 40.775406, "word": "你", "start": 40.700306}, {"end": 40.92561, "word": "一", "start": 40.85051}, {"end": 41.075813, "word": "份", "start": 41.000713}, {"end": 41.22602, "word": "工", "start": 41.150917}, {"end": 41.376225, "word": "作", "start": 41.30112}, {"end": 41.52643, "word": "您", "start": 41.451324}, {"end": 41.676632, "word": "将", "start": 41.60153}, {"end": 41.826836, "word": "应", "start": 41.75173}, {"end": 41.97704, "word": "用", "start": 41.901936}, {"end": 42.127243, "word": "敏", "start": 42.052143}, {"end": 42.277447, "word": "捷", "start": 42.202347}, {"end": 42.42765, "word": "方", "start": 42.35255}, {"end": 42.577854, "word": "法", "start": 42.502754}, {"end": 42.728058, "word": "管", "start": 42.652958}, {"end": 42.878265, "word": "理", "start": 42.80316}, {"end": 43.02847, "word": "时", "start": 42.953365}, {"end": 43.178673, "word": "间", "start": 43.10357}, {"end": 43.328876, "word": "表", "start": 43.253773}, {"end": 43.47908, "word": "并", "start": 43.403976}, {"end": 43.629284, "word": "直", "start": 43.554184}, {"end": 43.779488, "word": "接", "start": 43.704388}, {"end": 43.92969, "word": "与", "start": 43.85459}, {"end": 44.079895, "word": "客", "start": 44.004795}, {"end": 44.315, "word": "户", "start": 44.155}, {"end": 44.635, "word": "互", "start": 44.475}, {"end": 44.954998, "word": "动", "start": 44.715}, {"end": 45.274998, "word": "就", "start": 45.114998}, {"end": 45.475, "word": "像", "start": 45.355}, {"end": 45.835, "word": "在", "start": 45.594997}, {"end": 46.074997, "word": "真", "start": 45.914997}, {"end": 46.235, "word": "正", "start": 46.155}, {"end": 46.475, "word": "的", "start": 46.315}, {"end": 46.635002, "word": "公", "start": 46.555}, {"end": 46.835, "word": "司", "start": 46.715}, {"end": 47.114998, "word": "中", "start": 46.954998}, {"end": 47.354996, "word": "一", "start": 47.274998}, {"end": 47.934998, "word": "样", "start": 47.434998}, {"end": 48.635, "word": "这", "start": 48.394997}, {"end": 48.875, "word": "是", "start": 48.714996}, {"end": 49.274998, "word": "您", "start": 48.954998}, {"end": 49.515, "word": "技", "start": 49.355}, {"end": 49.754997, "word": "术", "start": 49.594997}, {"end": 49.995, "word": "职", "start": 49.835}, {"end": 50.235, "word": "业", "start": 50.074997}, {"end": 50.555, "word": "生", "start": 50.315}, {"end": 50.795, "word": "涯", "start": 50.635}, {"end": 50.955, "word": "的", "start": 50.875}, {"end": 51.274998, "word": "终", "start": 51.035}, {"end": 51.515, "word": "极", "start": 51.355}, {"end": 51.835, "word": "试", "start": 51.675}, {"end": 52.155, "word": "验", "start": 51.915}, {"end": 52.735, "word": "场", "start": 52.235}])
    
    const subtitle10 = JSON.stringify([{"end":0.16,"word":"欢","start":0.08},{"end":0.39999998,"word":"迎","start":0.24},{"end":0.6742857,"word":"来","start":0.5371429},{"end":0.94857144,"word":"到","start":0.81142855},{"end":1.2228572,"word":"计","start":1.0857143},{"end":1.52,"word":"算","start":1.36},{"end":1.8399999,"word":"机","start":1.5999999},{"end":2.1599998,"word":"学","start":1.92},{"end":2.48,"word":"院","start":2.24},{"end":2.8,"word":"报","start":2.56},{"end":3.04,"word":"名","start":2.8799999},{"end":3.2399998,"word":"咨","start":3.12},{"end":3.52,"word":"询","start":3.36},{"end":4.16,"word":"台","start":3.6799998},{"end":4.7999997,"word":"在","start":4.64},{"end":5,"word":"这","start":4.88},{"end":5.62,"word":"里","start":5.12},{"end":5.92,"word":"您","start":5.7599998},{"end":6.3199997,"word":"将","start":6.08},{"end":6.4799995,"word":"了","start":6.3999996},{"end":6.72,"word":"解","start":6.56},{"end":7.2,"word":"让","start":6.8799996},{"end":7.44,"word":"新","start":7.2799997},{"end":7.68,"word":"加","start":7.52},{"end":7.9199996,"word":"坡","start":7.7599998},{"end":8.16,"word":"理","start":8},{"end":8.48,"word":"工","start":8.24},{"end":8.72,"word":"学","start":8.559999},{"end":9.04,"word":"院","start":8.8},{"end":9.28,"word":"成","start":9.12},{"end":9.5199995,"word":"为","start":9.36},{"end":9.76,"word":"科","start":9.599999},{"end":10,"word":"技","start":9.84},{"end":10.24,"word":"教","start":10.08},{"end":10.48,"word":"育","start":10.32},{"end":10.719999,"word":"领","start":10.559999},{"end":11.04,"word":"先","start":10.8},{"end":11.2,"word":"者","start":11.12},{"end":11.44,"word":"的","start":11.28},{"end":11.759999,"word":"一","start":11.5199995},{"end":12.509999,"word":"切","start":12.009999},{"end":13.045,"word":"了","start":12.965},{"end":13.285001,"word":"解","start":13.125},{"end":13.6050005,"word":"我","start":13.365001},{"end":13.765,"word":"们","start":13.685},{"end":14.005001,"word":"最","start":13.845},{"end":14.285001,"word":"先","start":14.165001},{"end":14.565001,"word":"进","start":14.405001},{"end":14.725,"word":"的","start":14.645},{"end":15.045,"word":"实","start":14.805},{"end":15.285,"word":"验","start":15.125},{"end":16.085001,"word":"室","start":16.005001},{"end":16.245,"word":"实","start":16.165},{"end":16.565,"word":"践","start":16.325},{"end":16.765,"word":"操","start":16.645},{"end":17.045,"word":"作","start":16.885},{"end":17.205,"word":"的","start":17.125},{"end":17.525002,"word":"学","start":17.285},{"end":17.765,"word":"习","start":17.605},{"end":18.085001,"word":"环","start":17.845001},{"end":18.485,"word":"境","start":18.165},{"end":19.045,"word":"以","start":18.805},{"end":19.205,"word":"及","start":19.125},{"end":19.404999,"word":"我","start":19.285},{"end":19.645,"word":"们","start":19.525},{"end":19.925,"word":"提","start":19.765},{"end":20.085001,"word":"供","start":20.005001},{"end":20.405,"word":"的","start":20.165},{"end":20.605,"word":"精","start":20.485},{"end":20.965,"word":"彩","start":20.725},{"end":21.205,"word":"文","start":21.045},{"end":21.525002,"word":"凭","start":21.285},{"end":21.845001,"word":"课","start":21.605},{"end":22.425,"word":"程","start":21.925},{"end":23.365,"word":"从","start":23.125},{"end":23.605,"word":"人","start":23.445},{"end":23.925,"word":"工","start":23.685001},{"end":24.165,"word":"智","start":24.005001},{"end":24.485,"word":"能","start":24.244999},{"end":24.725,"word":"和","start":24.565},{"end":24.965,"word":"网","start":24.805},{"end":25.32,"word":"路","start":25.045},{"end":25.48,"word":"安","start":25.4},{"end":25.72,"word":"全","start":25.56},{"end":25.919998,"word":"到","start":25.8},{"end":26.16,"word":"软","start":26.039999},{"end":26.44,"word":"体","start":26.279999},{"end":26.76,"word":"开","start":26.6},{"end":27,"word":"发","start":26.84},{"end":27.32,"word":"和","start":27.16},{"end":27.72,"word":"陈","start":27.48},{"end":27.88,"word":"进","start":27.8},{"end":28.199999,"word":"士","start":27.96},{"end":28.4,"word":"媒","start":28.279999},{"end":29.02,"word":"体","start":28.52},{"end":29.4,"word":"我","start":29.32},{"end":29.56,"word":"们","start":29.48},{"end":29.72,"word":"的","start":29.64},{"end":29.919998,"word":"课","start":29.8},{"end":30.36,"word":"程","start":30.039999},{"end":30.519999,"word":"旨","start":30.439999},{"end":30.84,"word":"在","start":30.599998},{"end":31.04,"word":"为","start":30.92},{"end":31.279999,"word":"您","start":31.16},{"end":31.56,"word":"未","start":31.4},{"end":31.72,"word":"来","start":31.64},{"end":31.92,"word":"的","start":31.8},{"end":32.28,"word":"科","start":32.04},{"end":32.52,"word":"技","start":32.36},{"end":32.76,"word":"职","start":32.6},{"end":33,"word":"业","start":32.84},{"end":33.32,"word":"做","start":33.16},{"end":33.52,"word":"好","start":33.4},{"end":33.879997,"word":"准","start":33.64},{"end":34.46,"word":"备","start":33.96},{"end":35.239998,"word":"了","start":35.08},{"end":35.559998,"word":"解","start":35.32},{"end":35.72,"word":"我","start":35.64},{"end":35.879997,"word":"们","start":35.8},{"end":36.12,"word":"的","start":35.96},{"end":36.32,"word":"行","start":36.2},{"end":36.68,"word":"业","start":36.44},{"end":36.839996,"word":"合","start":36.76},{"end":37.239998,"word":"作","start":36.92},{"end":37.4,"word":"伙","start":37.32},{"end":37.64,"word":"伴","start":37.48},{"end":37.84,"word":"关","start":37.72},{"end":38.46,"word":"系","start":37.96},{"end":38.84,"word":"真","start":38.68},{"end":39.079998,"word":"实","start":39},{"end":39.32,"word":"项","start":39.16},{"end":39.559998,"word":"目","start":39.4},{"end":39.879997,"word":"经","start":39.64},{"end":40.574875,"word":"验","start":40.129997},{"end":40.734875,"word":"以","start":40.654877},{"end":40.974876,"word":"及","start":40.814877},{"end":41.191345,"word":"帮","start":41.054874},{"end":41.464287,"word":"助","start":41.327816},{"end":41.73723,"word":"学","start":41.600758},{"end":42.01017,"word":"生","start":41.8737},{"end":42.283108,"word":"积","start":42.14664},{"end":42.55605,"word":"累","start":42.41958},{"end":42.82899,"word":"宝","start":42.69252},{"end":43.101933,"word":"贵","start":42.96546},{"end":43.374874,"word":"经","start":43.238403},{"end":43.614876,"word":"验","start":43.534874},{"end":43.934875,"word":"的","start":43.694874},{"end":44.094875,"word":"实","start":44.014874},{"end":44.294876,"word":"习","start":44.174873},{"end":44.654877,"word":"机","start":44.414875},{"end":45.234875,"word":"会","start":44.734875}]);

    
    await client.query(`
      INSERT INTO subtitle (subtitle_id, audio_id, language_id, text, created_by) VALUES
      (4, 804, 1, $1::jsonb, NULL),
      (5, 805, 1, $2::jsonb, NULL),
      (6, 806, 1, $3::jsonb, NULL),
      (7, 807, 1, $4::jsonb, NULL),
      (8, 809, 1, $5::jsonb, NULL),
      (9, 810, 1, $6::jsonb, NULL), 
      (10, 811, 1, $7::jsonb, NULL),
      (11, 812, 7, $8::jsonb, NULL), 
      (12, 813, 7, $9::jsonb, NULL),
      (13, 814, 7, $10::jsonb, NULL);



    `, [subtitle1, subtitle2, subtitle3, subtitle4, subtitle5, subtitle6, subtitle7, subtitle8, subtitle9, subtitle10]);


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
      ('inactivityThresholdDays', '"7"')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Clear existing audit logs and insert fresh data
    await client.query(`DELETE FROM audit_logs;`);
    
    // Insert audit logs (first 12 from original seed data)
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

    // Insert feedback/reviews for exhibits (2 reviews per exhibit)
    await client.query(`
      INSERT INTO feedback (user_id, exhibit_id, rating, description, is_hidden, created_at) VALUES
      -- Exhibit 1: Maritime Roots Interactive Gallery
      (3, 1, 5, 'Absolutely fascinating! The interactive projections really brought Singapore''s maritime history to life. I loved being able to tap on the artifacts and learn about their significance in trade.', false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (15, 1, 4, 'Great exhibit! The AR stations were impressive and the authentic artifacts made me appreciate how Singapore became such an important trading hub. Would have loved more information about the specific trade routes.', false, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      
      -- Exhibit 2: Ancient Singapore Map Table
      (7, 2, 5, 'The illuminated map table is incredible! Being able to see how Singapore evolved through different time periods with gesture controls was mind-blowing. This is definitely a must-see.', false, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (22, 2, 5, 'Wow! The level of detail in the historical maps is amazing. I spent over 20 minutes exploring different regions and learning about the Johor-Riau Sultanate. Very educational and engaging.', false, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      
      -- Exhibit 3: Wartime Bunker Immersion Room
      (11, 3, 5, 'This exhibit gave me chills. The recreation of the WWII bunker with authentic sounds and period equipment really transported me back to 1942. A powerful and moving experience.', false, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (28, 3, 4, 'Very immersive and historically accurate. The ambient effects really captured the tension of that era. Could use a bit more lighting in some areas, but overall an excellent exhibit.', false, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      
      -- Exhibit 4: Faces of the Occupation Story Wall
      (9, 4, 5, 'Deeply moving. Reading the personal stories and seeing actual photos from families during the Japanese Occupation made history feel so much more real and personal. An important exhibit.', false, CURRENT_TIMESTAMP - INTERVAL '8 days'),
      (19, 4, 5, 'The digital wall is beautifully done. Each story is carefully researched and the dramatic readings of diary entries brought tears to my eyes. This is how history should be taught.', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      
      -- Exhibit 5: Project INC
      (5, 5, 5, 'As a tech enthusiast, this exhibit blew my mind! Learning about how SP students work on real client projects is incredible. The hands-on approach to learning is exactly what the industry needs.', false, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (24, 5, 4, 'Very impressive program! The fact that students get to work with real clients like SLA and CleoSpa shows how seriously SP takes industry preparation. Definitely considering applying now.', false, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      
      -- Exhibit 6: Registration Booth
      (12, 6, 4, 'Great introduction to the School of Computing! The staff were friendly and knowledgeable. Got all my questions answered about the different specializations available.', false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (30, 6, 5, 'The computing labs look amazing! I''m particularly interested in Cybersecurity and Game Development. The QR code made it easy to get more information. Very organized booth.', false, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      
      -- Exhibit 7: Course Counselling
      (8, 7, 5, 'The counsellor was extremely helpful in guiding me through the different diploma programs. They took time to understand my interests and helped me choose the right path. Highly recommend!', false, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (17, 7, 5, 'Excellent counselling service! Got clear information about entry requirements, scholarships, and career pathways. The one-on-one session really helped clarify my educational goals.', false, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      
      -- Exhibit 8: Course Counselling (CLS)
      (14, 8, 4, 'Good counselling session for CLS courses. The counsellor explained the application timeline clearly and helped me understand which courses would be best for my career aspirations.', false, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (26, 8, 5, 'Very informative! The counsellor was patient and answered all my questions about CLS programs. I feel much more confident about my application now.', false, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      
      -- Exhibit 9: Course Counselling (SOB)
      (10, 9, 5, 'Amazing guidance for SOB courses! The counsellor helped me understand the different business diploma options and how they align with industry needs. Very professional service.', false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (20, 9, 4, 'Helpful counselling session. Got good insights into the School of Business programs and the various career paths available after graduation. Would recommend to prospective students.', false, CURRENT_TIMESTAMP - INTERVAL '3 days')
    `);

    // Insert audio playback logs (simulating users listening to audio guides)
    console.log("📻 Inserting audio playback logs...");
    await client.query(`
      INSERT INTO audio_playback_logs (user_id, audio_id, audio_start, audio_end, duration_listened, created_at) VALUES
      -- Exhibit 1 audio plays (Maritime Roots)
      (5, 804, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '34 seconds', 34, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (12, 804, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '34 seconds', 34, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (18, 804, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '30 seconds', 30, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (25, 804, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '34 seconds', 34, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (30, 804, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '28 seconds', 28, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (7, 804, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '34 seconds', 34, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (22, 804, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '34 seconds', 34, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (14, 804, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '32 seconds', 32, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
      
      -- Exhibit 2 audio plays (Ancient Map Table)
      (8, 805, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '37 seconds', 37, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (15, 805, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '37 seconds', 37, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (21, 805, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (28, 805, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '37 seconds', 37, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (11, 805, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '37 seconds', 37, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (19, 805, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '8 hours' + INTERVAL '33 seconds', 33, CURRENT_TIMESTAMP - INTERVAL '8 hours'),
      
      -- Exhibit 3 audio plays (Wartime Bunker)
      (9, 806, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '33 seconds', 33, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (16, 806, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '33 seconds', 33, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (23, 806, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '33 seconds', 33, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (13, 806, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '30 seconds', 30, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (27, 806, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '33 seconds', 33, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      
      -- Exhibit 4 audio plays (Faces of Occupation)
      (10, 807, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (17, 807, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (24, 807, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (29, 807, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '8 days'),
      
      -- Exhibit 5 audio plays (Project INC) - Most popular!
      (6, 809, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (12, 809, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (18, 809, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '50 seconds', 50, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (25, 809, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (30, 809, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (11, 809, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (22, 809, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (14, 809, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '48 seconds', 48, CURRENT_TIMESTAMP - INTERVAL '8 days'),
      (20, 809, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
      (26, 809, CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours' + INTERVAL '52 seconds', 52, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
      (8, 809, CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '6 hours' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '6 hours'),
      (15, 809, CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '3 hours' + INTERVAL '54 seconds', 54, CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '3 hours'),
      
      -- Exhibit 6 audio plays (Registration Booth)
      (7, 810, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '38 seconds', 38, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (19, 810, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '38 seconds', 38, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (28, 810, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '38 seconds', 38, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (13, 810, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '38 seconds', 38, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (21, 810, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '35 seconds', 35, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (4, 810, CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours' + INTERVAL '38 seconds', 38, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
      
      -- Exhibit 7 audio plays (Course Counselling)
      (9, 811, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '66 seconds', 66, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (16, 811, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '66 seconds', 66, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (23, 811, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '62 seconds', 62, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (27, 811, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '66 seconds', 66, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (10, 811, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '66 seconds', 66, CURRENT_TIMESTAMP - INTERVAL '8 days'),
      
      -- Chinese audio plays
      (3, 812, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '22 seconds', 22, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (5, 813, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '52 seconds', 52, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (17, 814, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '45 seconds', 45, CURRENT_TIMESTAMP - INTERVAL '2 days')
    `);

    // Reset audit_logs sequence after inserting the first 12 with explicit IDs
    await client.query(`SELECT setval('audit_logs_audit_log_id_seq', (SELECT MAX(audit_log_id) FROM audit_logs));`);

    // Insert more admin audit logs for recent activity
    console.log("📋 Inserting additional audit logs...");
    await client.query(`
      INSERT INTO audit_logs (admin_user_id, target_user_id, resource, action, changes, metadata, timestamp) VALUES
      -- Recent audio management by admin
      (1, NULL, 'audio', 'generate_tts', '{"exhibit_id": "5", "language": "English", "status": "completed"}', NULL, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
      (1, NULL, 'audio', 'generate_tts', '{"exhibit_id": "6", "language": "English", "status": "completed"}', NULL, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
      (1, NULL, 'audio', 'update', '{"audio_id": "809", "field": "title", "new_value": "Project INC (English)"}', NULL, CURRENT_TIMESTAMP - INTERVAL '8 hours'),
      
      -- Exhibit management by admin
      (1, NULL, 'exhibit', 'create', '{"exhibit_id": "5", "title": "Project INC", "exhibition_id": "7"}', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (1, NULL, 'exhibit', 'update', '{"exhibit_id": "1", "field": "sequence", "old_value": "1", "new_value": "1"}', NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
      (1, NULL, 'exhibit', 'update', '{"exhibit_id": "2", "field": "description", "change": "Added more details"}', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      
      -- User management activities
      (1, 15, 'user', 'create', '{"username": "user15", "email": "user15@example.com", "role": "user"}', NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      (1, 28, 'user', 'update', '{"user_id": "28", "field": "status", "new_value": "active"}', NULL, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
      (2, 22, 'user', 'password_reset', '{"user_id": "22", "method": "admin_initiated"}', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),
      
      -- Exhibition management
      (1, NULL, 'exhibition', 'update', '{"exhibition_id": "6", "field": "title", "change": "Updated description"}', NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),
      (1, NULL, 'exhibition', 'create', '{"exhibition_id": "7", "title": "Singapore Polytechnic Open House"}', NULL, CURRENT_TIMESTAMP - INTERVAL '5 days'),
      
      -- Badge management
      (1, NULL, 'badge', 'create', '{"badge_id": "1", "name": "Maritime Explorer", "linked_to": "Exhibit 1"}', NULL, CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (1, NULL, 'badge', 'assign', '{"badge_id": "1", "user_id": "1", "exhibit_id": "1"}', NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'),
      
      -- Image uploads
      (1, NULL, 'image', 'upload', '{"exhibit_id": "1", "type": "primary", "filename": "maritime_exhibit.jpg"}', NULL, CURRENT_TIMESTAMP - INTERVAL '7 days'),
      (1, NULL, 'image', 'upload', '{"exhibition_id": "6", "type": "cover", "filename": "wwii_cover.jpg"}', NULL, CURRENT_TIMESTAMP - INTERVAL '8 days'),
      
      -- System configuration
      (1, NULL, 'settings', 'update', '{"key": "inactivity_threshold", "old_value": "30", "new_value": "45"}', NULL, CURRENT_TIMESTAMP - INTERVAL '10 days'),
      (2, NULL, 'permission', 'grant', '{"user_id": "1", "permission": "manage_audio", "granted_by": "admin"}', NULL, CURRENT_TIMESTAMP - INTERVAL '12 days'),
      
      -- Recent feedback moderation
      (2, NULL, 'feedback', 'moderate', '{"feedback_id": "5", "action": "approved", "exhibit_id": "5"}', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (1, NULL, 'feedback', 'moderate', '{"feedback_id": "8", "action": "approved", "exhibit_id": "4"}', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days')
    `);

    // Update sequences to match inserted IDs
    await client.query(`
      SELECT setval('exhibitions_exhibition_id_seq', (SELECT MAX(exhibition_id) FROM exhibitions));
      SELECT setval('exhibit_exhibit_id_seq', (SELECT MAX(exhibit_id) FROM exhibit));
      SELECT setval('badge_badge_id_seq', (SELECT MAX(badge_id) FROM badge));
      SELECT setval('audio_audio_id_seq', (SELECT MAX(audio_id) FROM audio));
      SELECT setval('subtitle_subtitle_id_seq', (SELECT MAX(subtitle_id) FROM subtitle));
      SELECT setval('images_image_id_seq', (SELECT MAX(image_id) FROM images));
      SELECT setval('qr_code_qr_id_seq', (SELECT MAX(qr_id) FROM qr_code));
      SELECT setval('feedback_feedback_id_seq', (SELECT MAX(feedback_id) FROM feedback));
      SELECT setval('audio_playback_logs_audio_logs_id_seq', (SELECT MAX(audio_logs_id) FROM audio_playback_logs));
      SELECT setval('audit_logs_audit_log_id_seq', (SELECT MAX(audit_log_id) FROM audit_logs));
    `);

    // Clean up expired tokens as demonstration
    await client.query("SELECT cleanup_expired_tokens();");

    console.log("✅ Seeding complete!");
    console.log("📊 Database ready with:");
    console.log(
      "   - 122 users (admin, moderator + 120 test users with varied registration dates)"
    );
    console.log(
      "   - 3 roles with proper permissions (including password reset & email verification)"
    );
    console.log("   - 10 languages with English as default");
    console.log("   - 2 exhibitions (IDs 6 & 7) with 9 exhibits (IDs 1-9)");
    console.log(
      "   - 25 badges created, each linked uniquely to an exhibit (with name and description)"
    );
    console.log("   - 4 badges are given to admin1");
    console.log("   - 10 audio records with 10 subtitle records (JSONB)");
    console.log("   - 6 images (2 exhibition covers + 4 exhibit images)");
    console.log("   - 9 QR codes");
    console.log("   - 18 feedback/reviews (2 per exhibit from various users)");
    console.log("   - 56 audio playback logs from 30+ different users");
    console.log("   - 30 audit log entries (admin activities, user management, etc.)");
    console.log("   - Settings table with inactivity threshold");
    console.log("   - Password reset and email verification token tables");
    console.log(
      "   - Sample tokens for testing (1 expired, cleaned up automatically)"
    );
    console.log(
      "   - Comprehensive performance indexes and constraints applied"
    );
    console.log("   - Automatic token cleanup function available");
    console.log(
      "   - User registration data distributed over 12 months for trend analysis"
    );
    console.log("   - 2 sender types (user, assistant) for AI Assistant");
    console.log("   - Conversation and message tables for AI Assistant (Omnie)");
    console.log("   - 🎧 Audio analytics ready: Popular exhibits tracked by playback count");
    console.log("   - 📋 Recent admin actions logged and visible on dashboard");
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(console.error);