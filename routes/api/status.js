const express = require("express");
const router = express.Router();
const passport = require("passport");
const Status = require("../../model/Status");
const User = require("../../model/User");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
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
    if (
      ext !== ".png" &&
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".mp4" &&
      ext !== ".mkv" &&
      ext !== ".mov"
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
    try {
      (async () => {
        let followers = req.user.followers;
        let followersLen = followers.length;
        let promises = [];
        for (let i = 0; i < followersLen; i++) {
          let acc = await Status.find({
            admin: new ObjectId(followers[i]),
          }).then((doc) => {
            if (doc) {
              return Status.populate(doc, {
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
              });
            }
          });
          let accLen = acc.length;
          for (let i = 0; i < accLen; i++) {
            if (acc[i]) {
              promises.push(acc[i]);
            }
          }
        }

        let status = await Promise.all(promises);
        // console.log(status);
        res.json({
          status: status,
        });
      })();
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/mystatus",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Status.find({ admin: new ObjectId(req.user._id) }).then((doc) => {
        if (doc) {
          Status.populate(
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
                  status: data,
                });
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

router.post(
  "/",
  upload.any(),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let files = req.files;
      // posting files
      if (files) {
        let FileLen = files.length;
        if (FileLen > 0) {
          for (let i = 0; i < FileLen; i++) {
            let type = files[i].fieldname;
            switch (type) {
              case "video":
                Status({
                  admin: req.user._id,
                  description: req.body.description,
                  video: files[i].filename,
                  date: new Date().toISOString(),
                }).save((err, data) => {
                  if (err) throw err;
                  else {
                    res.sendStatus(200);
                  }
                });

                break;
              case "photo":
                Status({
                  admin: req.user._id,
                  description: req.body.description,
                  photo: files[i].filename,
                  date: new Date().toISOString(),
                }).save((err, data) => {
                  if (err) throw err;
                  else {
                    res.sendStatus(200);
                  }
                });
                break;
            }
          }
        }
      } else if (req.body.text) {
        Status({
          admin: req.user._id,
          description: req.body.description,
          text: req.body.text,
          date: new Date().toISOString(),
        }).save((err, data) => {
          if (err) throw err;
          else {
            res.sendStatus(200);
          }
        });
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

router.put(
  "/viewed/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Status.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { viewed: [req.user.id] } },
        function (err, result) {
          if (err) {
            res.send(err);
          } else {
            res.send(result);
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let Path = req.body.path;

      if (Path) {
        fs.unlink(`./uploads/${Path}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
      Status.findOneAndDelete(
        { _id: new ObjectId(req.params.id) },
        (err, data) => {
          if (err) throw err;
          else {
            res.sendStatus(200);
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

module.exports = router;
