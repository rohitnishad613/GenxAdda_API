const express = require("express");
const router = express.Router();
const passport = require("passport");
const Notifications = require("../../model/Notification");
const Chats = require("../../model/Chat");

router.get(
    "/notifications",
    passport.authenticate("jwt", {
        session: false,
    }),
    (req, res) => {
        try {
            Notifications.countDocuments(
              {
                $and: [{ seen: false }, { userId : req.user._id}],
              },
              function (err, c) {
                if (err) throw err;
                return res.status(200).json({
                  unseen_notifications: c,
                });
              }
            );
        } catch (error) {
            res.sendStatus(500);
        }
    }
);

router.get(
    "/chats",
    passport.authenticate("jwt", {
        session: false,
    }),
    (req, res) => {
        try {
            Chats.countDocuments(
              {
                $and: [{ seen: false }, { receiver_id: req.user._id }],
              },
              function (err, c) {
                if (err) throw err;
                return res.status(200).json({
                  unseen_chats: c,
                });
              }
            );
        } catch (error) {
            res.sendStatus(500);
        }
    }
);

module.exports = router;