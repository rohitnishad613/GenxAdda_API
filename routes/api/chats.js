const Chat = require("../../model/Chat");
const ObjectId = require("mongodb").ObjectId;
const User = require("../../model/User");
const jwt = require("jsonwebtoken");
const key = require("../../config/keys").secret;
const fs = require("fs")
const path = require("path")

module.exports = function (io) {
  const chat = io.of("/chat");

  chat.on("connection", function (socket) {
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

    socket.join(userId);

    socket.on("GetChatter", () => {
      if (userId) {
        try {
          Chat.aggregate([
            {
              $match: {
                $or: [{ sender_id: userId }, { receiver_id: userId }],
              },
            },
            {
              $group: {
                _id: { sender_id: "$sender_id", receiver_id: "$receiver_id" },
              },
            },
            { $sort: { send_at: -1 } },
          ]).exec(function (err, chat) {
            if (err) throw err;
            else {
              User.findOne({ _id: new ObjectId(userId) }).then((user) => {
                if (user) {
                  let friends = user.friends;
                  let ids = [];
                  chat.forEach(async ({ _id }) => {
                    let id =
                      _id.sender_id == userId ? _id.receiver_id : _id.sender_id;

                    if (ids.indexOf(id) == -1 && friends.indexOf(id) != -1) {
                      ids.push(id);
                      await User.findOne({ _id: new ObjectId(id) })
                        .lean()
                        .then((data) => {
                          if (data) {
                            Chat.findOne({
                              $or: [
                                {
                                  $and: [
                                    { sender_id: userId },
                                    { receiver_id: data._id },
                                  ],
                                },
                                {
                                  $and: [
                                    { sender_id: data._id },
                                    { receiver_id: userId },
                                  ],
                                },
                              ],
                            })
                              .sort({
                                send_at: -1,
                              })
                              .then((lastchat) => {
                                data.chat = lastchat;
                                socket.emit("GetChatter", data);
                              });
                          }
                        });
                    }
                  });

                  for (let i = 0; i < friends.length; i++) {
                    if (ids.indexOf(friends[i]) == -1) {
                      User.findOne({ _id: new ObjectId(friends[i]) })
                        .then((data) => {
                          if (data) {
                                socket.emit("GetChatter", data);
                          }
                        });
                    }
                  }
                }
              });
            }
          });
        } catch (error) {
          console.log(error);
        }
      }
    });

    socket.on("chats", (data) => {
      Chat.find({
        $or: [
          {
            $and: [
              {
                sender_id: new ObjectId(data.sender_id),
              },
              {
                receiver_id: new ObjectId(data.receiver_id),
              },
              {
                send_at: { $lt: new Date(data.date) },
              },
            ],
          },
          {
            $and: [
              {
                sender_id: new ObjectId(data.receiver_id),
              },
              {
                receiver_id: new ObjectId(data.sender_id),
              },
              {
                send_at: { $lt: new Date(data.date) },
              },
            ],
          },
        ],
      })
        .limit(10)
        .sort({
          send_at: -1,
        })
        .then((data) => {
          socket.emit("chats", data);
        });
    });

    socket.on("sendMsg", function (data) {
      if (
        (data.msg ||
          data.video ||
          data.photo ||
          data.other_file) &&
        data.sender_id &&
        data.receiver_id
      ) {
        User.findOne({
          _id: new ObjectId(data.sender_id),
        }).then((res) => {
          if (res && res.friends.indexOf(data.receiver_id) != -1) {
            if (
              data.video &&
              data.video.arr_buff &&
              data.video.original_name_type
            ) {
              const name =
                Date.now() +
                data.video.original_name_type.replace(/\s/g, "") +
                path.extname(data.video.original_name_type);
              vid_buff = new Buffer(data.video.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );
              Write_stream.write(photo_buff);
              Write_stream.end();
              data.video = name;
            } else if (
              data.photo &&
              data.photo.arr_buff &&
              data.photo.original_name_type
            ) {
              const name =
                Date.now() +
                data.photo.original_name_type.replace(/\s/g, "") +
                path.extname(data.photo.original_name_type);
              photo_buff = new Buffer(data.photo.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );

              Write_stream.write(photo_buff);
              Write_stream.end();
              data.photo = name;
            } else if (
              data.other_file &&
              data.other_file.arr_buff &&
              data.other_file.original_name_type
            ) {
              const name =
                Date.now() +
                data.video.original_name_type.replace(/\s/g, "") +
                path.extname(data.video.original_name_type);
              otherFile_buff = new Buffer(data.other_file.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );
              Write_stream.write(photo_buff);
              Write_stream.end();
              data.other_file = name;
            }

            chat.to(data.receiver_id).emit("GetChatter", res);

            User.findOne({
              _id: new ObjectId(data.receiver_id),
            }).then((res) => {
              if (res && res._id) {
                chat.to(data.sender_id).emit("GetChatter", res);
              }
            });

            Chat({
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              msg: data.msg,
              video: data.video,
              other_file: data.other_file,
              photo: data.photo,
              audio: data.audio,
              send_at: new Date().toISOString(),
            }).save((err, data) => {
              if (err) throw err;
              chat.to(data.sender_id).emit("newchats", [data]);
              chat.to(data.receiver_id).emit("newchats", [data]);
            });
          }
        });
      }
    });

    socket.on("readchat", function (data) {
      Chat.updateOne(
        { _id: new ObjectId(data.chatid) },
        {
          seen: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          }
        }
      );
      chat.to(data.userid).emit("chat_is_seen", data.chatid);
    });

    socket.on("sendMsgReply", function (data) {

      if (
        (data.msg || data.video || data.photo || data.other_file) &&
        data.sender_id &&
        data.receiver_id
      ) {
        User.findOne({
          _id: new ObjectId(data.sender_id),
        }).then((res) => {
          if (res && res.friends.indexOf(data.receiver_id) != -1) {
            if (
              data.video &&
              data.video.arr_buff &&
              data.video.original_name_type
            ) {
              const name =
                Date.now() +
                data.video.original_name_type.replace(/\s/g, "") +
                path.extname(data.video.original_name_type);
              vid_buff = new Buffer(data.video.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );
              Write_stream.write(photo_buff);
              Write_stream.end();
              data.video = name;
            } else if (
              data.photo &&
              data.photo.arr_buff &&
              data.photo.original_name_type
            ) {
              const name =
                Date.now() +
                data.photo.original_name_type.replace(/\s/g, "") +
                path.extname(data.photo.original_name_type);
              photo_buff = new Buffer(data.photo.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );

              Write_stream.write(photo_buff);
              Write_stream.end();
              data.photo = name;
            } else if (
              data.other_file &&
              data.other_file.arr_buff &&
              data.other_file.original_name_type
            ) {
              const name =
                Date.now() +
                data.other_file.original_name_type.replace(/\s/g, "") +
                path.extname(data.other_file.original_name_type);
              otherFile_buff = new Buffer(data.other_file.arr_buff);
              Write_stream = fs.createWriteStream(
                "uploads/" + name
              );
              Write_stream.write(photo_buff);
              Write_stream.end();
              data.other_file = name;
            }

            chat.to(data.receiver_id).emit("GetChatter", res);

            User.findOne({
              _id: new ObjectId(data.receiver_id),
            }).then((res) => {
              if (res && res._id) {
                chat.to(data.sender_id).emit("GetChatter", res);
              }
            });

            Chat({
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              msg: data.msg,
              video: data.video,
              other_file: data.other_file,
              photo: data.photo,
              replyOf: data.replyOf,
              audio: data.audio,
              send_at: new Date().toISOString(),
            }).save((err, data) => {
              if (err) throw err;
              chat.to(data.sender_id).emit("newchats", [data]);
              chat.to(data.receiver_id).emit("newchats", [data]);
            });
          }
        });
      }
    });

    socket.on("DeleteMsgForSender", function (msgId) {
      Chat.findOneAndUpdate(
        {
          _id: new ObjectId(msgId),
        },
        {
          delete_for_sender: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          }
        }
      );
    });

    socket.on("DeleteMsgForReciver", function (msgId) {
      Chat.findOneAndUpdate(
        {
          _id: new ObjectId(msgId),
        },
        {
          delete_for_reciver: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          }
        }
      );
    });

    socket.on("DeleteForEveryone", function (data) {
      Chat.findOneAndUpdate(
        {
          _id: new ObjectId(data.msgId),
        },
        {
          delete_for_everyone: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          } else {
            chat.emit("DeleteForEveryone", {
              msgId: data.msgId,
              msgindex: data.msgindex,
            });
          }
        }
      );
    });

    socket.on("DeleteAllmsg", function (data) {
      Chat.updateMany(
        {
          $and: [{ sender_id: data.Auserid }, { receiver_id: userId }],
        },
        {
          delete_for_reciver: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          }
        }
      );

      Chat.updateMany(
        {
          $and: [{ sender_id: userId }, { receiver_id: data.Auserid }],
        },
        {
          delete_for_sender: true,
        },
        (err, res) => {
          if (err) {
            console.log(err);
          }
        }
      );
    });
  });
};
