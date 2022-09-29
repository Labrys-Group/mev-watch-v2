import path from "path";

import { config } from "dotenv";
import mongoose from "mongoose";

import * as models from "./models";

config({ path: path.resolve(__dirname, "../.env") });

const connect = async () => {
  if (!process.env.MONGO_URI)
    throw new Error("Missing Mongo DB Uri connection string");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error(error);
  }
};

export { connect, models };
