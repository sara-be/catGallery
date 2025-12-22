const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "animals_db"
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    process.exit(1);
  }
  console.log("MySQL connected!");
  
  db.query("SHOW TABLES", (err, results) => {
    if (err) {
      console.error("Error showing tables:", err);
      process.exit(1);
    }
    console.log("Tables:", results);
    
    db.query("SELECT * FROM cat", (err, results) => {
      if (err) {
        console.error("Error selecting from cat:", err.message);
      } else {
        console.log("Cat count:", results.length);
        console.log("Cats:", results);
      }
      db.end();
    });
  });
});
