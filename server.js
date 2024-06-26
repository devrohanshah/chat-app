const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const dbPath = path.join(__dirname, ".render", "chat.db");
const db = new sqlite3.Database(dbPath); // Persistent file-based database

// Create tables for storing messages and users
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS messages (room TEXT, username TEXT, message TEXT, type TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
  db.run("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY)");
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    // Store username in the database if it doesn't exist
    db.run(
      "INSERT OR IGNORE INTO users (username) VALUES (?)",
      [username],
      (err) => {
        if (err) {
          console.error(err.message);
        }
      }
    );

    // Retrieve old messages from the database
    db.all(
      "SELECT rowid, username, message, type, content, timestamp FROM messages WHERE room = ? ORDER BY timestamp",
      [room],
      (err, rows) => {
        if (err) {
          console.error(err.message);
          return;
        }
        // Send old messages to the user who just joined
        socket.emit("old messages", rows);
      }
    );

    // Notify room about the new user
    io.to(room).emit("chat message", {
      username,
      message: `${username} has joined the room`,
    });
  });

  socket.on("chat message", ({ room, username, message, type, content }) => {
    // Save message to the database
    db.run(
      "INSERT INTO messages (room, username, message, type, content) VALUES (?, ?, ?, ?, ?)",
      [room, username, message, type, content],
      function (err) { // Changed to function to access `this.lastID`
        if (err) {
          console.error(err.message);
          return;
        }
        // Broadcast message to the room
        io.to(room).emit("chat message", { rowid: this.lastID, username, message, type, content });
      }
    );
  });

  socket.on("delete message", ({ messageId }) => {
     const username = socket.username; // Get the username associated with this socket
    const room = socket.room; // Get the room associated with this socket
    
    db.get(
      "SELECT username FROM messages WHERE rowid = ?",
      [messageId],
      (err, row) => {
        if (err) {
          console.error(err.message);
          return;
        }

        // Check if the user requesting deletion is the message sender
        if (row && row.username === username) {
          db.run("DELETE FROM messages WHERE rowid = ?", [messageId], (err) => {
            if (err) {
              console.error(err.message);
              return;
            }
            // Notify room about the deleted message
            io.to(room).emit("message deleted", { messageId });
          });
        } else {
          console.log("Unauthorized deletion attempt");
        }
      }
    );
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
