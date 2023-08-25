import mongoose from "mongoose";
import { Schema } from "mongoose";
const userSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
    unique: true,
  },
  email: {
    type: String,
    require: true,
    unique: true,
  },
  password: {
    type: String,
    require: true,
  },
  telephone: {
    type: String,
    require: false,
  },
});

export default mongoose.model("user", userSchema);