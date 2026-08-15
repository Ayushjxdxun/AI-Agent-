import axios from "axios";
import {graph} from "../graph/graph.js"
export const agent=async(req,res) =>{
    try {
        const {prompt,conversationId}=req.body
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{conversationId,role:"user",content:prompt})
        const result=await graph.invoke({
            prompt,
            conversationId
        })
        const response = typeof result === "string"
            ? result
            : (result?.content || result?.aiResponse || result?.messages?.[result.messages.length - 1]?.content || "");
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{conversationId,role:"assistant",content:response})
        
        return res.status(200).json({content:response})
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}