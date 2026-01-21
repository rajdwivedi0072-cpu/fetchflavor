const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  email: { type: String, required: true },
  type: { type: String, default: "Home" },
  cityState: { type: String, required: true },
  street: { type: String, required: true },
  postCode: { type: String },
  apartment: { type: String },
  isDefault: { type: Boolean, default: false } // ✅ New Field
});

module.exports = mongoose.model("Address", AddressSchema);