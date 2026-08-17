import axios from "axios";
import {graph} from "../graph/graph.js"
import { addMessage } from "../config/memory.js";
import { chatAgent } from "../agents/chat.agent.js";

const extractJsonObject = (value) => {
    if (!value || typeof value !== "string") return value;

    let text = value.trim();
    if (!text) return value;

    if (text.startsWith("```")) {
        text = text.replace(/^```(?:json|javascript|js|ts|typescript)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }

    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        try {
            const unwrapped = JSON.parse(text);
            if (typeof unwrapped === "string") {
                text = unwrapped;
            }
        } catch {
            text = text.slice(1, -1);
        }
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        text = text.slice(firstBrace, lastBrace + 1);
    }

    return text;
};

const parseGeneratedFiles = (content) => {
    if (!content) return [];

    let candidate = content;
    if (typeof content === "string") {
        const jsonText = extractJsonObject(content);

        try {
            candidate = JSON.parse(jsonText);
        } catch {
            try {
                candidate = JSON.parse(JSON.parse(`"${jsonText.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`));
            } catch {
                const filePattern = /"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"/gs;
                const fallbackFiles = [];
                let match;

                while ((match = filePattern.exec(jsonText)) !== null) {
                    const name = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\r/g, "\r").replace(/\\t/g, "\t");
                    const fileContent = match[2]
                        .replace(/\\n/g, "\n")
                        .replace(/\\r/g, "\r")
                        .replace(/\\t/g, "\t")
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, "\\");

                    fallbackFiles.push({ name, content: fileContent });
                }

                return fallbackFiles;
            }
        }
    }

    if (Array.isArray(candidate)) {
        return candidate.filter((item) => item && typeof item === "object" && typeof item.name === "string" && typeof item.content === "string");
    }

    if (candidate && typeof candidate === "object") {
        const files = Array.isArray(candidate.files) ? candidate.files : Array.isArray(candidate?.output?.files) ? candidate.output.files : [];
        return files.filter((item) => item && typeof item === "object" && typeof item.name === "string" && typeof item.content === "string");
    }

    return [];
};

const normalizeContent = (content) => {
    const files = parseGeneratedFiles(content);
    if (files.length) {
        const fileList = files.map((file) => `- ${file.name}`).join("\n");
        return `Generated ${files.length} file(s):\n\n${fileList}`;
    }

    if (typeof content === "string") {
        const trimmed = content.trim();
        if (!trimmed) return "";

        try {
            return normalizeContent(JSON.parse(trimmed));
        } catch {
            return trimmed;
        }
    }

    if (Array.isArray(content)) {
        const textParts = content
            .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") {
                    if (typeof item.text === "string") return item.text;
                    if (Array.isArray(item.content)) return normalizeContent(item.content);
                    if (item.content && typeof item.content === "object") return normalizeContent(item.content);
                    if (item.content && typeof item.content === "string") return item.content;
                    return JSON.stringify(item, null, 2);
                }
                return "";
            })
            .filter(Boolean);

        return textParts.join("\n\n");
    }

    if (content && typeof content === "object") {
        if (typeof content.text === "string") return content.text;
        if (typeof content.content === "string") return content.content;
        if (typeof content.message === "string") return content.message;
        return JSON.stringify(content, null, 2);
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
        const parsedFiles = parseGeneratedFiles(response) || parseGeneratedFiles(result?.artifacts) || [];
        const artifacts = parsedFiles.length ? [{ id: Date.now(), type: "Project", files: parsedFiles }] : (Array.isArray(result?.artifacts) ? result.artifacts : []);
        const normalizedResponse = normalizeContent(response);
        const aiImages = Array.isArray(result?.images) ? result.images.filter(Boolean) : extractImages(response);

        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
            conversationId,
            role:"assistant",
            content:normalizedResponse,
            images: aiImages,
            artifacts
        })
        
        return res.status(200).json({content:normalizedResponse, images: aiImages, artifacts});
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}