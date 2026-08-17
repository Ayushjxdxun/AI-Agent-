import axios from "axios";
import {graph} from "../graph/graph.js"
import { addMessage } from "../config/memory.js";
import { chatAgent } from "../agents/chat.agent.js";

const normalizeContent = (content) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        const textParts = content
            .filter((item) => typeof item === "string" || item?.type === "text" || item?.text)
            .map((item) => typeof item === "string" ? item : (item?.text || ""));
        return textParts.join("\n");
    }
    if (content && typeof content === "object") {
        return content.text || "";
    }
    return "";
};

const extractImages = (content) => {
    if (Array.isArray(content)) {
        return content
            .map((item) => item?.image_url?.url || item?.url || item?.src || "")
            .filter(Boolean);
    }
    if (typeof content === "string") {
        const urls = content.match(/https?:\/\/[^\s)"'>]+(?:\.(?:png|jpe?g|gif|webp|bmp|svg))(?:\?[^\s)"'>]*)?/gi) || [];
        return [...new Set(urls.map((url) => url.trim()))];
    }
    return [];
};

export const agent=async(req,res) =>{
    try {
        const {prompt,conversationId,agent,images}=req.body
        await addMessage(conversationId,"user",prompt,images)

        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{conversationId,role:"user",content:prompt,images})
        const result=await graph.invoke({
            prompt,
            conversationId,
            agent,
            images
        })
        const response = typeof result === "string"
            ? result
            : (result?.content || result?.aiResponse || result?.messages?.[result.messages.length - 1]?.content || "");
        const normalizedResponse = normalizeContent(response);
        const aiImages = Array.isArray(result?.images) ? result.images.filter(Boolean) : extractImages(response);

        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
            conversationId,
            role:"assistant",
            content:normalizedResponse,
            images: aiImages
        })
        
        return res.status(200).json({content:normalizedResponse, images: aiImages})
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}