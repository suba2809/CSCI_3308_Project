const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');

const app = express();

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'superSecretKey', // Use process.env.SECRET in production
  resave: false,
  saveUninitialized: false,
}));

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- VIEW ENGINE SETUP ---
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    ifCond: function (v1, v2, options) {
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'resources')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve uploaded files

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
app.get("/home", async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT
        articles.article_id,
        articles.title,
        articles.summary,
        articles.file_path,
        articles.created_at,
        users.username AS author
      FROM articles
      JOIN articles_to_users ON articles.article_id = articles_to_users.article_id
      JOIN users ON articles_to_users.user_id = users.user_id
      ORDER BY articles.created_at DESC
    `);

    const articles = results.rows.map(row => ({
      article_id: row.article_id,
      title: row.title,
      summary: row.summary,
      file_path: row.file_path,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      author: row.author
    }));

    res.render("pages/home", {
      title: "Home",
      user: req.session.user,
      articles
    });
  }
  catch(error) {
    console.error('Error fetching articles:', error);
    res.render('pages/home', {
      articles: []
    });
  }
});



app.get("/", (req, res) => {
  res.redirect("/login");
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
  if (req.session.user) return res.redirect('/home');
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

    res.redirect('/home');
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

// SHOW NEW ARTICLE FORM
app.get('/new_article', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('pages/new_article', { user: req.session.user });
});

// HANDLE NEW ARTICLE WITH FILE UPLOAD
app.post('/new_article', upload.single('article_file'), async (req, res) => {
  const { title, summary } = req.body;
  const user_id = req.session.user?.id;
  const filePath = req.file ? req.file.path : null;

  console.log('New article submission:', { title, summary, user_id, filePath });

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

    res.redirect(`/article/${article_id}`);
  } catch (error) {
    console.error('Error inserting article with file:', error);
    res.status(500).send('Server Error');
  }
});
// SHOW EDIT ARTICLE FORM
app.get("/edit_article/:id", async (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.user?.id;

  if (!user_id) return res.redirect("/login");

  try {
    const result = await pool.query(`
      SELECT a.* FROM articles a
      JOIN articles_to_users atu ON a.article_id = atu.article_id
      WHERE a.article_id = $1 AND atu.user_id = $2
    `, [article_id, user_id]);

    if (result.rows.length === 0) return res.status(403).send("Unauthorized");

    res.render("pages/edit_article", {
      article: result.rows[0],
      user: req.session.user
    });
  } catch (err) {
    console.error("Error loading article for edit:", err);
    res.status(500).send("Server error");
  }
});

// HANDLE EDIT SUBMISSION
app.post("/edit_article/:id", upload.single("article_file"), async (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.user?.id;
  const { title, summary } = req.body;
  const newFilePath = req.file ? req.file.path : null;

  if (!user_id) return res.redirect("/login");


  try {
    const result = await pool.query(`
      SELECT * FROM articles a
      JOIN articles_to_users atu ON a.article_id = atu.article_id
      WHERE a.article_id = $1 AND atu.user_id = $2
    `, [article_id, user_id]);

    if (result.rows.length === 0) return res.status(403).send("Unauthorized");

    if (newFilePath) {
    // 4 parameters
      await pool.query(`
        UPDATE articles SET title = $1, summary = $2, file_path = $3
        WHERE article_id = $4
      `, [title, summary, newFilePath, article_id]);
    } else {
    // 3 parameters
      await pool.query(`
        UPDATE articles SET title = $1, summary = $2
        WHERE article_id = $3
      `, [title, summary, article_id]);
   }

    res.redirect("/home");
  } catch (err) {
    console.error("Error updating article:", err);
    res.status(500).send("Server error");
}
  
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.render("pages/login", {
      title: "Login",
      message: " You have been successfully logged out."
    });
  });
});
 
// ARTICLE PAGE ROUTE 
app.get("/article/:id", async (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.user?.id;

  try {
    // Get the article and author
    const articleResult = await pool.query(`
      SELECT a.*, u.username AS author
      FROM articles a
      JOIN articles_to_users atu ON a.article_id = atu.article_id
      JOIN users u ON atu.user_id = u.user_id
      WHERE a.article_id = $1
    `, [article_id]);

    if (articleResult.rows.length === 0) {
      return res.status(404).send("Article not found");
    }

    const article = articleResult.rows[0];

    // Like count
    const likeCountResult = await pool.query(`
      SELECT COUNT(*) FROM likes WHERE article_id = $1
    `, [article_id]);
    article.likes = parseInt(likeCountResult.rows[0].count);

    // Check if current user has liked
    let userHasLiked = false;
    if (user_id) {
      const likedResult = await pool.query(
        `SELECT 1 FROM likes WHERE article_id = $1 AND user_id = $2`,
        [article_id, user_id]
      );
      userHasLiked = likedResult.rows.length > 0;
    }

    // Get comments
    const commentsResult = await pool.query(`
      SELECT c.content, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.article_id = $1
      ORDER BY c.created_at ASC
    `, [article_id]);

    res.render("pages/article", {
      article,
      comments: commentsResult.rows,
      user: req.session.user,
      userHasLiked
    });
  } catch (err) {
    console.error("Error loading article:", err);
    res.status(500).send("Internal server error");
  }
});


// POST LIKES 
app.post("/like/:id", async (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");

  try {
    const existing = await pool.query(
      `SELECT * FROM likes WHERE article_id = $1 AND user_id = $2`,
      [article_id, user_id]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO likes (article_id, user_id) VALUES ($1, $2)`,
        [article_id, user_id]
      );
    } else {
      await pool.query(
        `DELETE FROM likes WHERE article_id = $1 AND user_id = $2`,
        [article_id, user_id]
      );
    }

    res.redirect(`/article/${article_id}`);
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).send("Server error");
  }
});

// POST COMMENTS 
app.post("/comment/:id", async (req, res) => {
  const article_id = req.params.id;
  const user_id = req.session.user?.id;
  const { content } = req.body;
  if (!user_id) return res.redirect("/login");

  try {
    await pool.query(
      `INSERT INTO comments (article_id, user_id, content)
       VALUES ($1, $2, $3)`,
      [article_id, user_id, content]
    );

    res.redirect(`/article/${article_id}`);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).send("Server error");
  }
});


// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
