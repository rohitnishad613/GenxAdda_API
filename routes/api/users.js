const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const multer = require("multer");
const path = require("path");
const key = require("../../config/keys").secret;
const email_username = require("../../config/keys").username;
const email_password = require("../../config/keys").password;
const fs = require("fs");
const User = require("../../model/User");
const tempUser = require("../../model/tempUser");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: email_username,
    pass: email_password
  }
});

SG_FROM_EMAIL = email_username

// that model for deleteing user account

/* ------------------------------------- */

const Posts = require("../../model/Post");
const Comment = require("../../model/Comment");
const Status = require("../../model/Status");
const Chats = require("../../model/Chat");

const Events = require("../../model/Event");
const Groups = require("../../model/Group");
const Pages = require("../../model/Page");

/*  -------------------------------- */

const Palylist = require("../../model/Playlist");
const ObjectId = require("mongodb").ObjectId;

function generateOTP() {
  // Declare a digits variable
  // which stores all digits
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

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

router.get(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);

router.post("/register", (req, res) => {
  let { fname, lname, email, password, confirm_password } = req.body;
  if (password !== confirm_password) {
    return res.status(400).json({
      msg: "Password do not match.",
    });
  }
  // Check for the Unique Email
  User.findOne({
    email: email,
  }).then((user) => {
    if (user) {
      return res.status(400).json({
        msg: "Email is already registered. Did you forgot your password.",
      });
    }
  });
  try {
    // send the otp and store it in db
    const otp = generateOTP();
    transporter.sendMail({
      to: email,
      from: SG_FROM_EMAIL,
      subject: "GenAdda signup OTP",
      html: `<h1>Welcome to GenxAdda</h1><br><p>${otp} is your 6 digit OTP to verify your account.</p>`,
    });
    // The data is valid and now we can register the user
    tempUser({
      fname,
      lname,
      email,
      password,
      otp,
    }).save();
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

router.post("/resend-otp", (req, res) => {
  const otp = generateOTP();
  let { email } = req.body;
  transporter.sendMail({
    to: email,
    from: SG_FROM_EMAIL,
    subject: "GenAdda signup OTP",
    html: `<h1>Welcome to GenxAdda</h1><br><p>${otp} is your 6 digit OTP to verify your account.</p>`,
  });
  // The data is valid and now we can register the user
  tempUser.findOneAndUpdate(
    { email: email },
    { otp: otp },
    (err, doc) => {
      if (err) throw err;
      else {
        return res.status(200).json({
          msg: "New OTP is sended to your email address.",
        });
      }
    }
  );
});

router.post("/verify-otp", (req, res) => {
  let { otp, unverified_email } = req.body;

  tempUser.findOne(
    {
      email: unverified_email,
    },
    (err, user) => {
      if (user) {
        if (!user.otp == otp) {
          return res.status(400).json({
            msg: "You Entered a wrong otp.",
          });
        } else {
          let newUser = new User({
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            password: user.password,
            who_send_friendReq: "Everyone",
            who_see_friendList: "Everyone",
            who_invite_pages: "Friends",
            who_invite_groups: "Friends",
            who_invite_events: "Followers",
            who_see_posts: "Everyone",
          });
          // Hash the password
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              newUser.save().then((user) => {
                Palylist({
                  playlist_name: "Watch later",
                  user_id: user._id,
                }).save((err, data) => {
                  if (err) throw err;
                });
                const payload = {
                  _id: user._id,
                  fname: user.name,
                  lname: user.name,
                  email: user.email,
                };
                jwt.sign(
                  payload,
                  key,
                  {
                    expiresIn: 604800,
                  },
                  (err, token) => {
                    res.status(200).json({
                      success: true,
                      token: `Bearer ${token}`,
                      user: user,
                      msg: "User is now registered.",
                    });
                    tempUser.deleteOne({ email: unverified_email }, (err) => {
                      if (err) throw err;
                    });
                  }
                );
              });
            });
          });
        }
      } else {
        return res.status(404).json({
          err: "No account linked with this email address"
        })
      }
    }
  );
});

router.post("/reset-password", (req, res) => {
  const otp = generateOTP();
  // The data is valid and now we can register the user
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) throw err;
    else if (!user) {
      return res.status(404).json({
        msg: "This email is not linked with any account.",
      });
    }
    user.resetPasswordOTP = otp;
    user.expire_resetPasswordOTP = Date.now() + 3600000;
    user.save().then((data) => {
      transporter.sendMail({
        to: req.body.email,
        from: SG_FROM_EMAIL,
        subject: "GenAdda Reset Password",
        html: `<h1>GenxAdda</h1><br><p>${otp} is your 6 digit OTP to reset your password.</p>`,
      });
      return res.status(200).json({
        success: true,
        msg: "Check your email.",
      });
    });
  });
});

router.post("/check-reset-password-otp", (req, res) => {
  let { otp, new_password, email } = req.body;
  User.findOne({
    email: email,
    resetPasswordOTP: otp,
    expire_resetPasswordOTP: { $gt: Date.now() },
  }).then((user) => {
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "Wrong or expired OTP.",
      });
    }
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(new_password, salt, (err, hash) => {
        if (err) throw err;
        user.password = hash;
        user.save().then((user) => {
          res.status(200).json({
            success: true,
          });
        });
      });
    });
  });
});

router.post("/resend-reset-password-otp", (req, res) => {
  let { email } = req.body;
  const otp = generateOTP();
  transporter.sendMail({
    to: email,
    from: SG_FROM_EMAIL,
    subject: "GenAdda signup OTP",
    html: `<h1>Welcome to GenxAdda</h1><br><p>${otp} is your 6 digit OTP to verify your account.</p>`,
  });
  // The data is valid and now we can register the user
  User.findOneAndUpdate(
    { email: req.body.email },
    { resetPasswordOTP: otp , expire_resetPasswordOTP: Date.now() + 3600000 },
    (err, doc) => {
      if (err) throw err;
      else {
        return res.status(200).json({
          msg: "New OTP is sended to your email address.",
        });
      }
    }
  );
});

router.post("/login", (req, res) => {
  User.findOne({
    $or: [
      {
        email: req.body.username,
      },
      {
        username: req.body.username,
      },
    ],
  }).then((user) => {
    if (!user) {
      return res.status(404).json({
        msg: "User not found.",
        success: false,
      });
    }
    // If there is user we are now going to compare the password
    bcrypt.compare(req.body.password, user.password).then((isMatch) => {
      if (isMatch) {
        // User's password is correct and we need to send the JSON Token for that user
        const payload = {
          _id: user._id,
          fname: user.name,
          lname: user.name,
          email: user.email,
        };
        jwt.sign(
          payload,
          key,
          {
            expiresIn: 604800,
          },
          (err, token) => {
            res.status(200).json({
              success: true,
              token: `Bearer ${token}`,
              user: user,
              msg: "Hurry! You are now logged in.",
            });
          }
        );
      } else {
        return res.status(404).json({
          msg: "Incorrect password.",
          success: false,
        });
      }
    });
  });
});

router.get(
  "/profile",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);

router.get(
  "/:userID/posts",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Post.find({
        admin: new ObjectId(req.params.userID),
      }).then((doc) => {
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
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/notifications",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);
router.get(
  "/friends",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);
router.get(
  "/groups",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);
router.get(
  "/pages",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);
router.get(
  "/events",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);

router.get(
  "/watch-later",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    return res.json({
      user: req.user,
    });
  }
);

// updates

// validation with regExp
let regFullAlpha = /^[a-zA-Z]+ [a-zA-Z]+$/;
let regAlpha = /^[a-zA-Z]+$/;
let regNum = /^[0-9]+$/;
let regEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
let regusername = /^[a-z0-9._-]+$/;

router.post(
  "/profilePic",
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

      User.findOneAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          profilePic: newValue,
        },
        {
          new: true,
        },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
              newpic: data.profilePic,
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
  "/coverPhoto",
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

      User.findOneAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          coverPhoto: newValue,
        },
        {
          new: true,
        },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
              newcover: data.coverPhoto,
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
  "/fname/:newfname",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (
        req.params.newfname.match(regAlpha) ||
        req.params.newfname.match(regFullAlpha)
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            fname: req.params.newfname,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/lname/:newlname",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (
        req.params.newlname.match(regAlpha) ||
        req.params.newlname.match(regFullAlpha)
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            lname: req.params.newlname,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/username/:newusername",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.newusername.match(regusername)) {
        User.find({
          username: req.params.newusername,
        }).then((user) => {
          if (user.length != 0) {
            return res.status(400).json({
              msg: "This usename is already taken.",
            });
          } else {
            User.findOneAndUpdate(
              {
                _id: new ObjectId(req.user._id),
              },
              {
                username: req.params.newusername,
              },
              (err, data) => {
                if (err) {
                  return res.status(500).json({
                    msg: "Unable to update.",
                  });
                } else {
                  return res.status(200).json({
                    msg: "Done.",
                  });
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

router.put(
  "/email/:newemail",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.newemail.match(regEmail)) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            email: req.params.newemail,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/about/:about",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      User.findOneAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          about: req.params.about,
        },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
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
  "/phone/:newphone",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.params.newphone.match(regNum)) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            phone: req.params.newphone,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/password/:newpassword",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.params.newpassword, salt, (err, hash) => {
          if (err) throw err;
          else {
            User.findOneAndUpdate(
              {
                _id: new ObjectId(req.user._id),
              },
              {
                password: hash,
              },
              (err, data) => {
                if (err) {
                  return res.status(500).json({
                    msg: "Unable to update.",
                  });
                } else {
                  return res.status(200).json({
                    msg: "Done.",
                  });
                }
              }
            );
          }
        });
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

// privacy

router.put(
  "/privacy/friendrequest/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (
        req.params.newPrivacy == "Everyone" ||
        req.params.newPrivacy == "Only Followers"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_send_friendReq: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/privacy/friendlist/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      // req.params.newPrivacy
      if (
        req.params.newPrivacy == "Everyone" ||
        req.params.newPrivacy == "Friends" ||
        req.params.newPrivacy == "Followers"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_see_friendList: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/privacy/pagesPrivacy/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      // req.params.newPrivacy
      if (
        req.params.newPrivacy == "Friends" ||
        req.params.newPrivacy == "Followers" ||
        req.params.newPrivacy == "Nobody"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_invite_pages: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/privacy/groupsPrivacy/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      // req.params.newPrivacy
      if (
        req.params.newPrivacy == "Friends" ||
        req.params.newPrivacy == "Followers" ||
        req.params.newPrivacy == "Nobody"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_invite_groups: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/privacy/eventsPrivacy/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      // req.params.newPrivacy
      if (
        req.params.newPrivacy == "Friends" ||
        req.params.newPrivacy == "Followers" ||
        req.params.newPrivacy == "Nobody"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_invite_events: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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
  "/privacy/postsPrivacy/:newPrivacy",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      // req.params.newPrivacy
      if (
        req.params.newPrivacy == "Everyone" ||
        req.params.newPrivacy == "Only Followers"
      ) {
        User.findOneAndUpdate(
          {
            _id: new ObjectId(req.user._id),
          },
          {
            who_see_posts: req.params.newPrivacy,
          },
          (err, data) => {
            if (err) {
              return res.status(500).json({
                msg: "Unable to update.",
              });
            } else {
              return res.status(200).json({
                msg: "Done.",
              });
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

// Language

router.put(
  "/lang/:lang",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    const our_lang = ["en", "hi", "mr", "ch"];
    let new_lang;
    let langParamToLower = req.params.lang.toLowerCase();
    if (our_lang.indexOf(langParamToLower) != -1) {
      new_lang = langParamToLower;
    } else {
      new_lang = "en"; // default language
    }
    try {
      User.findOneAndUpdate(
        {
          _id: new ObjectId(req.user._id),
        },
        {
          lang: new_lang,
        },
        (err, data) => {
          if (err) {
            return res.status(500).json({
              msg: "Unable to update.",
            });
          } else {
            return res.status(200).json({
              msg: "Done.",
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
  "/block/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let reqPram = req.params.id.toString();
      let reqUser = req.user._id.toString();

      User.findOne(
        {
          _id: new ObjectId(reqUser),
        },
        (err, user) => {
          if (err) throw err;
          else {
            if (user.friends.indexOf(reqPram) != -1) {
              User.findByIdAndUpdate(
                {
                  _id: new ObjectId(reqUser),
                },
                {
                  $addToSet: {
                    blocked_users: [reqPram],
                  },
                  $pull: {
                    friends: reqPram,
                  },
                  $inc: {
                    friend_count: -1,
                  },
                },
                (err, data) => {
                  if (err) throw err;
                }
              );
            } else {
              User.findByIdAndUpdate(
                {
                  _id: new ObjectId(reqUser),
                },
                {
                  $addToSet: {
                    blocked_users: [reqPram],
                  },
                },
                (err, data) => {
                  if (err) throw err;
                }
              );
            }
          }
        }
      );

      User.findOne(
        {
          _id: new ObjectId(reqPram),
        },
        (err, user) => {
          if (err) throw err;
          else {
            if (user.friends.indexOf(reqUser) != -1) {
              User.findByIdAndUpdate(
                {
                  _id: new ObjectId(reqPram),
                },
                {
                  $pull: {
                    friends: reqUser,
                  },
                  $inc: {
                    friend_count: -1,
                  },
                },
                (err, data) => {
                  if (err) throw err;
                }
              );
            }
          }
        }
      );
    } catch (error) {
      console.log(error);
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
            blocked_users: req.params.id,
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
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      /* ------------------------------------------------------------------------------------ */
      // function declaration

      // delete files from owr server

      deleteFile = (filename) => {
        if (filename) {
          fs.unlink(`./uploads/${filename}`, function (err) {
            if (err) {
              console.log(err);
            }
          });
        }
      };

      // delete Posts function declaration (only declaration not called)
      deletePosts = (filter) => {
        Post.find(filter, (err, data) => {
          if (err) throw err;
          else {
            // deleting record and doc from db.

            // deleting sub comments of posts
            let dataLen = data.length;

            for (let i = 0; i < dataLen; i++) {
              Comment.find(
                {
                  post_id: data[i]._id,
                },
                function (err, data2) {
                  if (err) throw err;
                  else {
                    // deleting files in from own server

                    let postsVideo = data[i].video;
                    let postsAudio = data[i].audio;
                    let postsPhoto = data[i].photo;

                    deleteFile(postsVideo);
                    deleteFile(postsAudio);
                    deleteFile(postsPhoto);

                    let datalen2 = data2.length;
                    for (let i = 0; i < datalen2; i++) {
                      Comment.deleteMany(
                        {
                          comment_id: data2[i]._id,
                        },
                        (err, data) => {
                          if (err) throw err;
                        }
                      );
                    }
                  }
                }
              );

              // deleting comments of posts
              Comment.deleteMany(
                {
                  post_id: data[i]._id,
                },
                (err, data) => {
                  if (err) throw err;
                }
              );
              // deleting  posts
              Posts.deleteMany(filter, (err, data) => {
                if (err) throw err;
              });
            }
          }
        });
      };

      /* ------------------------------------------------------------------------------------- */

      let userid = req.user._id.toString();

      let ProfilePicPath = req.user.profilePic;
      let ProfileCoverPath = req.user.coverPhoto;

      deleteFile(ProfilePicPath);
      deleteFile(ProfileCoverPath);

      User.deleteOne(
        {
          _id: new ObjectId(userid),
        },
        (err, result) => {
          if (err) throw err;
        }
      );

      // if hai then delete status
      Status.find(
        {
          admin: new ObjectId(userid),
        },
        (err, data) => {
          if (err) throw err;
          else {
            let dataLen = data.length;
            for (let i = 0; i < dataLen; i++) {
              let StatusVideo = data[i].video;
              let StausPhoto = data[i].photo;

              deleteFile(StatusVideo);
              deleteFile(StausPhoto);
            }

            Status.deleteMany(
              {
                admin: new ObjectId(userid),
              },
              (err, data) => {
                if (err) throw err;
              }
            );
          }
        }
      );

      // playlist delete

      Palylist.deleteMany(
        {
          user_id: userid,
        },
        (err, data) => {
          if (err) throw err;
        }
      );

      // delete all chats

      Chats.find(
        {
          $or: [
            {
              sender_id: userid,
            },
            {
              receiver_id: userid,
            },
          ],
        },
        (err, data) => {
          if (err) throw err;
          let dataLen = data.length;
          if (data.length) {
            for (let i = 0; i < dataLen; i++) {
              deleteFile(data[i].video);
              deleteFile(data[i].photo);
              deleteFile(data[i].other_file);
            }
          }
        }
      );

      Chats.deleteMany(
        {
          $or: [
            {
              sender_id: userid,
            },
            {
              receiver_id: userid,
            },
          ],
        },
        (err) => {
          if (err) throw err;
        }
      );

      // Delete events

      Events.deleteMany(
        {
          host_id: userid,
        },
        (err) => {
          if (err) throw err;
        }
      );

      // Delete pages

      Pages.find(
        {
          admin_id: userid,
        },
        (err, data) => {
          if (err) throw err;
          else {
            let DtaLen = data.length;
            for (let i = 0; i < DtaLen; i++) {
              deletePosts({
                $and: [
                  {
                    admin: new ObjectId(userid),
                  },
                  {
                    pageid: data[i]._id,
                  },
                ],
              });
            }

            Pages.deleteMany(
              {
                admin_id: userid,
              },
              (err) => {
                if (err) throw err;
              }
            );
          }
        }
      );

      // Delete notifications

      Notifications.deleteMany(
        {
          userId: userid,
        },
        (err) => {
          if (err) throw err;
        }
      );

      // Delete groups

      Groups.find(
        {
          admin_id: userid,
        },
        (err, data) => {
          if (err) throw err;
          else {
            let DtaLen = data.length;
            for (let i = 0; i < DtaLen; i++) {
              deletePosts({
                $and: [
                  {
                    admin: new ObjectId(userid),
                  },
                  {
                    groupid: data[i]._id,
                  },
                ],
              });
            }

            Groups.deleteMany(
              {
                admin_id: userid,
              },
              (err) => {
                if (err) throw err;
              }
            );
          }
        }
      );

      // Delete Posts and comments and also sub comment
      deletePosts({
        admin: new ObjectId(userid),
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

// always at bottom because it's a dynamic route:
// if you put any route after it it may not work because the express predict that /yourstaticroute as  :user dynamic route.

router.get(
  "/:user", // userID or username
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    User.findOne({
      $or: [
        {
          username: req.params.user,
        },
        {
          _id: new ObjectId(req.params.user),
        },
      ],
    }).then((user) => {
      try {
        let userObj = {};

        userObj._id = user._id;
        userObj.fname = user.fname;
        userObj.lname = user.lname;
        userObj.email = user.email;
        userObj.profilePic = user.profilePic;
        userObj.coverPhoto = user.coverPhoto;
        userObj.about = user.about;
        userObj.dob = user.dob;
        userObj.phone = user.phone;
        userObj.lang = user.lang;
        if (
          user._id.toString() == req.user._id.toString() ||
          user.who_see_friendList == "Everyone"
        ) {
          userObj.friends = user.friends;
        } else if (
          user.who_see_friendList == "Friends" &&
          user.friends.indexOf(req.user._id.toString()) != -1
        ) {
          userObj.friends = user.friends;
        } else if (
          user.who_see_friendList == "Followers" &&
          req.user.followers.indexOf(user._id.toString()) != -1
        ) {
          userObj.friends = user.friends;
        } else if (user.friends.indexOf(req.user._id.toString()) != -1) {
          userObj.friends = [req.user._id.toString()];
        } else {
          userObj.friends = [];
        }
        userObj.friends_req_send = user.friends_req_send;
        userObj.friends_req_received = user.friends_req_received;
        userObj.followers = user.followers;
        userObj.username = user.username;
        userObj.followers_count = user.followers_count;
        userObj.friend_count = user.friend_count;
        userObj.who_send_friendReq = user.who_send_friendReq;
        userObj.who_see_friendList = user.who_see_friendList;
        userObj.who_invite_pages = user.who_invite_pages;
        userObj.who_see_posts = user.who_see_posts;
        userObj.blocked_pages = user.blocked_pages;
        userObj.blocked_groups = user.blocked_groups;
        userObj.blocked_users = user.blocked_users;
        userObj.status = user.status;
        return res.status(200).json({
          user: userObj,
        });
      } catch (err) {
        if (err) throw err;
        res.sendStatus(500);
      }
    });
  }
);

module.exports = router;
