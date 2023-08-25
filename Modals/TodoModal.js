import mongoose from "mongoose";
const Schema = mongoose.Schema;

const todoSchema = new Schema({
  todo: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
  },
});

export default mongoose.model("todo", todoSchema);