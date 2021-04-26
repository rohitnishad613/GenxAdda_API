const express = require("express");
const router = express.Router();
const passport = require("passport");
const Notifications = require("../../model/Notification");
const ObjectId = require("mongodb").ObjectId;

router.get(
  "/:date",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Notifications.find(
        {
          $and: [
            { userId: req.user._id },
            { at: { $lt: new Date(req.params.date) } },
          ],
        },
        (err, notifications) => {
          if (err) throw err;
          else {
            return res.status(200).json({
              notifications: notifications,
            });
          }
        }
      ).limit(10);
    } catch (error) {
      res.sendStatus(500);
    }
  }
);


router.post(
  "/seen",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Notifications.updateMany(
        { seen: false },
        { seen: true },
        (err, notifications) => {
          if (err) throw err;
        }
      ).limit(10);
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.delete(
  "/:notification_id",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      Notifications.findOneAndDelete(
        { _id: new ObjectId(req.params.notification_id) },
        (err) => {
          if (err) throw err;
          else res.sendStatus(200);
        }
      );
    } catch (error) {
      res.sendStatus(500);
      console.log(error);
    }
  }
);

module.exports = router;
