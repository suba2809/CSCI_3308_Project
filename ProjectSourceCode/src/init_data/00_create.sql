DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password CHAR(60) NOT NULL,
  bio TEXT,
  profile_photo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
