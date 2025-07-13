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
  secret: 'superSecretKey', // Use process.env.SECRET in production
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

// HOME PAGE
app.get("/", async (req, res) => {
  const articles = [
    {
      title: "AI Takes Over Newsrooms",
      summary: "Jeffrey Epstein Files have been realesed. (The real joke is this will never happen)",
      author: "Jane Smith",
      date: "July 9, 2025"
    },
    {
      title: "Tech Stocks Hit New Highs",
      summary: "NASDAQ sees record growth as investors remain bullish on innovation.",
      author: "Carlos Vega",
      date: "July 8, 2025"
    },
    {
      title: "NASA Plans Moon Hotel",
      summary: "A private space company and NASA team up to build a lunar resort by 2030.",
      author: "Luna Patel",
      date: "July 7, 2025"
    }
  ];

  try {
      const results = await pool.query(`
          SELECT
            articles.article_id,
            articles.title,
            articles.summary,
            articles.created_at,
            users.username AS author_username
          FROM articles
          INNER JOIN articles_to_users
            ON articles.article_id = articles_to_users.article_id
          INNER JOIN users
            ON articles_to_users.user_id = users.user_id
          ORDER BY articles.created_at DESC

      `);

      const articles = results.rows.map(row => ({
        article_id: row.article_id,
        title: row.title,
        summary: row.summary,
        date: row.created_at.toLocaleDateString(),
        author: { username: row.author_username}
      }));

      res.render("pages/home", {
        title: "Home",
        user: req.session.user,
        articles
      });
    }
    catch(error) {
          res.render('pages/home', {
              articles: []
          });
    }
});


// SHOW REGISTRATION FORM
app.get("/register", (req, res) => {
  res.render("pages/register", { title: "Register" });
});

// HANDLE REGISTRATION
app.post('/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;

  if (!first_name || !last_name || !email || !username || !password) {
    return res.render('pages/register', { title: "Register", error: 'All fields are required.' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.render('pages/register', {
        title: "Register",
        error: 'Email or username already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, username, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [first_name, last_name, email, username, hashedPassword]
    );

    res.redirect("/login");
  } catch (err) {
    console.error('Registration error:', err);
    res.render('pages/register', {
      title: "Register",
      error: 'Something went wrong. Please try again.',
    });
  }
});

// SHOW LOGIN FORM
app.get('/login', (req, res) => {
  res.render("pages/login", { title: "Login" });
});

// HANDLE LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.render('pages/login', { title: "Login", error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render('pages/login', { title: "Login", error: 'Invalid username or password.' });
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
    res.render('pages/login', { title: "Login", error: 'An error occurred. Please try again.' });
  }
});

// PROFILE PAGE (PROTECTED)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('pages/profile', { title: "Profile", user: req.session.user });
});

// Adding New Article
app.post('/articles/new', async (req, res) => {
  const { title, summary } = req.body;
  const user_id = req.session.user?.id;

  try {
    const results = await pool.query(`
      INSERT INTO articles (title, summary)
      VALUES ($1, $2)
      `, [title, summary]);

    const article_id = results.rows[0].article_id;

    await pool.query(`
      INSERT INTO articles_to_users (user_id, article_id)
      VALUES ($1, $2)
      `, [user_id, article_id]);

    res.redirect('/');
  }
  catch (error) {
    console.error('Error inserting article:', err);
    res.status(500).send('Server Error');
  }
});

// LOGOUT
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