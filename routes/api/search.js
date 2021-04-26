const express = require("express");
const router = express.Router();
const passport = require("passport");
// searchable items
const User = require("../../model/User");
const Posts = require("../../model/Post");
const Events = require("../../model/Event");
const Groups = require("../../model/Group");
const Pages = require("../../model/Page");
const ObjectId = require("mongodb").ObjectId;

router.get(
  "/all/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      (async () => {
        let data = [];
        await searchPeople(req.params.search).then((people) => {
          if (people.length > 0) {
            data.push(...people);
          }
        });
        await searchPosts(req.params.search).then((posts) => {
          if (posts.length > 0) {
            data.push(...posts);
          }
        });
        await searchGroups(req.params.search).then((groups) => {
          if (groups.length > 0) {
            data.push(...groups);
          }
        });
        await searchPages(req.params.search).then((pages) => {
          if (pages.length > 0) {
            data.push(...pages);
          }
        });
        await searchEvents(req.params.search).then((events) => {
          if (events.length > 0) {
            data.push(...events);
          }
        });
        return res.json({
          results: data,
        });
      })();
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/people/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      searchPeople(req.params.search).then((data) => {
        return res.json({
          results: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/posts/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      searchPosts(req.params.search).then((data) => {
        return res.json({
          results: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/groups/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      searchGroups(req.params.search).then((data) => {
        return res.json({
          results: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/pages/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      searchPages(req.params.search).then((data) => {
        return res.json({
          results: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/events/:search",
  passport.authenticate("jwt", {
    session: false,
  }),
  (req, res) => {
    try {
      searchEvents(req.params.search).then((data) => {
        return res.json({
          results: data,
        });
      });
    } catch (error) {
      res.sendStatus(500);
    }
  }
);

const searchPeople = async (query) => {
  let data = [];
  if (query) {
    // here is our search algorithm
    await User.find(
      {
        $or: [
          {
            fname: {
              $regex: new RegExp("^" + query.toLowerCase(), "i"),
            },
          },
          {
            lname: {
              $regex: new RegExp("^" + query.toLowerCase(), "i"),
            },
          },
          {
            username: {
              $regex: new RegExp("^" + query.toLowerCase(), "i"),
            },
          },
        ],
      },
      (err, user) => {
        if (err) throw err;
        else {
          let UserLen = user.length;
          for (let i = 0; i < UserLen; i++) {
            data.push({
              title: `${user[i].fname} ${user[i].lname}`,
              url: user[i]._id,
            });
          }
        }
      }
    );
  }
  return data;
};

const searchPosts = async (query) => {
  let data = [];
  if (query) {
    // here is our search algorithm
    await Posts.find(
      {
        text: {
          $regex: new RegExp("^" + query.toLowerCase(), "i"),
        },
      },
      (err, posts) => {
        if (err) throw err;
        else {
          let postsLen = posts.length;
          for (let i = 0; i < postsLen; i++) {
            data.push({
              title: `${
                /* select only 20 character of text*/
                posts.text.length > 20
                  ? str.substr(0, 20 - 1) + "&hellip;"
                  : posts.text
              }`,
              url: `post/${posts[i]._id}`,
            });
          }
        }
      }
    );
  }
  return data;
};

const searchGroups = async (query) => {
  let data = [];
  if (query) {
    // here is our search algorithm
    await Groups.find(
      {
        name: {
          $regex: new RegExp("^" + query.toLowerCase(), "i"),
        },
      },
      (err, group) => {
        if (err) throw err;
        else {
          let groupLen = group.length;
          for (let i = 0; i < groupLen; i++) {
            data.push({
              title: group[i].name,
              url: `group/${group[i]._id}`,
            });
          }
        }
      }
    );
  }
  return data;
};

const searchPages = async (query) => {
  let data = [];
  if (query) {
    // here is our search algorithm
    await Pages.find(
      {
        name: {
          $regex: new RegExp("^" + query.toLowerCase(), "i"),
        },
      },
      (err, page) => {
        if (err) throw err;
        else {
          let pageLen = page.length;
          for (let i = 0; i < pageLen; i++) {
            data.push({
              title: page[i].name,
              url: `page/${page[i]._id}`,
            });
          }
        }
      }
    );
  }
  return data;
};

const searchEvents = async (query) => {
  let data = [];
  if (query) {
    // here is our search algorithm
    await Events.find(
      {
        name: {
          $regex: new RegExp("^" + query.toLowerCase(), "i"),
        },
      },
      (err, page) => {
        if (err) throw err;
        else {
          let pageLen = page.length;
          for (let i = 0; i < pageLen; i++) {
            data.push({
              title: page[i].name,
              url: `page/${page[i]._id}`,
            });
          }
        }
      }
    );
  }
  return data;
};

module.exports = router;
