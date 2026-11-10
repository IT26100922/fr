-- Additive migration: safe for existing application data. Run with ON_ERROR_STOP.
BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profile_photos (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    file_key VARCHAR(50) NOT NULL UNIQUE CHECK (file_key ~ '^[a-f0-9-]{36}\.png$'),
    content_type VARCHAR(30) NOT NULL DEFAULT 'image/png' CHECK (content_type = 'image/png'),
    width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 640),
    height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 640),
    byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_migrations(version) VALUES ('001_profile_photos') ON CONFLICT DO NOTHING;
COMMIT;
