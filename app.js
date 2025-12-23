const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Database configuration
let connectionString = process.env.DATABASE_URL;

// Fix for Supabase preventing connection timeouts (Firewall/Network issues with port 6543)
if (connectionString && connectionString.includes("6543")) {
  try {
    const url = new URL(connectionString);
    console.log(`[DB] Switching from Transaction Pooler (6543) to Session Pooler (5432)`);
    url.port = "5432";
    connectionString = url.toString();
  } catch (e) {
    console.warn("Could not auto-correct Supabase connection string:", e);
  }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const sessionStore = new pgSession({
  pool: pool,
  tableName: "sessions",
  createTableIfMissing: true,
});

// Session configuration
app.use(
  session({
    key: "cat_session_id", // Using the same key
    secret: "cat-gallery-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
    },
  })
);

const db = {
  query: (text, params, callback) => {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }
    return pool.query(text, params, (err, res) => {
      if (err) {
        return callback(err);
      }
      return callback(null, res.rows);
    });
  },
};

function setupTables() {
  // Create users table if not exists
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `;
  db.query(createUsersTable, (err) => {
    if (err) console.error("Error creating users table:", err);
    else console.log("Users table ready");
  });

  // Check and fix sessions table for connect-pg-simple
  const checkSessionTable = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='sessions' AND column_name='sess';
  `;

  db.query(checkSessionTable, (err, res) => {
    if (err) {
      console.error("Error checking sessions table:", err);
    } else {
      if (res && res.length === 0) {
        console.log("Sessions table missing or incompatible. Recreating...");
        
        const createSessionsTable = `
          CREATE TABLE "sessions" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
          )
          WITH (OIDS=FALSE);
        `;

        db.query("DROP TABLE IF EXISTS sessions", (err) => {
          if (err) console.error("Error dropping sessions:", err);
          else {
            db.query(createSessionsTable, (err) => {
              if (err) console.error("Error creating sessions:", err);
              else {
                db.query('ALTER TABLE "sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE', (err) => {
                  if (err) console.error("Error adding pkey:", err);
                  
                  db.query('CREATE INDEX "IDX_session_expire" ON "sessions" ("expire")', (err) => {
                     if (err) console.error("Error creating index:", err);
                     else console.log("Sessions table re-initialized compatible with connect-pg-simple");
                  });
                });
              }
            });
          }
        });
      } else {
        console.log("Session store configured (table 'sessions' managed by connect-pg-simple)");
      }
    }
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
      // Note: count in PG returns string for BigInt, but count(*) is usually bigint. 
      db.query("SELECT COUNT(*) as count FROM cat", (err, results) => {
        // results is array of rows. results[0].count
        // PG driver might return it as string "0"
        if (!err && results[0] && parseInt(results[0].count) === 0) {
          const seedSql = `
            INSERT INTO cat (id, tag, img, description) 
            VALUES 
            ($1, $2, $3, $4),
            ($5, $6, $7, $8),
            ($9, $10, $11, $12)
          `;
          const values = [
            "1", "Siamese", "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=800", "Elegant and vocal, Siamese cats are known for their striking blue eyes and point coloration.",
            "2", "Bengal", "https://images.unsplash.com/photo-1513360371669-4adaa10f762b?auto=format&fit=crop&q=80&w=800", "Wild-looking with their spotted coats, Bengals are active, playful, and intelligent.",
            "3", "Persian", "https://images.unsplash.com/photo-1557008075-7f2c5efa4cfd?auto=format&fit=crop&q=80&w=800", "Known for their long, luxurious fur and sweet personalities, Persians are the royalty of the cat world."
          ];
          db.query(seedSql, values, (err) => {
            if (err) console.error("Error seeding cat data:", err);
            else console.log("Cat table seeded with sample data");
          });
        }
      });
    }
  });

  // Create adopted table if not exists
  // Using quoted identifiers to preserve camelCase for consistency with previous code if needed,
  // or simple keys. Previous code expected 'catId' and 'userId' in results.
  // In PG, unquoted names are lowercased.
  // To match SELECT a.catId... we should check what the previous code expects.
  // Previous code used `const { catId } = req.body` (input) and `SELECT a.catId` (output).
  // If we create table with "catId", we must select "catId".
  // If we create table with catId (becomes catid), we must select catid, but alias it: `catid as "catId"` to match JS.
  // Ease of use: Create with "catId".
  const createAdoptedTable = `
    CREATE TABLE IF NOT EXISTS adopted (
      id SERIAL PRIMARY KEY,
      "catId" VARCHAR(255) NOT NULL,
      "userId" INTEGER NOT NULL,
      "adoptionDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id)
    )
  `;
  db.query(createAdoptedTable, (err) => {
    if (err) console.error("Error creating adopted table:", err);
    else console.log("Adopted table ready");
  });
}

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
    const sql = "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)";

    db.query(sql, [username, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === "23505") { // Unique violation in Postgres
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

  const sql = "SELECT * FROM users WHERE username = $1";
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(401).json({ error: "Invalid username or password" });

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
    res.clearCookie("cat_session_id"); // Match the session key
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
  db.query("SELECT * FROM cat WHERE id = $1", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// PROTECTED ROUTES
app.delete("/cats/:id", isAuthenticated, (req, res) => {
  db.query("DELETE FROM cat WHERE id = $1", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${req.params.id} deleted` });
  });
});

app.post("/cats", isAuthenticated, (req, res) => {
  const { id, tag, img, description } = req.body;
  const sql = "INSERT INTO cat (id, tag, img, description) VALUES ($1, $2, $3, $4)";
  db.query(sql, [id, tag, img, description], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${id} added` });
  });
});

app.put("/cats/:id", isAuthenticated, (req, res) => {
  const { tag, img, description } = req.body;
  const sql = "UPDATE cat SET tag = $1, img = $2, description = $3 WHERE id = $4";
  db.query(sql, [tag, img, description, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Cat ${req.params.id} updated` });
  });
});

app.patch("/cats/:id", isAuthenticated, (req, res) => {
  const fields = req.body;
  if (Object.keys(fields).length === 0)
    return res.status(400).json({ error: "No fields provided" });
  
  // Construct dynamic query with specific placeholders
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  
  const setClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
  values.push(req.params.id);
  
  const sql = `UPDATE cat SET ${setClause} WHERE id = $${values.length}`;
  
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

  // Use quoted identifiers for columns created with quotes
  const sql = 'INSERT INTO adopted ("catId", "userId") VALUES ($1, $2)';
  db.query(sql, [catId, userId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Cat adopted successfully" });
  });
});

app.get("/adopted", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  // Use quoted identifiers
  // Note: a.id in PG will be integer.
  const sql = `
    SELECT a.id as "adoptionId", a."adoptionDate", c.* 
    FROM adopted a 
    JOIN cat c ON a."catId" = c.id 
    WHERE a."userId" = $1
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
