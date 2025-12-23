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

const sql = `
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'adopted';
`;

pool.query(sql, (err, res) => {
  if (err) console.error(err);
  else {
    console.log("Columns in 'adopted':");
    console.table(res.rows);
  }
  pool.end();
});
