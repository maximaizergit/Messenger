const mongoose = require("mongoose");
const { Schema } = mongoose;

const friendsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  friends: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequestsSent: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequestsReceived: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Friends = mongoose.model("Friends", friendsSchema);

module.exports = Friends;
