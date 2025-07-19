-- Connect to the database
-- \c users_db;

-- ============ 
-- USERS 
-- ============

CREATE TABLE IF NOT EXISTS users (
    user_id        SERIAL PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    email          VARCHAR(100) UNIQUE NOT NULL,
    username       VARCHAR(50)  UNIQUE NOT NULL,
    password       VARCHAR(100) NOT NULL,
    profile_photo  VARCHAR(255),
    bio            TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- ============ 
-- ARTICLES 
-- ============

CREATE TABLE IF NOT EXISTS articles (
    article_id  SERIAL PRIMARY KEY,
    title       VARCHAR(264) NOT NULL,
    summary     TEXT NOT NULL,
    file_path   VARCHAR(255),             -- ✅ NEW LINE
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============ 
-- ARTICLES_TO_USERS 
-- ============

CREATE TABLE IF NOT EXISTS articles_to_users (
    user_id    INT NOT NULL,
    article_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles (article_id) ON DELETE CASCADE
);
