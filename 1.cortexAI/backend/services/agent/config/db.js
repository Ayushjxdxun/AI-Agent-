import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB connected");
    } catch (error) {
        console.log(`DB error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;