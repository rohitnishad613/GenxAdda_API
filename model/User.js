const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the User Schema
const UserSchema = new Schema({
  fname: {
    type: String,
  },
  status: {
    type: String,
    default: "Not Active",
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
  profilePic: {
    type: String,
  },
  coverPhoto: {
    type: String,
  },
  about: {
    type: String,
  },
  dob: {
    type: Date,
  },
  phone: {
    type: Number,
  },
  username: {
    type: String,
  },
  friends: {
    type: Array,
  },
  resetPasswordOTP: {
    type: String,
  },
  expire_resetPasswordOTP: {
    type: Date,
  },
  friends: {
    type: Array,
  },
  friend_count: {
    type: Number,
    default: 0,
  },
  followers: {
    type: Array,
  },
  followers_count: {
    type: Number,
    default: 0,
  },
  friends_req_send: {
    type: Array,
  },
  friends_req_received: {
    type: Array,
  },
  lang: {
    type: String,
  },
  // privacy settings
  who_send_friendReq: {
    type: String,
  },
  who_see_friendList: {
    type: String,
  },
  who_see_posts: {
    type: String,
  },
  // bloacking
  blocked_pages: {
    type: Array,
  },
  blocked_groups: {
    type: Array,
  },
  blocked_users: {
    type: Array,
  },
});

module.exports = User = mongoose.model("users", UserSchema);
