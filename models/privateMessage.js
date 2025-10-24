const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    sentTime: String
});

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
