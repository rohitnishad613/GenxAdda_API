const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Playlist Schema
const PlaylistSchema = new Schema({
    playlist_name: {
        type: String,
    },
    user_id: {
        type: String
    },
    saved_posts: {
        type: Array
    }
});

module.exports = Playlist = mongoose.model("Playlists", PlaylistSchema);