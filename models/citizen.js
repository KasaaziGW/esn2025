const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const citizenSchema = new Schema({
  email: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  status: { type: String, enum: ['OK', 'Help', 'Emergency'], default: 'Undefined' },
});
module.exports = mongoose.model("Citizen", citizenSchema);
