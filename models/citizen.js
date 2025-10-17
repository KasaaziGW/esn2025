const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const citizenSchema = new Schema({
  email: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  status: { type: Object, default: {current_state:"undefined",timestamp:null} },
});
module.exports = mongoose.model("Citizen", citizenSchema);
