const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const app = express();

// --- SETUP UPLOADS DIRECTORY ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'superSecretKey',
  resave: false,
  saveUninitialized: false,
}));

// --- VIEW ENGINE ---
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    ifCond: function (v1, v2, options) {
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'resources')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DATABASE ---
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'myuser',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  database: process.env.POSTGRES_DB || 'mydatabase',
});

// --- ROUTES ---
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get("/", (req, res) => res.redirect("/login"));

// Registration
app.get("/register", (req, res) => {
  res.render("pages/register", { title: "Register" });
});
app.post('/register', async (req, res) => {
  const { first_name, last_name, email, bio, username, password } = req.body;
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
      `INSERT INTO users (first_name, last_name, email, bio, username, password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [first_name, last_name, email, bio, username, hashedPassword]
    );
    res.redirect("/login");
  } catch (err) {
    console.error('Registration error:', err);
    res.render('pages/register', { title: "Register", error: 'Something went wrong.' });
  }
});
app.post('/api/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;
  if (!first_name || !last_name || !email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (first_name, last_name, email, username, password) VALUES ($1, $2, $3, $4, $5)',
      [first_name, last_name, email, username, hash]
    );
    res.status(201).json({ message: 'Success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User registration failed' });
  }
});

// Login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render("pages/login", { title: "Login" });
});
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
    res.render('pages/login', { title: "Login", error: 'An error occurred.' });
  }
});
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password.' });

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
    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('API login error:', err);
    res.status(500).json({ error: 'An error occurred.' });
  }
});

// Profile
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('pages/profile', { title: "Profile", user: req.session.user });
});
app.get('/api/profile', (req, res) => {
  if (!req.session.user) return res.status(401).send('Not authenticated');
  res.status(200).json({ username: req.session.user.username });
});

// Articles
app.get("/home", async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT a.article_id, a.title, a.summary, a.file_path, a.created_at,
             u.username AS author_username
      FROM articles a
      JOIN articles_to_users atu ON a.article_id = atu.article_id
      JOIN users u ON atu.user_id = u.user_id
      ORDER BY a.created_at DESC
    `);

    const articles = results.rows.map(row => ({
      article_id: row.article_id,
      title: row.title,
      summary: row.summary,
      file_path: row.file_path,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      author: row.author_username
    }));

    res.render("pages/home", {
      title: "Home",
      user: req.session.user,
      articles
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.render('pages/home', { articles: [] });
  }
});

app.get('/new_article', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('pages/new_article', { user: req.session.user });
});
app.post('/new_article', upload.single('article_file'), async (req, res) => {
  const { title, summary } = req.body;
  const user_id = req.session.user?.id;
  const filePath = req.file ? req.file.path : null;

  if (!user_id) return res.redirect('/login');

  try {
    const result = await pool.query(`
      INSERT INTO articles (title, summary, file_path)
      VALUES ($1, $2, $3)
      RETURNING article_id
    `, [title, summary, filePath]);

    const article_id = result.rows[0].article_id;
    await pool.query(`
      INSERT INTO articles_to_users (user_id, article_id)
      VALUES ($1, $2)
    `, [user_id, article_id]);

    res.redirect('/home');
  } catch (error) {
    console.error('Error inserting article:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
// Edit Article (GET)
app.get('/edit_article/:id', async (req, res) => {
  const articleId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM articles WHERE article_id = $1',
      [articleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Article not found');
    }

    const article = result.rows[0];
    res.render('pages/edit_article', { title: "Edit Article", article, user: req.session.user });
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).send('Server error');
  }
});

// Edit Article (POST)
app.post('/edit_article/:id', upload.single('article_file'), async (req, res) => {
  const articleId = req.params.id;
  const { title, summary } = req.body;
  const filePath = req.file ? req.file.path : null;

  try {
    if (filePath) {
      await pool.query(
        'UPDATE articles SET title = $1, summary = $2, file_path = $3 WHERE article_id = $4',
        [title, summary, filePath, articleId]
      );
    } else {
      await pool.query(
        'UPDATE articles SET title = $1, summary = $2 WHERE article_id = $3',
        [title, summary, articleId]
      );
    }

    res.redirect('/home');
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).send('Server error');
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
