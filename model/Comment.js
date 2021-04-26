const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Comment Schema
const CommentSchema = new Schema({
  post_id: {
    type: String
  },
  comment_id: {
    type: String
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  comment: {
    type: String
  },
  comment_img: {
    type: String
  },
  comment_gif: {
    type: String
  },
  likes: {
    type: Array
  },

  commentReply: {
    type: Number
  },

  tag_users_id: {
    type: Array
  }
});

module.exports = Comment = mongoose.model("Comments", CommentSchema);
