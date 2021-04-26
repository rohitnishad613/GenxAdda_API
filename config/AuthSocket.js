const key = require("./keys").secret;
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const User = require("../model/User");

module.exports = (socket, next) => {
  let token = socket.handshake.query.token.split(" ")[1]; // to remove the Bearer from token { required }
  if (token) {
    try {
      // verify a token symmetric
      jwt.verify(token, key, function (err, decoded) {
        if (err) throw err;
        else {
          User.findOne({ _id: new ObjectId(decoded._id) }, (err, user) => {
            if (user) {
              next();
            }
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  } else {
    // i am trying to send 401 unauthorized status code but at this time,
    // i don't  know how to do this i also read documentation there is noting
    // its not required but if we send 401 response then it is better to understand what happen in server
    // why request is rejected

    socket.disconnect();
  }
};
