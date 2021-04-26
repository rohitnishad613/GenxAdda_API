const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Chat Schema
const ChatSchema = new Schema({
  sender_id: {
    type: String,
  },
  receiver_id: {
    type: String,
  },
  msg: {
    type: String,
  },
  video: {
    type: String,
  },
  photo: {
    type: String,
  },
  audio: {
    type: String,
  },
  other_file: {
    type: String,
  },
  replyOf: {
    type: Object,
  },
  delete_for_sender: {
    type: Boolean,
    default: false,
  },
  delete_for_reciver: {
    type: Boolean,
    default: false,
  },
  seen: {
    type: Boolean,
    default: false,
  },
  delete_for_everyone: {
    type: Boolean,
    default: false,
  },
  send_at: {
    type: Date,
  },
});

module.exports = Chat = mongoose.model("chats", ChatSchema);
