const mongoose = require("mongoose");
const Schema = mongoose.Schema;


// Create the Group Schema
const GroupSchema = new Schema({
    admin_id:{
        type: String
    },
    name: {
        type: String
    },
    description:{
        type: String
    },
    photo:{
        type: String
    },
    cover_photo:{
        type: String
    },
    category:{
        type: String
    },
    email:{
        type: String
    },
    phoneNumber:{
        type: String
    },
    address:{
        street: String,
        state: String,
        country:String
    },
    joined: {
        type: Array
    },
    joined_count:{
        type: Number,
        default: 0
    },
    who_can_post:{
        type: String
    }

});

module.exports = Group = mongoose.model("Groups", GroupSchema);