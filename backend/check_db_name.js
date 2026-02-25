import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const checkDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database:", mongoose.connection.name);
    console.log(
      "Collections:",
      (await mongoose.connection.db.listCollections().toArray()).map(
        (c) => c.name,
      ),
    );
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

checkDb();
