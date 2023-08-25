import mongoose from "mongoose";
import { Schema } from "mongoose";
const accessSchema = new Schema({
  sessionId: {
    type: String,
    require: true,
  },
  time: {
    type: String,
    require: true,
  },
});

export default mongoose.model("access", accessSchema);