const express = require("express");
const router = express.Router();
const passport = require("passport");
const bodyParser = require("body-parser");
const path = require("path");
const Post = require("../../model/Post");
const Page = require("../../model/Page");
const Group = require("../../model/Group");
const Comment = require("../../model/Comment");
const multer = require("multer");
const fs = require("fs");
const app = express();
const ObjectId = require("mongodb").ObjectId;

// Form Data Middleware
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// Json Body Middleware
app.use(bodyParser.json());

// setup multer for file uploading

const storage = multer.diskStorage({
  destination: "./uploads",
  // function to set the name of file that will be saved in disk
  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() +
        file.originalname.replace(/\s/g, "") +
        path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
  // filter file extensions
  fileFilter: function (req, file, callback) {
    let ext = path.extname(file.originalname);
    if (
      ext !== ".png" &&
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".mp4" &&
      ext !== ".mkv" &&
      ext !== ".mov" &&
      ext !== ".mp3" &&
      ext !== ".wav" &&
      ext !== ".mpeg"
    ) {
      let error = "File type is not supported!";
      return callback(error, false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.post(
  "/post",
  upload.any(),
  passport.authenticate("jwt", {
    session: false,
  }),
  async (req, res) => {
    try {
      let files = req.files;
      let pageid;
      let groupid;

      if (req.body.pageid) {
        await Page.findOne(
          { _id: new ObjectId(req.body.pageid.toString()) },
          (err, page) => {
            if (err) throw err;
            else if (
              page.who_can_post == "Anyone" ||
              page.who_can_post == "Publish after my review"
            ) {
              pageid = req.body.pageid;
            }
          }
        );
      }

      if (req.body.groupid) {
        await Group.findOne(
          { _id: new ObjectId(req.body.groupid) },
          (err, group) => {
            if (err) throw err;
            else if (
              group.who_can_post == "Anyone" ||
              group.who_can_post == "Publish after my review"
            ) {
              groupid = req.body.groupid;
            }
          }
        );
      }

      // posting files
      let FileLen = files.length;
      if (FileLen > 0) {
        for (let i = 0; i < FileLen; i++) {
          let type = files[i].fieldname;
          switch (type) {
            case "video":
              Post({
                admin: req.user._id.toString(),
                pageid: pageid,
                groupid: groupid,
                video: files[i].filename,
                who_can_see: req.body.who_can_see,
                text: req.body.text,
                date: new Date().toISOString(),
              }).save((err, data) => {
                if (err) throw err;
                else {
                  res.status(200).json({ insertedPost: data });
                }
              });
              break;
            case "audio":
              Post({
                admin: req.user._id.toString(),
                pageid: pageid,
                groupid: groupid,
                audio: files[i].filename,
                who_can_see: req.body.who_can_see,
                text: req.body.text,
                date: new Date().toISOString(),
              }).save((err, data) => {
                if (err) throw err;
                else {
                  res.status(200).json({ insertedPost: data });
                }
              });
              break;
            case "photo":
              Post({
                admin: req.user._id.toString(),
                pageid: pageid,
                groupid: groupid,
                photo: files[i].filename,
                who_can_see: req.body.who_can_see,
                text: req.body.text,
                date: new Date().toISOString(),
              }).save((err, data) => {
                if (err) {
                  throw err;
                } else {
                  res.status(200).json({ insertedPost: data });
                }
              });

              break;
          }
        }
      } else if (req.body.text) {
        Post({
          admin: req.user._id.toString(),
          pageid: pageid,
          groupid: groupid,
          who_can_see: req.body.who_can_see,
          text: req.body.text,
          date: new Date().toISOString(),
        }).save((err, data) => {
          if (err) throw err;
          else {
            res.status(200).json({ insertedPost: data });
          }
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

router.get(
  "/:date/post",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    Post.findOne({
      $or: [
        {
          $and: [
            { date: { $lt: new Date(req.params.date) } },
            { who_can_see: "Public" },
            { admin: { $in: req.user.friends } }
          ]
        },
        {
          $and: [
            { date: { $lt: new Date(req.params.date) } },
            { who_can_see: "Friends" },
            { admin: { $in: req.user.friends } },
          ]
        }
      ],
    }).then((doc) => {
      if (!doc) {
        res.json({ err: "Post not found" });
      } else if (doc) {
        Post.populate(
          doc,
          {
            path: "admin",
            model: "users",
            select: {
              "password": 0,
              "friends_req_send": 0,
              "friends_req_received": 0,
              "blocked_pages": 0,
              "blocked_groups": 0,
              "blocked_users": 0,
            },
          },
          (err, data) => {
            if (err) throw err;
            return res.status(200).json({
              post: data,
            });
          }
        );
      }
    });
  }
);

router.get(
  "/:date/public-feed-post",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    Post.findOne({
      $and: [
        { date: { $lt: new Date(req.params.date) } },
        { who_can_see: "Public" },
      ],
    }).then((doc) => {
      if (!doc) {
        res.json({ err: "Post not found" });
      } else if (doc) {
        Post.populate(
          doc,
          {
            path: "admin",
            model: "users",
            select: {
              password: 0,
              friends_req_send: 0,
              friends_req_received: 0,
              blocked_pages: 0,
              blocked_groups: 0,
              blocked_users: 0,
            },
          },
          (err, data) => {
            if (err) throw err;
            return res.status(200).json({
              post: data,
            });
          }
        );
      }
    });
  }
);

router.get(
  "/post/:postid",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    Post.findOne({
      _id: new ObjectId(req.params.postid),
    }).then((doc) => {
      if (!doc) {
        res.status(404).json({ err: "Post not found" });
      } else if (doc) {
        Post.populate(
          doc,
          {
            path: "admin",
            model: "users",
            select: {
              password: 0,
              friends_req_send: 0,
              friends_req_received: 0,
              blocked_pages: 0,
              blocked_groups: 0,
              blocked_users: 0,
            },
          },
          (err, data) => {
            let adminId = data.admin._id.toString();
            let userId = req.user._id.toString();
            if (err) throw err;
            else if (data.who_can_see == "Public" || adminId == userId) {
              return res.status(200).json({
                post: data,
              });
            } else if (
              data.who_can_see == "Friends" &&
              data.admin.friends.indexOf(userId) != -1
            ) {
              return res.status(200).json({
                post: data,
              });
            } else if (
              data.who_can_see == "Followers" &&
              req.user.followers.indexOf(adminId) != -1
            ) {
              return res.status(200).json({
                post: data,
              });
            } else {
              res.status(404).json({ err: "Post not found" });
            }
          }
        );
      }
    });
  }
);

router.post(
  "/addlike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { likes: [req.user.id] } },
        (err, data) => {
          if (err) {
            res.send(err);
          } else {
            res.sendStatus(200);

            let adminId = data.admin.toString();

            let notification = [
              {
                userId: adminId,
                url: "post/" + data._id,
                img: req.user.profilePic,
                msg: `${req.user.fname} likes your post.`,
                at: new Date().toISOString(),
              },
            ];

            global.sendNotification(notification, adminId);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/removelike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { likes: req.user.id } },
        function (err, result) {
          if (err) {
            res.send(err);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/comments/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    Comment.find({ post_id: req.params.id }).then((doc) => {
      if (doc) {
        Post.populate(
          doc,
          {
            path: "admin",
            model: "users",
            select: {
              password: 0,
              friends_req_send: 0,
              friends_req_received: 0,
              blocked_pages: 0,
              blocked_groups: 0,
              blocked_users: 0,
            },
          },
          (err, data) => {
            if (err) throw err;
            else {
              return res.status(200).json({
                comments: data,
              });
            }
          }
        );
      }
    });
  }
);

router.post(
  "/addcomments/:id",
  upload.single("commentimg"),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    if (req.file) {
      try {
        Post.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { comments: 1 } },
          (error, data) => {
            if (error) {
              console.log(error);
            } else {
              let adminId = data.admin.toString();

              let notification = [
                {
                  userId: adminId,
                  url: "post/" + data._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} commented on your post.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
        Comment({
          post_id: req.params.id,
          admin: req.user._id.toString(),
          comment: req.body.commentText,
          comment_img: `/uploads/${req.file.filename}`,
          comment_gif: req.body.gif,
        }).save(function (err, data) {
          res.status(200).json({ insertedCommentID: data._id });
        });
        Post.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          {
            $inc: { comments: 1 },
          },
          (error, data) => {
            if (error) {
              console.log(error);
            } else {
              let adminId = data.admin.toString();

              let notification = [
                {
                  userId: adminId,
                  url: "post/" + data._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} commented on your post.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        Post.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { comments: 1 } },
          (error, data) => {
            if (error) {
              console.log(error);
            } else {
              let adminId = data.admin.toString();

              let notification = [
                {
                  userId: adminId,
                  url: "post/" + data._id,
                  img: req.user.profilePic,
                  msg: `${req.user.fname} commented on your post.`,
                  at: new Date().toISOString(),
                },
              ];

              global.sendNotification(notification, adminId);
            }
          }
        );
        Comment({
          post_id: req.params.id,
          admin: req.user._id.toString(),
          comment: req.body.commentText,
          comment_gif: req.body.gif,
        }).save(function (err, data) {
          res.status(200).json({ insertedCommentID: data._id });
        });
      } catch (error) {
        console.log(error);
      }
    }
  }
);

router.post(
  "/addcommentslike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Comment.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { likes: [req.user.id] } },
        function (err, data) {
          if (err) {
            res.send(err);
          } else {
            res.sendStatus(200);
            let adminId = data.admin.toString();

            let notification = [
              {
                userId: adminId,
                url: "post/comment/" + data._id,
                img: req.user.profilePic,
                msg: `${req.user.fname} like on your comment.`,
                at: new Date().toISOString(),
              },
            ];
            global.sendNotification(notification, adminId);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/removecommentslike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Comment.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { likes: req.user.id } },
        function (err, result) {
          if (err) {
            res.send(err);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/addsubcommentslike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Comment.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { likes: [req.user.id] } },
        function (err, data) {
          if (err) {
            res.send(err);
          } else {
            res.sendStatus(200);
            let adminId = data.admin.toString();

            let notification = [
              {
                userId: adminId,
                url: "",
                img: req.user.profilePic,
                msg: `${req.user.fname} commented on your post.`,
                at: new Date().toISOString(),
              },
            ];

            global.sendNotification(notification, adminId);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/removesubcommentslike/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Comment.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { likes: req.user.id } },
        function (err, result) {
          if (err) {
            res.send(err);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.put(
  "/turnoffcomment/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { comments: -1 },
        (err, data) => {
          if (err) {
            console.log(err);
          } else {
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.put(
  "/turnoncomment/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { comments: 0 },
        (err, data) => {
          if (err) {
            console.log(err);
          } else {
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/commmentreply/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    Comment.find({ comment_id: req.params.id }).then((doc) => {
      if (doc) {
        Post.populate(
          doc,
          {
            path: "admin",
            model: "users",
            select: {
              password: 0,
              friends_req_send: 0,
              friends_req_received: 0,
              blocked_pages: 0,
              blocked_groups: 0,
              blocked_users: 0,
            },
          },
          (err, data) => {
            if (err) throw err;
            else {
              return res.status(200).json({
                comments: data,
              });
            }
          }
        );
      }
    });
  }
);

router.post(
  "/addcommmentreply/:id",
  upload.single("commentimg"),
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req.file) {
      try {
        Comment({
          admin: req.user._id.toString(),
          comment_id: req.params.id,
          user_id: req.user.id,
          comment: req.body.commentText,
          comment_img: `/uploads/${req.file.filename}`,
          comment_gif: req.body.gif,
        }).save(function (err, data) {
          res.status(200).json({ insertedCommentID: data._id });
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        Comment({
          admin: req.user._id.toString(),
          comment_id: req.params.id,
          user_id: req.user.id,
          comment: req.body.commentText,
          comment_gif: req.body.gif,
        }).save(function (err, data) {
          res.status(200).json({ insertedCommentID: data._id });
        });
      } catch (error) {
        console.log(error);
      }
    }
  }
);

router.delete(
  "/removecommentreply/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Comment.findOneAndDelete({ _id: new ObjectId(req.params.id) }, (err) => {
        if (err) {
          console.log(err);
        }
      });
      res.sendStatus(200);
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/removecomments/:postid/:commentid",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.findOneAndUpdate(
        { _id: new ObjectId(req.params.postid) },
        { $inc: { comments: -1 } },
        (error, data) => {
          if (error) throw error;
        }
      );
      Comment.findOneAndDelete(
        { _id: new ObjectId(req.params.commentid) },
        (err) => {
          if (err) throw err;
        }
      );
      Comment.deleteMany({ comment_id: req.params.commentid }, (err, data) => {
        if (err) throw err;
      });

      res.sendStatus(200);
    } catch (err) {
      if (err) throw err;
    }
  }
);

router.post(
  "/addshare/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { shares: [req.user.id] } },
        function (err, result) {
          if (err) {
            res.send(err);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/trending",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    // 24 * 60 * 60 * 1000 = 86400000 ms in one day (24 hours)
    Post.find({
      $and: [
        { date: { $gt: new Date(Date.now() - 86400000) } },
        { who_can_see: "Public" },
      ],
    })
      .sort({ likes: -1 })
      .limit(10)
      .then((doc) => {
        if (doc) {
          Post.populate(
            doc,
            {
              path: "admin",
              model: "users",
              select: {
                password: 0,
                friends_req_send: 0,
                friends_req_received: 0,
                blocked_pages: 0,
                blocked_groups: 0,
                blocked_users: 0,
              },
            },
            (err, data) => {
              if (err) throw err;
              else {
                return res.status(200).json({
                  trendingPosts: data,
                });
              }
            }
          );
        }
      });
  }
);

router.delete(
  "/:postid",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    try {
      let path = req.body.path;

      if (path) {
        fs.unlink(`./uploads/${path}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      Post.findOneAndDelete(
        { _id: new ObjectId(req.params.postid) },
        (err, data) => {
          if (err) throw err;
        }
      );
      Comment.find({ post_id: req.params.postid }, function (err, data) {
        if (err) throw err;
        else {
          let datalen = data.length;
          for (let i = 0; i < datalen; i++) {
            Comment.deleteMany({ comment_id: data[i]._id }, (err, data) => {
              if (err) throw err;
            });
          }
        }
      });
      Comment.deleteMany({ post_id: req.params.postid }, (err, data) => {
        if (err) throw err;
      });
      res.sendStatus(200);
    } catch (error) {
      if (error) throw error;
    }
  }
);

module.exports = router;
