import redis from "../../../shared/redis/redis.js";
import { getMessages } from "../utils/getMessages.js";

const sanitizeMessage = (message = {}) => {
    const content = typeof message?.content === "string"
        ? message.content
        : Array.isArray(message?.content)
            ? message.content.map((item) => typeof item === "string" ? item : (item?.text || "")).join("\n")
            : message?.content && typeof message.content === "object"
                ? (message.content.text || "")
                : "";

    return {
        ...message,
        role: message?.role || "assistant",
        content: String(content || ""),
        images: Array.isArray(message?.images) ? message.images.filter(Boolean) : []
    };
};

export const getMemory=async(conversationId)=>{
    
        const key=`messages-${conversationId}`
        const cached=await redis.get(key)
        if(cached) {
            const parsed = JSON.parse(cached);
            return Array.isArray(parsed) ? parsed.map(sanitizeMessage) : [];
        }
        const messages=await getMessages(conversationId)
        const sanitized = Array.isArray(messages) ? messages.map(sanitizeMessage) : [];
        await redis.set(key,JSON.stringify(sanitized),"EX",24*60*60);
        return sanitized
}
export const addMessage=async(conversationId,role,content,images=[])=>{
    if (!conversationId) return;

    const key = `messages-${conversationId}`;
    
    const messages = await getMemory(conversationId);

    messages.push(sanitizeMessage({
        role,
        content,
        images
    }));

    if (messages.length > 20) messages.shift();

    await redis.set(key, JSON.stringify(messages), "EX", 24 * 60 * 60);
}