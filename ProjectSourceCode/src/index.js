const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Set up Handlebars view engine
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'resources')));

// PostgreSQL connection pool (using .env variables)
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || 'myuser',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  database: process.env.POSTGRES_DB || 'mydatabase',
});

// ROUTES

// Redirect root to registration
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Show registration form
app.get('/register', (req, res) => {
  res.render('pages/register');
});

// Handle form submission
app.post('/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;

  if (!first_name || !last_name || !email || !username || !password) {
    return res.render('pages/register', { error: 'All fields are required.' });
  }

  try {
    // Check if email or username already exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.render('pages/register', {
        error: 'Email or username already exists.',
      });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB
    await pool.query(
      `INSERT INTO users (first_name, last_name, email, username, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [first_name, last_name, email, username, hashedPassword]
    );

    return res.render('pages/register', {
      success: 'Registration successful! You can now log in.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.render('pages/register', {
      error: 'Something went wrong. Please try again.',
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
