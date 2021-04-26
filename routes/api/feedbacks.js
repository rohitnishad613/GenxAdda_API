const express = require("express");
const router = express.Router();
const passport = require("passport");
const Feedback = require("../../model/Feedback");

router.post(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
        if(req.user.id){
            Feedback({
                sender_id: req.user.id,
                type: req.body.type,
                detail: req.body.detail
            }).save(function(err, data) {
                if(err) throw err
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

module.exports = router;
