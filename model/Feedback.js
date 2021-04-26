const mongoose = require("mongoose");
const Schema = mongoose.Schema;


// Create the Feedback Schema
const FeedbackSchema = new Schema({
    sender_id:{
        type: String
    },
    type: {
        type: String
    },
    detail:{
        type: String
    },
});

module.exports = Feedback = mongoose.model("Feedbacks", FeedbackSchema);