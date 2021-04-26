const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Notification Schema
const NotificationSchema = new Schema({
  userId: {
    type: String,
  },
  url: {
    type: String,
  },
  img: {
    type: String,
  },
  msg: {
    type: String,
  },
  seen: {
    type: String,
  },
  at: {
    type: Date,
  },
});

NotificationSchema.index({ at: -1 });

module.exports = Notification = mongoose.model(
  "notifications",
  NotificationSchema
);
