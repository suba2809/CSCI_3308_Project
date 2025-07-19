const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || 'myuser',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  database: process.env.POSTGRES_DB || 'mydatabase',
});

async function seed() {
  try {
    console.log(" Seeding database...");

    await pool.query("DELETE FROM articles_to_users");
    await pool.query("DELETE FROM articles");
    await pool.query("DELETE FROM users");

    const passwordHash = await bcrypt.hash("password123", 10);

    const userResult = await pool.query(`
      INSERT INTO users (first_name, last_name, email, username, password)
      VALUES 
        ('Alice', 'Smith', 'alice@example.com', 'alice', $1),
        ('Bob', 'Johnson', 'bob@example.com', 'bob', $1)
      RETURNING user_id, username
    `, [passwordHash]);

    const user1 = userResult.rows[0].user_id;
    const user2 = userResult.rows[1].user_id;

    const articleResult = await pool.query(`
      INSERT INTO articles (title, summary, file_path)
      VALUES 
        ('AI Takes Over TinyNews', 'A robot now runs our site.', null),
        ('Tech Bubble 2.0?', 'Experts worry the tech market may crash.', null),
        ('Humans Still Needed', 'Despite AI, humans still matter.', null)
      RETURNING article_id
    `);

    const article1 = articleResult.rows[0].article_id;
    const article2 = articleResult.rows[1].article_id;
    const article3 = articleResult.rows[2].article_id;

    await pool.query(`
      INSERT INTO articles_to_users (user_id, article_id)
      VALUES 
        ($1, $2),
        ($2, $3),
        ($1, $4)
    `, [user1, article1, article2, article3]);

    console.log(" Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error(" Seed failed:", err);
    process.exit(1);
  }
}

seed();
