const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create the Event Schema
const EventSchema = new Schema({
  host: {
    type: String,
  },
  host_id: {
    type: String,
  },
  event_name: {
    type: String,
  },
  description: {
    type: String,
  },
  photos: {
    type: String,
  },
  eventURL: {
    type: String,
  },
  start_time: {
    type: Date,
  },
  end_time: {
    type: Date,
  },
  start_date: {
    type: Date,
  },
  end_date: {
    type: Date,
  },
  location: {
    type: String,
  },
  joined: {
    type: Array,
  },
});

module.exports = Event = mongoose.model("Events", EventSchema);
