const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  authtoken: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  followers: {
    type: Array,
    default: [],
  },
  following: {
    type: Array,
    default: [],
  },
  newsfeed: {
    type: Array,
    default: [],
  },
  postCount: {
    type: Number,
    default: 0,
  },
});

module.exports = Users = mongoose.model("users", UserSchema);
