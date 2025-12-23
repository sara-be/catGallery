const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Database configuration
const dbOptions = {
  host: "localhost",
  user: "root",
  password: "",
  database: "animals_db"
};

const pool = mysql.createPool(dbOptions);
const sessionStore = new MySQLStore({
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions'
  }
}, pool);

sessionStore.onReady().then(() => {
  console.log('MySQLSessionStore ready');
}).catch(err => {
  console.error('MySQLSessionStore error:', err);
});

// Session configuration
app.use(session({
  key: 'cat_session_id',
  secret: 'cat-gallery-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false // Set to true if using HTTPS
  }
}));

// Database connection with reconnection logic
// Database connection helper (using the pool)
const db = {
  query: function() {
    pool.query.apply(pool, arguments);
  }
};

function setupTables() {
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

  // Explicitly create sessions table just in case (matches express-mysql-session default)
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
      expires INT(11) UNSIGNED NOT NULL,
      data MEDIUMTEXT COLLATE utf8mb4_bin,
      PRIMARY KEY (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  `;
  db.query(createSessionsTable, (err) => {
    if (err) console.error("Error ensuring sessions table:", err);
    else console.log("Sessions table checked/ready");
  });

  // Create cat table if not exists
  const createCatTable = `
    CREATE TABLE IF NOT EXISTS cat (
      id VARCHAR(255) PRIMARY KEY,
      tag VARCHAR(255),
      img TEXT,
      description TEXT
    )
  `;
  db.query(createCatTable, (err) => {
    if (err) console.error("Error creating cat table:", err);
    else {
      console.log("Cat table ready");
      // Seed data if empty
      db.query("SELECT COUNT(*) as count FROM cat", (err, results) => {
        if (!err && results[0] && results[0].count === 0) {
          const seedSql = "INSERT INTO cat (id, tag, img, description) VALUES ?";
          const values = [
            ['1', 'Siamese', 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=800', 'Elegant and vocal, Siamese cats are known for their striking blue eyes and point coloration.'],
            ['2', 'Bengal', 'https://images.unsplash.com/photo-1513360371669-4adaa10f762b?auto=format&fit=crop&q=80&w=800', 'Wild-looking with their spotted coats, Bengals are active, playful, and intelligent.'],
            ['3', 'Persian', 'https://images.unsplash.com/photo-1557008075-7f2c5efa4cfd?auto=format&fit=crop&q=80&w=800', 'Known for their long, luxurious fur and sweet personalities, Persians are the royalty of the cat world.']
          ];
          db.query(seedSql, [values], (err) => {
            if (err) console.error("Error seeding cat data:", err);
            else console.log("Cat table seeded with sample data");
          });
        }
      });
    }
  });

  // Create adopted table if not exists
  const createAdoptedTable = `
    CREATE TABLE IF NOT EXISTS adopted (
      id INT AUTO_INCREMENT PRIMARY KEY,
      catId VARCHAR(255) NOT NULL,
      userId INT NOT NULL,
      adoptionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `;
  db.query(createAdoptedTable, (err) => {
    if (err) console.error("Error creating adopted table:", err);
    else console.log("Adopted table ready");
  });
}

// handleDisconnect();

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
        return res.status(500).json({ error: err.message });
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
    if (err) return res.status(500).json({ error: err.message });
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
    res.clearCookie('cat_session_id'); // Match the session key
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

// ==========================================
// ADOPTION ROUTES
// ==========================================

app.post("/adopt", isAuthenticated, (req, res) => {
  const { catId } = req.body;
  const userId = req.session.userId;

  if (!catId) return res.status(400).json({ error: "Cat ID is required" });

  const sql = "INSERT INTO adopted (catId, userId) VALUES (?, ?)";
  db.query(sql, [catId, userId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Cat adopted successfully" });
  });
});

app.get("/adopted", isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  
  // Join with cat table to get cat details
  const sql = `
    SELECT a.id as adoptionId, a.adoptionDate, c.* 
    FROM adopted a 
    JOIN cat c ON a.catId = c.id 
    WHERE a.userId = ?
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Start server 
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setupTables();
});

