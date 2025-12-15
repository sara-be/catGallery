const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

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
});

// ==========================================
// GET ALL CATS
// ==========================================
app.get("/cats", (req, res) => {
  const sql = "SELECT * FROM cat";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    res.json(results);
  });
});

// ==========================================
// GET A CAT BY ID
// ==========================================
app.get("/cats/:id", (req, res) => {
  db.query(
    "SELECT * FROM cat WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });

      res.json(results);
    }
  );
});

// ==========================================
// DELETE CAT BY ID
// ==========================================
app.delete("/cats/:id", (req, res) => {
  db.query(
    "DELETE FROM cat WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });

      res.json({ message: `Cat ${req.params.id} deleted` });
    }
  );
});

// ==========================================
// POST - ADD NEW CAT
// ==========================================
app.post("/cats", (req, res) => {
  const { id, tag, img, description } = req.body;

  const sql = `
    INSERT INTO cat (id, tag, img, description)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [id, tag, img, description], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: `Cat ${id} added` });
  });
});

// ==========================================
// PUT - FULL UPDATE
// ==========================================
app.put("/cats/:id", (req, res) => {
  const { tag, img, description } = req.body;

  const sql = `
    UPDATE cat 
    SET tag = ?, img = ?, description = ?
    WHERE id = ?
  `;

  db.query(sql, [tag, img, description, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: `Cat ${req.params.id} updated` });
  });
});

// ==========================================
// PATCH - PARTIAL UPDATE (ANY FIELD)
// ==========================================
app.patch("/cats/:id", (req, res) => {
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No fields provided for update" });
  }

  const setClause = Object.keys(fields)
    .map((key) => `${key} = ?`)
    .join(", ");

  const values = [...Object.values(fields), req.params.id];

  const sql = `
    UPDATE cat
    SET ${setClause}
    WHERE id = ?
  `;

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: `Cat ${req.params.id} partially updated` });
  });
});

// Start server 
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
