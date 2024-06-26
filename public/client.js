const socket = io();

const joinSection = document.getElementById("join-section");
const joinForm = document.getElementById("join-form");
const chatSection = document.getElementById("chat-section");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const fileInput = document.getElementById("file-input");
const messages = document.getElementById("messages");
const messageContainer = document.getElementById("message-container");
const emojiPicker = document.getElementById("emoji-picker");
let username, room;

joinSection.style.display = "block";

joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  username = document.getElementById("username").value;
  room = document.getElementById("room").value;
  socket.emit("join room", { username, room });
  joinSection.style.display = "none";
  chatSection.style.display = "block";
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  const file = fileInput.files[0];

  if (message.trim() || file) {
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const content = event.target.result;
        socket.emit("chat message", {
          room,
          username,
          type: file.type,
          content,
        });
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("chat message", { room, username, message });
    }
    messageInput.value = "";
    fileInput.value = "";
  }
});

socket.on("old messages", (msgs) => {
  msgs.forEach((msg) => {
    displayMessage(msg);
  });
});

socket.on("chat message", (msg) => {
  displayMessage(msg);
});

function displayMessage(msg) {
  const item = document.createElement("li");
  item.classList.add("message");
  if (msg.type && msg.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = msg.content;
    item.appendChild(img);
  } else if (msg.type && msg.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = msg.content;
    video.controls = true;
    item.appendChild(video);
  } else {
    item.textContent = `${msg.username}: ${msg.message}`;
  }
  messages.appendChild(item);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

document.addEventListener("click", (e) => {
  if (
    !emojiPicker.contains(e.target) &&
    !e.target.classList.contains("emojis")
  ) {
    emojiPicker.style.display = "none";
  }
});

function addEmoji(emoji) {
  const input = messageInput;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value =
    input.value.substring(0, start) + emoji + input.value.substring(end);
  input.focus();
  input.setSelectionRange(start + emoji.length, start + emoji.length);
}

document.querySelector(".emojis").addEventListener("click", () => {
  emojiPicker.style.display =
    emojiPicker.style.display === "block" ? "none" : "block";
});

function displayMessage(msg) {
  const item = document.createElement("li");
  item.classList.add("message");

  if (msg.type && msg.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = msg.content;
    item.appendChild(img);
  } else if (msg.type && msg.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = msg.content;
    video.controls = true;
    item.appendChild(video);
  } else {
    item.textContent = `${msg.username}: ${msg.message}`;
  }

  // Check if current user is the room creator
  if (username === msg.username) {
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-button");
    deleteButton.addEventListener("click", () => {
      socket.emit("delete message", { messageId: msg.rowid }); // Emit delete message event
      item.remove();
    });
    item.appendChild(deleteButton);
  }

  messages.appendChild(item);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
