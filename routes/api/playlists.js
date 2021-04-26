const express = require("express");
const router = express.Router();
const passport = require("passport");
const Palylist = require("../../model/Playlist");

router.get(
  "/watchlater",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Palylist.findOne({
        $or: [{ user_id: req.user._id }, { playlist_name: "Watch later" }],
      }).then((data) => {
        return res.status(200).json({
          watchlater: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.post(
  "/watchlater/:postID",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      if (req.user._id) {
        Palylist.updateOne(
          {
            user_id: req.user._id,
          },
          {
            $addToSet: {
              saved_posts: [req.params.postID],
            },
          },
          function (err, data) {
            if (err) {
              res.send(err);
            } else {
              res.status(200).send("Done");
            }
          }
        );
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/watchlater/:postID",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Palylist.updateOne(
        {
          user_id: req.user._id,
        },
        {
          $pull: {
            saved_posts: req.params.postID,
          },
        },
        function (err, data) {
          if (err) {
            res.send(err);
          } else {
            res.status(200).send("Done");
          }
        }
      );
    } catch (error) {
      res.sendStatus(500);
      console.log(error);
    }
  }
);

module.exports = router;
