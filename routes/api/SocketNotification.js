const Notifications = require("../../model/Notification");
const jwt = require("jsonwebtoken");
const key = require("../../config/keys").secret;

module.exports = function (io) {
    const notifications = io.of("/notifications");

    notifications.on("connection", function (socket) {
        let userId;
        let token = socket.handshake.query.token.split(" ")[1]; // to remove the Bearer from token { required }
        try {
            // verify a token symmetric
            jwt.verify(token, key, function (err, decoded) {
                if (err) throw err;
                else {
                    userId = decoded._id;
                }
            });
        } catch (error) {
            console.log(error);
        }
        // start here
        socket.join(userId);
    });

    global.sendNotification = (notification, adminId) => {
        let NotificationsLen = notification.length;
        notifications.to(adminId).emit("GetNewNotifications", notification);
        for (let i = 0; i < NotificationsLen; i++) {
            Notifications({
                userId: notification[i].userId,
                url: notification[i].url,
                img: notification[i].img,
                msg: notification[i].msg,
                at: notification[i].at,
            }).save((err, data) => {
                if (err) throw err;
            });
        }
    };
};