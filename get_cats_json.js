const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "animals_db"
});

db.connect((err) => {
  if (err) {
    console.error("DB Connection Error:", err.message);
    process.exit(1);
  }
  
  db.query("SELECT * FROM cat", (err, results) => {
    if (err) {
      console.error("Query Error:", err.message);
    } else {
      console.log(JSON.stringify(results, null, 2));
    }
    db.end();
  });
});
