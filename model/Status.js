const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const users = require("./User");

// Create the Status Schema
const StatusSchema = new Schema({
  admin: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  description: {
    type: String,
  },
  photo: {
    type: String,
  },
  video: {
    type: String,
  },
  text: {
    type: String,
  },
  viewed: {
    type: Array,
  },
  date: {
    type: Date,
  },
});

StatusSchema.index({ date: 1 }, { expireAfterSeconds: 60 });

module.exports = Status = mongoose.model("Status", StatusSchema);
