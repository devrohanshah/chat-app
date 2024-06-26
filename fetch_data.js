const sqlite3 = require("sqlite3").verbose();

// Connect to the database
const db = new sqlite3.Database("chat.db");

// Query the database
db.serialize(() => {
  db.all("SELECT * FROM messages", (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    rows.forEach((row) => {
      console.log(`${row.timestamp} - ${row.username}: ${row.message}`);
    });
  });
});

// Close the database connection
db.close();
