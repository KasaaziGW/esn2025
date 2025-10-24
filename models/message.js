const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const messageSchema = new Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  sentTime: { type: String, required: true },
  sender_status: { type: String, default: "OK" }
,
});
const Message = mongoose.model("Message", messageSchema);
module.exports = { Message };