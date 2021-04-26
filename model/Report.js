const mongoose = require("mongoose");
const Schema = mongoose.Schema;


// Create the Report Schema
const ReportSchema = new Schema({
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

module.exports = Report = mongoose.model("Reports", ReportSchema);