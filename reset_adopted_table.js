const { Pool } = require("pg");
require("dotenv").config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes("6543")) {
  try {
    const url = new URL(connectionString);
    url.port = "5432";
    connectionString = url.toString();
  } catch (e) {}
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const dropSql = `DROP TABLE IF EXISTS adopted`;
const createSql = `
    CREATE TABLE adopted (
      id SERIAL PRIMARY KEY,
      "catId" VARCHAR(255) NOT NULL,
      "userId" INTEGER NOT NULL,
      "adoptionDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id)
    )
`;

pool.query(dropSql, (err) => {
  if (err) console.error("Error dropping:", err);
  else {
    console.log("Dropped adopted table.");
    pool.query(createSql, (err) => {
      if (err) console.error("Error creating:", err);
      else console.log("Recreated adopted table with correct schema.");
      pool.end();
    });
  }
});
