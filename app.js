const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
// Initialize the server
const app = express();
const server = require("http").Server(app);
// for socket.io
const io = require("socket.io")(server, {
  cors: {
    origin: "*"
  }
});
// Middlewares

app.use(express.static(__dirname + "/uploads"));

// mongoese deprecations
mongoose.set("useFindAndModify", false);

// Form Data Middleware
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// Json Body Middleware
app.use(bodyParser.json());

// Cors Middleware
app.use(cors({origin: '*'}));
// Use the passport Middleware
app.use(passport.initialize());
// Bring in the Passport Strategy
require("./config/passport")(passport);

io.use(require("./config/AuthSocket"));

// Bring in the Database Config and connect with thec database
const db = require("./config/keys").mongoURI;
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log(`Database connected successfully`);
  })
  .catch((err) => {
    console.log(`Unable to connect with the database\n${err}`);
  });

// Bring in the unseen counts
const unseen = require("./routes/api/unseen");
app.use("/api/unseen", unseen);

// Bring the user status (online or not)
require("./routes/api/userStatus.js")(io);

// Bring in the Users route
const users = require("./routes/api/users");
app.use("/api/users", users);

// Bring in the Notifications
require("./routes/api/SocketNotification")(io);

// Bring in the posts route
const posts = require("./routes/api/posts");
app.use("/api/posts", posts);

// Bring in the playlists route
const playlists = require("./routes/api/playlists");
app.use("/api/playlists", playlists);

// Bring in the Friends route
const friend = require("./routes/api/friendship");
app.use("/api/friends", friend);

// Bring in the Status route
const status = require("./routes/api/status");
app.use("/api/status", status);

// Bring in the Events route
const events = require("./routes/api/events");
app.use("/api/events", events);

// Bring in the Pages route
const pages = require("./routes/api/pages");
app.use("/api/pages", pages);

// Bring in the Group route
const groups = require("./routes/api/groups");
app.use("/api/groups", groups);

// Bring in the notifications route
const notifications = require("./routes/api/notifications");
app.use("/api/notifications", notifications);

// Bring in the Feedback route
const feedbacks = require("./routes/api/feedbacks");
app.use("/api/feedbacks", feedbacks);

// Bring in the Report route
const reports = require("./routes/api/reports");
app.use("/api/reports", reports);

// Bring in the Search route
const search = require("./routes/api/search");
app.use("/api/search", search);

// Bring in the chats
require("./routes/api/chats.js")(io);

// error handle
app.use((err, req, res, next) => {
  if (err.code == "LIMIT_FILE_SIZE") {
    res.status(422).json({
      err: err.message,
    });
    return;
  } else if (err) {
    res.status(422).json({
      err,
    });
    return;
  }
});
const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
