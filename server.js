"use strict";

var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var cookieSession = require('cookie-session');

var routes = require("./service/serviceFunctions");

const connectDB = require("./config/db");

process.on("uncaughtException", function (err) {
	console.log("uncaughtException");
});

process.on("unhandledRejection", function (reason, p) {
	console.log("unhandledRejection", reason);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.set('trust proxy', true)
app.use(cookieSession({
    signed: false
}))
const port = process.env.PORT || 1998;
connectDB().then((dbs) => {
  app.use("/insta", routes(dbs));
});

app.listen(port, () => {
  console.log(`app listening on port ${port}!!`);
});
