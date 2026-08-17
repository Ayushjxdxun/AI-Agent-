import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import redis from "../../../shared/redis/redis.js";
export const createConversation = async (req, res) => {
    try {
        const userId=req.headers["x-user-id"];
        console.log("userId",userId);
        const conversation =await Conversation.create({userId:userId});
        return res.status(200).json({ message: "Conversation created successfully",
            conversation: conversation });
    } catch (error) {
        return res.status(500).json({ message: `create conversation error ${error.message}` });
    }
};
export const getConversations = async (req, res) => {
    try {
        const userId=req.headers["x-user-id"];
        console.log("userId",userId);
        const convesations =await Conversation.find({userId:userId}).sort({updatedAt:-1});
        return res.status(200).json({ message: "Conversations retrieved successfully", conversations: convesations });
    } catch (error) {
        return res.status(500).json({ message: `get conversations error ${error.message}` });
    }
};

export const updateConversation = async (req, res) => {
    try {
        const {id,title} = req.body;
        const conversation = await Conversation.findByIdAndUpdate(id,{title}, { new: true });
        return res.status(200).json({ message: "Conversation updated successfully", conversation });
    } catch (error) {
        return res.status(500).json({ message: `update conversations error ${error.message}` });
    }
};

const normalizeMessageContent = (content) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((item) => typeof item === "string" ? item : (item?.text || "")).join("\n");
    }
    if (content && typeof content === "object") {
        return content.text || "";
    }
    return "";
};

export const saveMessage = async (req, res) => {
    try {
        const {conversationId, role, content,images,artifacts} = req.body;
        const safeContent = normalizeMessageContent(content) || (Array.isArray(images) && images.length ? "Here are the images you asked for." : "");
        const message =await Message.create({
            conversationId,
            role,
            content: safeContent,
            images: Array.isArray(images) ? images.filter(Boolean) : [],
            artifacts
        });
        return res.status(200).json({ message: "Message saved successfully", message });
    } catch (error) {
        return res.status(500).json({ message: `save message error ${error.message}` });
    }
};

export const getMessage = async (req, res) => {
    try {
        const messages =await Message.find({conversationId:req.params.conversationId});
        const filteredMessages = messages.filter((msg) => {
            const hasText = typeof msg?.content === "string" ? msg.content.trim().length > 0 : false;
            const hasImages = Array.isArray(msg?.images) ? msg.images.length > 0 : false;
            return hasText || hasImages;
        });
        return res.status(200).json({ message: "Messages retrieved successfully", messages: filteredMessages });
    } catch (error) {
        return res.status(500).json({ message: `get messages error ${error.message}` });
    }
};

