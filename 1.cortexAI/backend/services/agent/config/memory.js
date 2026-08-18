import redis from "../../../shared/redis/redis.js";
import { getMessages } from "../utils/getMessages.js";

const sanitizeImageList = (images = []) => {
    if (!Array.isArray(images)) return [];

    const seen = new Set();
    return images
        .map((image) => {
            const raw = typeof image === "string" ? image : image?.url || image?.src || image?.image_url?.url || "";
            if (typeof raw !== "string") return "";

            const trimmed = raw.trim();
            if (!trimmed || !/^https?:\/\//i.test(trimmed) || /\b(?:null|undefined)\b/i.test(trimmed)) return "";

            try {
                const parsed = new URL(trimmed);
                if (!["http:", "https:"].includes(parsed.protocol)) return "";
                const pathname = parsed.pathname.toLowerCase();
                const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?.*)?$/i.test(pathname);
                const hasImageFolder = /\/(?:images?|photos?|media|uploads?|files?|attachments?|content|cdn)\//i.test(pathname);
                if (!hasImageExt && !hasImageFolder) return "";
                return trimmed;
            } catch {
                return "";
            }
        })
        .filter(Boolean)
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        });
};

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
        images: sanitizeImageList(message?.images)
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