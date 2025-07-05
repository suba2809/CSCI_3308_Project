-- Connect to the database
-- \c users_db;

-- ============
-- USERS
-- ============

CREATE TABLE IF NOT EXISTS users (
    user_id    SERIAL PRIMARY KEY,
    first_name    VARCHAR(50)  NOT NULL,
    last_name     VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password      VARCHAR(100) NOT NULL,
    profile_photo VARCHAR(255),
    bio           TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
);
