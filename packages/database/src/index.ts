import mongoose from "mongoose";

import * as models from "./models";

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected");
  } catch (error) {
    console.error(error);
  }
};

export { connect, models };
