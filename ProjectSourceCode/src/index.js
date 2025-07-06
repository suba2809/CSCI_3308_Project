const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'superSecretKey', // For production, use process.env.SECRET or move to .env
  resave: false,
  saveUninitialized: false,
}));

// --- VIEW ENGINE SETUP ---
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'resources')));

// --- DATABASE ---
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || 'myuser',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  database: process.env.POSTGRES_DB || 'mydatabase',
});

// --- ROUTES ---

// Redirect to registration page
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Show registration form
app.get('/register', (req, res) => {
  res.render('pages/register');
});

// Handle registration
app.post('/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;

  if (!first_name || !last_name || !email || !username || !password) {
    return res.render('pages/register', { error: 'All fields are required.' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.render('pages/register', {
        error: 'Email or username already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, username, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [first_name, last_name, email, username, hashedPassword]
    );

    res.render('pages/register', {
      success: 'Registration successful! You can now log in.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.render('pages/register', {
      error: 'Something went wrong. Please try again.',
    });
  }
});

// Show login form
app.get('/login', (req, res) => {
  res.render('pages/login');
});

// Handle login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.render('pages/login', { error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render('pages/login', { error: 'Invalid username or password.' });
    }

    req.session.user = {
      id: user.user_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      bio: user.bio,
      profile_photo: user.profile_photo,
      created_at: user.created_at,
    };

    res.redirect('/profile');
  } catch (err) {
    console.error('Login error:', err);
    res.render('pages/login', { error: 'An error occurred. Please try again.' });
  }
});

// Show user profile (protected route)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('pages/profile', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
