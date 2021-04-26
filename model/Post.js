const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Post Schema
const PostSchema = new Schema({
  admin: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  pageid: {
    type: String,
  },
  groupid: {
    type: String,
  },
  // if type is Text, photo,video, audio etc
  photo: {
    type: String,
  },
  video: {
    type: String,
  },
  audio: {
    type: String,
  },
  text: {
    type: String,
  },
  // end
  date: {
    type: Date,
  },
  likes: {
    type: Array,
  },
  comments: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Array,
  },
  who_can_see: {
    type: String,
  },
});

PostSchema.index({ date: -1 });

module.exports = Post = mongoose.model("posts", PostSchema);
