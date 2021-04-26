const express = require("express");
const router = express.Router();
const passport = require("passport");
const Events = require("../../model/Event");
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
      Events.find({
        host_id: req.user._id,
      }).then((data) => {
        return res.status(200).json({
          events: data,
        });
      });
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/friends",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        (async () => {
          let FriendLen = req.user.friends.length;
          const promises = [];
          for (let i = 0; i < FriendLen; i++) {
            const acc = Events.findOne({ host_id: req.user.friends[i] });
            promises.push(acc);
          }
          const events = await Promise.all(promises);

          return res.status(200).json({
            events: events,
          });
        })();
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/pages",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        let events = [];
        // await Pages.find({ joind: req.user._id }).limit(5).then(data=>{
        //     let DataLen = data.length;
        //     for (let i = 0; i < DataLen; i++) {
        //         if(data[i]._id){
        //             await Events.find({
        //                 host_id : data[i]._id
        //             }).limit(3).then(data => {
        //                 if (data._id) {
        //                     let DataLen = data.length
        //                     for (let i = 0; i < DataLen; i++) {
        //                         events.push(data[i]);
        //                     }
        //                 }
        //             })
        //         }
        //     }
        // })
        return res.status(200).json({
          events: events,
        });
      }
    } catch (error) {
      if (error) throw error;
      res.sendStatus(500);
    }
  }
);

router.get(
  "/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Events.findOne({
          _id: new ObjectId(req.params.id),
        }).then((data) => {
          return res.status(200).json({
            event: data,
          });
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
  upload.any(),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let files = req.files;

      let filesLen = files.length;
      if (filesLen > 0) {
        let photos = [];

        for (let i = 0; i < filesLen; i++) {
          photos.push(files[i].filename);
        }
        if (
          req.body.eventName &&
          (req.body.eventLocation || req.body.eventURL) &&
          req.body.startTime &&
          req.body.startDate &&
          req.body.endTime &&
          req.body.endDate
        ) {
          Events({
            host: req.body.host,
            host_id: req.body.hostId,
            event_name: req.body.eventName,
            description: req.body.description,
            eventURL: req.body.eventURL,
            photos: photos[0],
            start_date: req.body.startDate,
            start_time: req.body.startTime,
            end_date: req.body.endDate,
            end_time: req.body.endTime,
            location: req.body.eventLocation,
          }).save((err, data) => {
            if (err) throw err;
            else {
              res.sendStatus(200);
            }
          });
        }
      } else {
        if (
          req.body.eventName &&
          (req.body.eventLocation || req.body.eventURL) &&
          req.body.startTime &&
          req.body.startDate &&
          req.body.endTime &&
          req.body.endDate
        ) {
          Events({
            host: req.body.host,
            host_id: req.body.hostId,
            event_name: req.body.eventName,
            description: req.body.description,
            eventURL: req.body.eventURL,
            start_date: req.body.startDate,
            start_time: req.body.startTime,
            end_date: req.body.endDate,
            end_time: req.body.endTime,
            location: req.body.eventLocation,
          }).save((err, data) => {
            if (err) throw err;
            else {
              res.sendStatus(200);
            }
          });
        }
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
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $addToSet: { joined: [req.user.id] } },
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
        Events.updateOne(
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

router.put(
  "/edit/:id/photo",
  upload.any(),
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let oldImgPath = req.body.oldPhoto;
      if (oldImgPath) {
        fs.unlink(`./uploads/${oldImgPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
      let files = req.files;
      let filesLen = files.length;
      if (filesLen > 0) {
        let photos = [];
        for (let i = 0; i < filesLen; i++) {
          photos.push(files[i].filename);
        }
        if (photos.length != 0) {
          Events.updateOne(
            { _id: new ObjectId(req.params.id) },
            { photos: photos[0] },
            function (err, result) {
              if (err) {
                res.sendStatus(500);
              } else {
                res.send(result);
              }
            }
          );
        }
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
      if (req.body.eventName) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { event_name: req.body.eventName },
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
      if (req.body.description) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { description: req.body.description },
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
  "/edit/:id/location",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.eventLocation) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { location: req.body.eventLocation },
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
  "/edit/:id/url",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.eventURL) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { eventURL: req.body.eventURL },
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
  "/edit/:id/startDate",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.startDate) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { start_date: req.body.startDate },
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
  "/edit/:id/startTime",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.startTime) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { start_time: req.body.startTime },
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
  "/edit/:id/endDate",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.endDate) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { end_date: req.body.endDate },
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
  "/edit/:id/endTime",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.body.endTime) {
        Events.updateOne(
          { _id: new ObjectId(req.params.id) },
          { end_time: req.body.endTime },
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

router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      let oldImgPath = req.body.oldPhoto;
      if (oldImgPath) {
        fs.unlink(`./uploads/${oldImgPath}`, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
      Events.findOneAndDelete({ _id: new ObjectId(req.params.id) }, (err) => {
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

module.exports = router;
