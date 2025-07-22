-- we'll add admin data here
-- === INSERT USERS ===
INSERT INTO users (first_name, last_name, email, username, password, bio)
VALUES
  ('Alice', 'Johnson', 'alice@example.com', 'alicej', '$2b$10$Hk7iH1N9bBfH.vQv2mj61OKqBq7LX2nN3WfqHx6GUGDvlDb2P0OFK', 'Quantum researcher at CalTech.'),
  ('Bob', 'Smith', 'bob@example.com', 'bobsmith', '$2b$10$Hk7iH1N9bBfH.vQv2mj61OKqBq7LX2nN3WfqHx6GUGDvlDb2P0OFK', 'Tech writer and sci-fi fan.'),
  ('Clara', 'Zhao', 'clara@example.com', 'claraz', '$2b$10$Hk7iH1N9bBfH.vQv2mj61OKqBq7LX2nN3WfqHx6GUGDvlDb2P0OFK', 'Physics PhD student and AI skeptic.');

-- === INSERT ARTICLES ===
INSERT INTO articles (title, summary, file_path)
VALUES
  ('The Rise of Quantum Internet', 'Quantum entanglement may change how we transmit information forever.', NULL),
  ('AI Beats Doctors at Diagnosing Eye Disease', 'AI outperforms top ophthalmologists.', NULL),
  ('NASA Moon Mission 2026', 'NASA plans to return to the Moon under the Artemis program.', NULL),
  ('Fusion Energy Breakthrough', 'Recent experiments show net positive energy from fusion.', NULL),
  ('Brain-Machine Interfaces', 'Companies like Neuralink are working to integrate brains with software.', NULL);

-- === MAP ARTICLES TO USERS ===
INSERT INTO articles_to_users (user_id, article_id)
VALUES
  (1, 1),
  (1, 2),
  (2, 3),
  (3, 4),
  (2, 5);
