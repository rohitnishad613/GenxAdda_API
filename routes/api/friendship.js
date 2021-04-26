const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../../model/User");
const ObjectId = require("mongodb").ObjectId;

findIndexofObjectProperty = (array, attr, value) => {
  let arrayLen = array.length;
  for (var i = 0; i < arrayLen; i += 1) {
    if (array[i][attr] == value) {
      return i;
    }
  }
  return -1;
};

router.get(
  "/friendssuggations",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      (async () => {
        let requser = req.user;

        let someuser = await User.find({});
        let someuserLen = someuser.length;
        let user = [];
        // check that the requested user block that user

        for (let i = 0; i < someuserLen; i++) {
          if (
            someuser[i]._id.toString() != requser._id.toString() &&
            requser.blocked_users.indexOf(someuser[i]._id) == -1 &&
            requser.friends.indexOf(someuser[i]._id) == -1 &&
            findIndexofObjectProperty(
              requser.friends_req_send,
              "id",
              someuser[i]._id
            ) == -1 &&
            findIndexofObjectProperty(
              requser.friends_req_received,
              "id",
              someuser[i]._id
            ) == -1
          ) {
            user.push(someuser[i]);
          }
        }

        return res.status(200).json({
          friendssuggations: user,
        });
      })();
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/friendrequests",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findOne(
        {
          _id: new ObjectId(req.user._id),
        },
        (err, user) => {
          if (err) throw err;
          else if (user) {
            (async () => {
              const promises = [];
              let requests = req.user.friends_req_received;
              let requestsLen = requests.length;
              for (let i = 0; i < requestsLen; i++) {
                let acc = User.findOne({ _id: new ObjectId(requests[i].id) });
                promises.push(acc);
              }
              const Userrequests = await Promise.all(promises);

              return res.status(200).json({
                friendsrequest: Userrequests,
              });
            })();
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/myfriendsrequests",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findOne(
        {
          _id: new ObjectId(req.user._id),
        },
        (err, user) => {
          if (err) throw err;
          else if (user) {
            (async () => {
              const promises = [];
              let requests = req.user.friends_req_send;
              let requestsLen = requests.length;
              for (let i = 0; i < requestsLen; i++) {
                const acc = User.findOne({ _id: new ObjectId(requests[i].id) });
                promises.push(acc);
              }
              const Userrequests = await Promise.all(promises);
              return res.status(200).json({
                myfriendsrequest: Userrequests,
              });
            })();
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.post(
  "/request/:requestedId",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findOne({ _id: new ObjectId(req.params.requestedId) }).then(
        (user) => {
          if (
            (user.blocked_users.indexOf(req.user._id) == -1 &&
              user.who_send_friendReq == "Everyone") ||
            (user.who_send_friendReq == "Only Followers" &&
              req.user.followers.indexOf(user._id) != -1)
          ) {
            const requser = req.user._id.toString();
            const requesteduser = req.params.requestedId.toString();
            const currentDateTime = new Date().toISOString();
            User.findByIdAndUpdate(
              {
                _id: new ObjectId(requser),
              },
              {
                $addToSet: {
                  friends_req_send: [
                    {
                      id: requesteduser,
                      send_at: currentDateTime,
                    },
                  ],
                },
              },
              (err, data) => {
                if (err) throw err;
              }
            );
            User.findByIdAndUpdate(
              {
                _id: new ObjectId(requesteduser),
              },
              {
                $addToSet: {
                  friends_req_received: [
                    {
                      id: requser,
                      receive_at: currentDateTime,
                    },
                  ],
                },
              },
              (err, data) => {
                if (err) throw err;
                else {
                  let adminId = data._id.toString();

                  let notification = [
                    {
                      userId: adminId,
                      url: req.user._id,
                      img: req.user.profilePic,
                      msg: `${req.user.fname} send friend request to you.`,
                      at: new Date().toISOString(),
                    },
                  ];

                  global.sendNotification(notification, adminId);
                }
              }
            );
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/cancelrequest/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              friends_req_send: {
                id: requesteduser,
              },
            },
          },
          (err, data) => {
            if (err) throw err;
          }
        );

        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $pull: {
              friends_req_received: {
                id: requser,
              },
            },
          },
          (err, data) => {
            if (err) throw err;
            else {
              let adminId = data._id.toString();

              let notification = [
                {
                  userId: adminId,
                  url: req.user._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} cancel the friend request that he/she sends  you.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.post(
  "/acceptrequest/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $addToSet: {
              friends: [requesteduser],
            },
            $inc: { friend_count: 1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $addToSet: {
              friends: [requser],
            },
            $inc: { friend_count: 1 },
          },
          (err, data) => {
            if (err) throw err;
            else {
              let adminId = data._id.toString();

              let notification = [
                {
                  userId: adminId,
                  url: req.user._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} accept the friend request that you sended.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
        // auto follow
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $addToSet: {
              followers: [requesteduser],
            },
            $inc: { followers_count: 1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $addToSet: {
              followers: [requser],
            },
            $inc: { followers_count: 1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        // deleting the requests
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              friends_req_received: {
                id: requesteduser,
              },
            },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $pull: {
              friends_req_send: {
                id: requser,
              },
            },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/deleterequest/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              friends_req_received: {
                id: requesteduser,
              },
            },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $pull: {
              friends_req_send: {
                id: requser,
              },
            },
          },
          (err, data) => {
            if (err) throw err;
            else {
              let adminId = data._id.toString();

              let notification = [
                {
                  userId: adminId,
                  url: req.user._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} accept the friend request that you sended.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/unfriend/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              friends: requesteduser,
            },
            $inc: { friend_count: -1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $pull: {
              friends: requser,
            },
            $inc: { friend_count: -1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        // remove auto follow
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              followers: requesteduser,
            },
            $inc: { followers_count: -1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requesteduser),
          },
          {
            $pull: {
              followers: requser,
            },
            $inc: { followers_count: -1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.put(
  "/follow/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        // remove auto follow
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $addToSet: {
              followers: [requesteduser],
            },
            $inc: { followers_count: 1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/unfollow/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.id) {
        const requser = req.user._id.toString();
        const requesteduser = req.params.id.toString();
        // remove auto follow
        User.findByIdAndUpdate(
          {
            _id: new ObjectId(requser),
          },
          {
            $pull: {
              followers: requesteduser,
            },
            $inc: { followers_count: -1 },
          },
          (err, res) => {
            if (err) throw err;
          }
        );
        res.sendStatus(200);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

module.exports = router;
