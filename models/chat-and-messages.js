const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Схема "Чат"
const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Ссылка на схему "Пользователь"
      },
    ],
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);

// Схема "Сообщение"
const messageSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Ссылка на схему "Пользователь"
    },
    senderName: {
      type: String,
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat", // Ссылка на схему "Чат"
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = { Chat, Message };
