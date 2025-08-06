const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  fullname: String,
  institution: String,
  address: String,
  age: Number,
  course: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  studentIdPath: String
});

module.exports = mongoose.model("User", userSchema);
