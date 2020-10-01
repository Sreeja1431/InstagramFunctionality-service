process.on("uncaughtException", function (err) {
  console.log("uncaughtException", err);
});

var router = require("express").Router();
const multer = require("multer");
const path = require("path");
var config = require("../config/config.json");
var jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
var { check, validationResult } = require("express-validator");
const { ObjectId } = require("bson");
var nodemailer = require("nodemailer");
const err = require("../config/error_constants");
const warn = require("../config/info_constants");
var cors = require("cors");
const Users = require("../Model/Users");
const fs = require("fs");

const helpers = require("../helpers");

const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:\\Users\\spiili\\Documents\\Instagram\\photos\\uploads1");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "uploads1-" +
        file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:\\Users\\spiili\\Documents\\Instagram\\photos\\uploads2");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "uploads2-" +
        file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const storage3 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:\\Users\\spiili\\Documents\\Instagram\\photos\\uploads3");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "uploads3-" +
        file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const storage4 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:\\Users\\spiili\\Documents\\Instagram\\photos\\uploads4");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "uploads4-" +
        file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

var count = 0;

module.exports = function (dbs) {
  /*
   ** Ping service to make sure service is up and working!!
   */

  var corsOptions = function (req, callback) {
    var corsOptions;
    if (req.header('Origin').includes('example')) {
      corsOptions = { origin: req.header('Origin'), optionsSuccessStatus: 200, }
    } else {
      corsOptions = { origin: "http://localhost:3000", optionsSuccessStatus: 200, }
    }
    callback(null, corsOptions) // callback expects two parameters: error and options
  }

  // var corsOptions = {
  //   origin: /example\.com$/,
  //   optionsSuccessStatus: 200,
  // };

  router.get("/cors", cors(corsOptions), function (req, res, next) {
    if (req.headers["user-agent"].includes("Postman")) {
      res
        .status(400)
        .send(
          "This api does not allow requests from postman, this is CORS-enabled for domains including example or http://localhost:3000"
        );
    } else {
      res
        .status(200)
        .send(
          "API call successful, this is CORS-enabled for domains including example or http://localhost:3000"
        );
    }
  });
  router.get("/ping", (req, res) => {
    res.status(200).send("Server is up and running!!");
  });

  router.get("/hi", (req, res) => {
    process.exit(0);
  });

  /* * * * * * * * * * SIGN UP , FIRST TIME USER REGISTRATION * * * * * * * * * * */
  router.post(
    "/signup",
    [
      check("name", warn.WARN_NAME_INPUT).not().isEmpty(),
      check("email", warn.WARN_EMAIL_INPUT).isEmail(),
      check("password", warn.WARN_PWD_INPUT).isLength({ min: 6 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { name, email, password } = req.body;
      try {
        //Find if user already exists
        // let user = await Users.findOne({ email });
        let user = await dbs.users.collection("users").findOne({ email });
        if (user) {
          res.status(200).send(err.ERR_USR_EXIST);
        } else {
          user = new Users({
            name,
            email,
            password,
          });
          // Encrypt pwd using bcrypt
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password.toString(), salt);
          const newUser = await dbs.users
            .collection("users")
            .insertOne(user)
            .then(({ ops }) => ops[0]);
          const authtoken = generateJwtToken(newUser);
          req.session.jwt = authtoken;
          // SEND VERIFICATION MAIL //
          var url = config.baseUrl + "/verify/" + authtoken; // Define a URL Link Address for the user to click on to
          const emailText =
            "Click on the link below to verify your account \n" + url;

          const emailInfo = { user, emailText };
          sendEmail(emailInfo); // SEND EMAIL

          newUser.authtoken = authtoken;
          await dbs.users
            .collection("users")
            .findOneAndUpdate({ _id: newUser._id }, newUser);
          res.status(200).send({
            status: "Verification Email has been sent successfully",
            message: "Please verify your email to complete registration",
          });
        }
      } catch (error) {
        res.status(500).send(err.ERR_SERVER);
      }
    }
  );

  /* * * * * * * * * * EMAIL VERIFICATION, USER SIGN UP * * * * * * * * * * */
  router.get("/verify/:token", async (req, res) => {
    // GET THE TOKEN FROM DB AND VERIFY
    try {
      const decoded = jwt.verify(req.params.token, config.jwtSecret);
      const user = await dbs.users
        .collection("users")
        .findOne({ _id: ObjectId(decoded.user.id) });
      if (user) {
        if (user.authtoken === req.params.token) {
          if (user.isVerified === true) {
            res.status(401).send(err.ERR_EMAIL_VERIFY);
          } else {
            await dbs.users
              .collection("users")
              .updateOne({ email: user.email }, { $set: { isVerified: true } });
            res.status(200).send({
              status: "Email verified, Registration Successful",
              message: "Welcome" + user.name,
            });
          }
        } else {
          res.status(402).send({
            status: err.ERR_INVALID_TOKEN,
            message: "Please try again!",
          });
        }
      }
    } catch (error) {
      res.status(500).send(err.ERR_SERVER);
    }
  });

  /* * * * * * * * * * * * LOGIN , EXISTING USER LOGIN WITH PASSWORD * * * * * * * * * * * */
  router.post(
    "/login",
    [
      check("email", warn.WARN_EMAIL_INPUT).isEmail(),
      check("password", warn.WARN_PWD_REQ).exists(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password } = req.body;
      try {
        //Find if user already exists
        let user = await dbs.users.collection("users").findOne({ email });
        if (user) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (user.isVerified === false) {
            // user has signed up , but not verified his email id
            res.status(400).send({
              status: err.ERR_EMAIL_NOT_VERIFY,
              message: "Please verify your email before loggin in",
            });
          }
          if (!isMatch) {
            res.status(400).send(err.ERR_PWD);
          }
        } else {
          res.status(400).send(err.ERR_USR_NOT_EXIST);
        }
        const authtoken = generateJwtToken(user);

        await dbs.users
          .collection("users")
          .updateOne({ email: user.email }, { $set: { authtoken: authtoken } });

        req.session.jwt = authtoken;

        //return jsonweb token
        res.status(200).send({
          status: "Authentication successful",
          message: "Welcome " + user.name + " !",
        });
      } catch (error) {
        res.status(500).send(err.ERR_SERVER);
      }
    }
  );

  /*
   ** Uploading images maximum upto 10, only images are allowed!!
   */
  router.post("/uploadImage", async (req, res) => {
    let dataStore;
    let db;
    if (count % 4 === 0) {
      dataStore = storage1;
      db = dbs.filePath1.collection("uploads");
    } else if (count % 4 === 1) {
      dataStore = storage2;
      db = dbs.filePath2.collection("uploads");
    } else if (count % 4 === 2) {
      dataStore = storage3;
      db = dbs.filePath3.collection("uploads");
    } else if (count % 4 === 3) {
      dataStore = storage4;
      db = dbs.filePath4.collection("uploads");
    }

    try {
      let upload = multer({
        storage: dataStore,
        fileFilter: helpers.imageFilter,
      }).array("profile_pic", 10);
      upload(req, res, async function (err) {
        let email = req.body.email;
        let userDb = await dbs.users.collection("users").findOne({ email });
        let user = await db.findOne({ email });
        let postsCount = userDb.postCount;

        if (req.fileValidationError) {
          return res.send(req.fileValidationError);
        } else if (!req.files) {
          return res.send("Please select an image to upload");
        } else if (err instanceof multer.MulterError) {
          return res.send(err);
        } else if (err) {
          return res.send(err);
        }

        count = count + 1;
        let urlArray, newsfeed;
        if (!user) {
          urlArray = [];
          for (let i = 0; i < req.files.length; i++) {
            urlArray.push(`${req.files[i].path}`);
          }
          newsfeed = urlArray;
          await db.insertOne({
            filePath: {
              paths: urlArray,
              count: postsCount,
            },
            email: email,
          });
        } else {
          newsfeed = [];
          urlArray = user.filePath;
          for (let i = 0; i < req.files.length; i++) {
            newsfeed.push(`${req.files[i].path}`);
            urlArray.push(`${req.files[i].path}`);
          }
          await db.updateOne(
            { email: user.email },
            {
              $set: {
                filePath: {
                  paths: urlArray,
                  count: postsCount,
                },
              },
            }
          );
        }
        await dbs.users
          .collection("users")
          .updateOne(
            { email: userDb.email },
            { $set: { postCount: postsCount + 1 } }
          );
        let followers = userDb.followers;

        for (let i = 0; i < followers.length; i++) {
          let followingUser = await dbs.users
            .collection("users")
            .findOne({ email: followers[i] });
          let array = followingUser.newsfeed;

          let object = {
            email: email,
            news: newsfeed,
          };
          array.push(object);
          await dbs.users
            .collection("users")
            .updateOne(
              { email: followers[i] },
              { $set: { newsfeed: array, postCount: postsCount } }
            );
        }

        res.status(200).send(`Image has been uploaded ${req.body.email}`);
      });
    } catch (error) {
      res.status(400).send("Error while uploading an image - ", error);
    }
  });

  /**
   * newsfeed display
   */
  router.get("/newsfeed", async (req, res) => {
    let email = req.body.email;
    let user = await dbs.users.collection("users").findOne({ email });
    // console.log("user info", user);
    res.status(200).send("newsfeed request");
  });

  /**
   * follow other users
   */
  router.post("/follow", async (req, res) => {
    let email = req.body.email;
    let user1 = await dbs.users.collection("users").findOne({ email });
    let user2 = await dbs.users
      .collection("users")
      .findOne({ email: req.body.myEmail });
    if (user1) {
      let followersArray = user1.followers;
      let followingArray = user2.following;
      followersArray.push(req.body.myEmail);
      followingArray.push(email);
      await dbs.users
        .collection("users")
        .updateOne({ email: email }, { $set: { followers: followersArray } });
      await dbs.users
        .collection("users")
        .updateOne(
          { email: req.body.myEmail },
          { $set: { following: followingArray } }
        );
      res
        .status(200)
        .send(
          "following list and followers list of other user has been updated"
        );
    } else {
      res.status(400).send("requested user does not exist");
    }
  });

  /**
   * unfollow request
   */
  router.post("/unfollow", async (req, res) => {
    let unFollowEmail = req.body.unFollowEmail;
    let myEmail = req.body.myEmail;
    let unfollowUser = await dbs.users
      .collection("users")
      .findOne({ email: unFollowEmail });
    if (unfollowUser) {
      await dbs.users
        .collection("users")
        .updateOne({ email: unFollowEmail }, { $pull: { followers: myEmail } });
      await dbs.users
        .collection("users")
        .updateOne({ email: myEmail }, { $pull: { following: unFollowEmail } });

      res.status(200).send("list has been updated");
    } else {
      res.status(400).send("error in unfollowing");
    }
  });

  /**
   * deleting an image
   */
  router.post("/deleteImage", async (req, res) => {
    let imagePath = req.body.imagePath;
    let email = req.body.email;
    let user = await dbs.users.collection("users").findOne({ email: email });
    if (user) {
      try {
        console.log("deleting photo");
        res.status(200).send("Photo has been deleted");
      } catch (error) {
        console.log("could not delete the photo");
        res.status(400).send("Could not delete the photo");
      }
    } else {
      res.status(400).send("user does not exist");
    }
  });

  /**
   * delete account
   */
  router.post("/deleteAccount", async (req, res) => {
    let email = req.body.email;
    let user = await dbs.users.collection("users").findOne({ email });

    if (user) {
      let followers = user.followers;
      let following = user.following;
      for (let i = 0; i < following.length; i++) {
        try {
          await dbs.users
            .collection("users")
            .updateOne(
              { email: following[i] },
              { $pull: { followers: email } }
            );
        } catch (error) {
          res.status(400).send("User does not exist");
        }
      }
      for (let j = 0; j < followers.length; j++) {
        try {
          await dbs.users
            .collection("users")
            .updateOne(
              { email: followers[j] },
              { $pull: { following: email } }
            );
        } catch (error) {
          res.status(400).send("User does not exist");
        }
      }
      await dbs.users.collection("users").deleteOne({ email });
      res.status(200).send("Your account has been deleted");
    } else {
      res.status(400).send("Account does not exist");
    }
  });

  return router;
};

const generateJwtToken = (user) => {
  const payload = {
    user: {
      id: user.id,
    },
  };
  return jwt.sign(payload, config.jwtSecret);
};

const sendEmail = async (emailInfo) => {
  let transporter = nodemailer.createTransport({
    // name: "www.gmail.com", requireTLS: true, service: 'gmail'
    host: "smtp.gmail.com",
    port: 465, //587
    secure: true, // use SSL
    auth: {
      user: config.mailSenderEmailId, // username for your mail server
      pass: config.mailSenderPwd, // password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail(
    {
      to: emailInfo.user.email, // list of receivers seperated by comma
      subject: "Account Verification", // Subject line
      text: emailInfo.emailText, // plain text body
    },
    (error, info) => {
      if (error) {
        return;
      }
      transporter.close();
    }
  );
};
