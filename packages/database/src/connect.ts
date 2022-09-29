import path from "path";

import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: path.resolve(__dirname, "../.env") });

export const connect = async () => {
  if (!process.env.MONGO_URI)
    throw new Error("Missing Mongo DB Uri connection string");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};
