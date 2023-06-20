const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    Name: {
      type: String,
      required: true,
    },
    Mail: {
      type: String,
      required: true,
    },
    Pass: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const USER = mongoose.model("Users", userSchema);

module.exports = USER;
