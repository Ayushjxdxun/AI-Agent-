import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";
export const login = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded= await getAuth(app).verifyIdToken(token);
    let user= await User.findOne({firebaseUid:decoded.uid});

    if(!user) {
        user=await User.create({
            firebaseUid:decoded.uid,
            name:decoded.name,
            email:decoded.email,
            avatar:decoded.picture
        })
    }
    const sessionId=crypto.randomUUID();
    await redis.set(`session-${sessionId}`,JSON.stringify({
        userId:user._id,
        name:user.name,
        email:user.email,
        avatar:user.avatar
    }),"EX",60*60*24*7);
    res.cookie("session",sessionId,{
        httpOnly:true,
        secure:true,
        sameSite:"none",
        maxAge:1000*60*60*24*7
    });
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({message:`Internal server error ${error}`});
  }
}

export const logOut = async (req, res) => {
  try {
    const sessionId=req.cookies?.session;
    if(sessionId) {
        await redis.del(`session-${sessionId}`);
    }
    res.clearCookie("session", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    return res.status(200).json({message:"Logout successful"});
  } catch (error) {
    console.log(error);
    return res.status(500).json({message:`Internal server error ${error}`});
  }
}
