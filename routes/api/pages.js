const express = require("express");
const router = express.Router();
const passport = require("passport");
const Pages = require("../../model/Page");
const Post = require("../../model/Post");
const User = require("../../model/User");
const app = express();
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const ObjectId = require("mongodb").ObjectId;
const fs = require("fs");

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
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      let error = "File type is not supported!";
      return callback(error, false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.get(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.find({
        joined: req.user._id,
      }).then((data) => {
        return res.status(200).json({
          pages: data,
        });
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/mypages",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.find({
        admin_id: req.user._id,
      }).then((data) => {
        return res.status(200).json({
          pages: data,
        });
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/suggations",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.find({}).then((data) => {
        return res.status(200).json({
          pages: data,
        });
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/:id/posts",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Post.find({ pageid: req.params.id }).then((doc) => {
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
                  (async () => {
                    let dataLen = data.length;
                    const promises = [];

                    for (let i = 0; i < dataLen; i++) {
                      let adminId = data[i].admin._id.toString();
                      let userId = req.user._id.toString();
                      if (err) throw err;
                      else if (
                        data[i].who_can_see == "Public" ||
                        adminId == userId
                      ) {
                        promises.push(data[i]);
                      } else if (
                        data[i].who_can_see == "Friends" &&
                        data[i].admin.friends.indexOf(userId) != -1
                      ) {
                        promises.push(data[i]);
                      } else if (
                        data[i].who_can_see == "Followers" &&
                        req.user.followers.indexOf(adminId) != -1
                      ) {
                        promises.push(data[i]);
                      }
                    }

                    const posts = await Promise.all(promises);

                    return res.status(200).json({
                      posts: posts,
                    });
                  })();
                }
              }
            );
          }
        });
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.post(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.name && req.body.category) {
        let address = {
          street: req.body.street,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
        };

        Pages({
          admin_id: req.user._id,
          name: req.body.name,
          description: req.body.description,
          category: req.body.category,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          address: address,
          who_can_post: req.body.who_can_post,
        }).save((err, data) => {
          if (err) throw err;
          else {
            res.sendStatus(200);
          }
        });
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.post(
  "/join/:id",

  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Pages.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $addToSet: { joined: [req.user.id] }, $inc: { joined_count: 1 } },
          function (err, result) {
            if (err) {
              console.log(err);
              res.sendStatus(500);
            } else {
              res.send(result);
            }
          }
        );
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.post(
  "/unjoin/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Pages.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $pull: { joined: req.user.id } },
          function (err, result) {
            if (err) {
              console.log(err);
              res.sendStatus(500);
            } else {
              res.send(result);
            }
          }
        );
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.post(
  "/edit/:id/photo",
  upload.single("avatar"),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let oldImgPath = req.body.oldMainImgPath;
      if (oldImgPath) {
        fs.unlink(`./uploads/${oldImgPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      let newValue = req.body.delete ? "" : req.file.filename;
      Pages.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { photo: newValue },
        { new: true },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
              newpic: data.photo,
            });
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.post(
  "/edit/:id/coverPhoto",
  upload.single("coverPhoto"),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let oldImgPath = req.body.oldCoverImgPath;

      if (oldImgPath) {
        fs.unlink(`./uploads/${oldImgPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      let newValue = req.body.delete ? "" : req.file.filename;

      Pages.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { cover_photo: newValue },
        { new: true },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
              newcover: data.cover_photo,
            });
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/privacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.who_can_post) {
        Pages.updateOne(
          { _id: new ObjectId(req.params.id) },
          { who_can_post: req.body.who_can_post },
          function (err, result) {
            if (err) {
              res.sendStatus(500);
            } else {
              res.send(result);
            }
          }
        );
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/name",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.newName) {
        Pages.updateOne(
          { _id: new ObjectId(req.params.id) },
          { name: req.body.newName },
          function (err, result) {
            if (err) {
              res.sendStatus(500);
            } else {
              res.send(result);
            }
          }
        );
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/category",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.newCategory) {
        Pages.updateOne(
          { _id: new ObjectId(req.params.id) },
          { category: req.body.newCategory },
          function (err, result) {
            if (err) {
              res.sendStatus(500);
            } else {
              res.send(result);
            }
          }
        );
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/description",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { description: req.body.newDescription },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/email",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { email: req.body.newEmail },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/phoneNumber",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { phoneNumber: req.body.newPhoneNumber },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/streetaddress",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { address: { street: req.body.newStreet } } },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/state",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { address: { state: req.body.newState } } },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/edit/:id/country",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Pages.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { address: { country: req.body.newCountry } } },
        function (err, result) {
          if (err) {
            res.sendStatus(500);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/block/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findByIdAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          $addToSet: {
            blocked_pages: [req.params.id],
          },
        },
        (err, data) => {
          if (err) throw err;
          else {
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.put(
  "/unblock/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findByIdAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          $pull: {
            blocked_pages: req.params.id,
          },
        },
        (err, data) => {
          if (err) throw err;
          else {
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let oldImgPath = req.body.oldImgPath;
      if (oldImgPath) {
        fs.unlink(`./uploads/${oldImgPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      let oldcoverPath = req.body.oldcoverPath;
      if (oldImgPath) {
        fs.unlink(`./uploads/${oldcoverPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      Pages.findOneAndDelete({ _id: new ObjectId(req.params.id) }, (err) => {
        if (err) throw err;
        else {
          res.sendStatus(200);
        }
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

// always at bottom because it's a dynamic route:
// if you put any route after it it may not work because the express predict that /yourstaticroute as  :id dynamic route.

router.get(
  "/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Pages.findOne({
          _id: new ObjectId(req.params.id),
        }).then((data) => {
          return res.status(200).json({
            page: data,
          });
        });
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

module.exports = router;
