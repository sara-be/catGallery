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

pool.query("SELECT * FROM adopted", (err, res) => {
  if (err) console.error("Error querying adopted:", err);
  else {
    console.log("Adopted Table Content:", JSON.stringify(res.rows, null, 2));
    if (res.rows.length > 0) {
      console.log("First row keys:", Object.keys(res.rows[0]));
    }
  }
  
  pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'adopted'`, (err, res) => {
      console.log("Schema:", JSON.stringify(res.rows, null, 2));
      pool.end();
  });
});
