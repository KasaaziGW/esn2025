const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    sentTime: String,
    sender_status: { type: Object, required: false }
});

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
