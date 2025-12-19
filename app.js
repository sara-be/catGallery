const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'cat-gallery-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "animals_db"
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    return;
  }
  console.log("MySQL connected!");
  
  // Create users table if not exists
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `;
  db.query(createUsersTable, (err) => {
    if (err) console.error("Error creating users table:", err);
    else console.log("Users table ready");
  });
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized. Please log in." });
};

// ==========================================
// AUTH ROUTES
// ==========================================

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    
    db.query(sql, [username, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: "Username or email already exists" });
        }
        return res.status(500).json({ error: err });
      }
      res.json({ message: "User created successfully" });
    });
  } catch (err) {
    res.status(500).json({ error: "Error hashing password" });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(401).json({ error: "Invalid username or password" });
    
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ message: "Login successful", username: user.username });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/check-auth", (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// ==========================================
// CAT ROUTES
// ==========================================

app.get("/cats", (req, res) => {
  const sql = "SELECT * FROM cat";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get("/cats/:id", (req, res) => {
  db.query("SELECT * FROM cat WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// PROTECTED ROUTES
app.delete("/cats/:id", isAuthenticated, (req, res) => {
  db.query("DELETE FROM cat WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${req.params.id} deleted` });
  });
});

app.post("/cats", isAuthenticated, (req, res) => {
  const { id, tag, img, description } = req.body;
  const sql = "INSERT INTO cat (id, tag, img, description) VALUES (?, ?, ?, ?)";
  db.query(sql, [id, tag, img, description], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${id} added` });
  });
});

app.put("/cats/:id", isAuthenticated, (req, res) => {
  const { tag, img, description } = req.body;
  const sql = "UPDATE cat SET tag = ?, img = ?, description = ? WHERE id = ?";
  db.query(sql, [tag, img, description, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${req.params.id} updated` });
  });
});

app.patch("/cats/:id", isAuthenticated, (req, res) => {
  const fields = req.body;
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: "No fields provided" });
  const setClause = Object.keys(fields).map((key) => `${key} = ?`).join(", ");
  const values = [...Object.values(fields), req.params.id];
  const sql = `UPDATE cat SET ${setClause} WHERE id = ?`;
  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${req.params.id} updated` });
  });
});

// Start server 
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

