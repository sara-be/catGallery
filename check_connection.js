const { Pool } = require("pg");
require("dotenv").config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes("6543")) {
  try {
    const url = new URL(connectionString);
    console.log(`[DB] Testing connection to Session Pooler (5432)`);
    url.port = "5432";
    connectionString = url.toString();
  } catch (e) { console.warn(e); }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // Fail fast
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Connection Failed:", err.message);
  } else {
    console.log("Connection Success:", res.rows[0]);
    
    // Check tables
    const checkTables = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    pool.query(checkTables, (err, res) => {
      if(err) console.error(err);
      else {
          console.log("Tables found:", res.rows.map(r => r.table_name));
          // Check adopted schema
          pool.query("SELECT * FROM adopted LIMIT 0", (err, res) => {
              if(err) console.error("Adopted table error:", err.message);
              else console.log("Adopted table accessible");
              pool.end();
          });
      }
    });
  }
});
