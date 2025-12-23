const { Pool } = require("pg");
require("dotenv").config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes("6543")) {
  try {
    const url = new URL(connectionString);
    console.log(`[DB] Switching from Transaction Pooler (6543) to Session Pooler (5432)`);
    url.port = "5432";
    connectionString = url.toString();
  } catch (e) { console.warn(e); }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const alterUsers = `
  ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(255);
  ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
  ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);
`;

pool.query(alterUsers, (err, res) => {
  if (err) {
    console.error("Error altering users table:", err);
  } else {
    console.log("Users table schema updated to VARCHAR(255)");
  }
  pool.end();
});
