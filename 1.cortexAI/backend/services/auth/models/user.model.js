import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        unique: true,
    },name: string,
    email: string,
    avatar: string
},{timestamps: true});

const User=mongoose.model("User", userSchema);
export default User;