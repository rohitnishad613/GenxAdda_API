const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the tempUser Schema
const tempUserSchema = new Schema({
  fname: {
    type: String,
  },
  lname: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  otp:{}
});

module.exports = tempUser = mongoose.model("tempUsers", tempUserSchema);
