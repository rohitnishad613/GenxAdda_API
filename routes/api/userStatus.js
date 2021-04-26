const User = require("../../model/User");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
const key = require("../../config/keys").secret;

module.exports = function (io) {
  const user_status = io.of("/user_status");

  user_status.on("connection", function (socket) {
    let userId;
    let token = socket.handshake.query.token.split(" ")[1]; // to remove the Bearer from token { required }
    try {
      // verify a token symmetric
      jwt.verify(token, key, function (err, decoded) {
        if (err) throw err;
        else {
          userId = decoded._id;
        }
      });
    } catch (error) {
      console.log(error);
    }

    User.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        status: "Active",
      },
      (err, user) => {
        if (err) throw err;
      }
    );
    
    socket.on("disconnect", (reason) => {
      User.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          status: "Not Active",
        },
        (err, user) => {
          if (err) throw err;
        }
      );
    })

  });
};
