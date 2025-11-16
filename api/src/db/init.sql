-- Drop all existing tables (optional reset)
DROP TABLE IF EXISTS 
  userroles, roles_permission, permissions, roles, 
  audio_playback_logs, admin_audit_logs, user_audit_logs,
  subtitle, audio, images, qr_code, feedback, sessions,
  exhibit, "user", language, status 
CASCADE;

-- STATUS
CREATE TABLE status (
  status_id SERIAL PRIMARY KEY,
  is_active BOOLEAN NOT NULL
);

-- USER
CREATE TABLE "user" (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(72) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ROLES
CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

-- PERMISSIONS
CREATE TABLE permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ROLES_PERMISSION (Many-to-Many)
CREATE TABLE roles_permission (
  role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(permission_id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

-- USERROLES
CREATE TABLE userroles (
  user_id BIGINT REFERENCES "user"(user_id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- EXHIBIT
CREATE TABLE exhibit (
  exhibit_id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- IMAGES
CREATE TABLE images (
  images_id BIGSERIAL PRIMARY KEY,
  exhibit_id INT REFERENCES exhibit(exhibit_id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_url VARCHAR(512),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- LANGUAGE
CREATE TABLE language (
  language_id BIGSERIAL PRIMARY KEY,
  status_id INT REFERENCES status(status_id),
  title TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AUDIO
CREATE TABLE audio (
  audio_id SERIAL PRIMARY KEY,
  exhibit_id INT REFERENCES exhibit(exhibit_id),
  language_id INT REFERENCES language(language_id),
  file_url VARCHAR(512),
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- SUBTITLE
CREATE TABLE subtitle (
  subtitles_id BIGSERIAL PRIMARY KEY,
  audio_id INT REFERENCES audio(audio_id) ON DELETE CASCADE,
  language_id INT REFERENCES language(language_id),
  text TEXT,
  created_by INT REFERENCES "user"(user_id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- QR_CODE
CREATE TABLE qr_code (
  qr_code_id BIGSERIAL PRIMARY KEY,
  exhibit_id INT REFERENCES exhibit(exhibit_id),
  user_id BIGINT REFERENCES "user"(user_id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- FEEDBACK
CREATE TABLE feedback (
  feedback_id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES "user"(user_id),
  exhibit_id INT REFERENCES exhibit(exhibit_id),
  rating INT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- SESSIONS
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES "user"(user_id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AUDIO_PLAYBACK_LOGS
CREATE TABLE audio_playback_logs (
  audio_logs_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES "user"(user_id),
  audio_id INT REFERENCES audio(audio_id),
  audio_start TIMESTAMPTZ,
  audio_end TIMESTAMPTZ,
  duration_listened INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- USER_AUDIT_LOGS
CREATE TABLE user_audit_logs (
  audit_logs_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES "user"(user_id),
  action_type TEXT,
  description TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ADMIN_AUDIT_LOGS
CREATE TABLE admin_audit_logs (
  log_id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES "user"(user_id),
  action_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
