import { getModel } from "../config/llmModels.js"
import { getMemory, addMessage } from "../config/memory.js"
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"

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

const sanitizeHistoryMessage = (msg = {}) => {
    const safeContent = typeof msg?.content === "string"
        ? msg.content
        : Array.isArray(msg?.content)
            ? msg.content.map((item) => typeof item === "string" ? item : (item?.text || "")).join("\n")
            : msg?.content && typeof msg.content === "object"
                ? (msg.content.text || "")
                : "";

    return {
        ...msg,
        content: String(safeContent || ""),
        images: Array.isArray(msg?.images) ? msg.images.filter(Boolean) : []
    };
};

export const chatAgent=async (state)=>{
    const llm= await getModel("chat")
    const history=await getMemory(state.conversationId)
    const compactSearchResults = Array.isArray(state.searchResults)
        ? state.searchResults
        : (Array.isArray(state.searchResults?.results) ? state.searchResults.results : []);

    const searchContext = compactSearchResults.length > 0 ? `
    Web Search Results:
    ${compactSearchResults
        .map((result) => `- ${result.title || "Result"}: ${result.url || ""}\n${String(result.content || "").slice(0, 500)}`)
        .join("\n\n")}
    Answer the user using only the above search results.
    ` : ""

    const prompt=`
        You are CortexAI, an intelligent AI assistant.

        Rules:

        - For simple questions, greetings, and short queries, respond naturally in plain text.
        - For technical, educational, coding, or detailed topics, use clean Markdown.
        
        ${searchContext}

        If searchContext exists:
        - Use search results to answer.
        - Do not mention internal tools.

        Formatting:

        - Use # for titles and ## for sections.
        - Leave a blank line after headings.
        - Use bullet points for lists.
        - Use numbered lists for steps.
        - Use fenced code blocks with language tags for code.
        - Keep paragraphs short and readable.
        - Never write headings and content on the same line.
        - Never generate large walls of text.
    `
    const messages=[
        new SystemMessage(prompt)
    ]
    const messageHistory = Array.isArray(history) ? history.map(sanitizeHistoryMessage) : (history?.messages || []).map(sanitizeHistoryMessage);

    messageHistory.forEach(msg => {
        const safeHistoryContent = String(msg.content || "");
        if (msg.role === "user") {
            messages.push(new HumanMessage(safeHistoryContent));
        } else {
            messages.push(new AIMessage(safeHistoryContent));
        }
    });
    const uploadedImages = Array.isArray(state.images)
        ? state.images.filter((img) => typeof img === "string" && img.startsWith("data:image/"))
        : [];

    let humanContent = state.prompt;
    if (uploadedImages.length > 0) {
        humanContent = [
            { type: "text", text: state.prompt },
            ...uploadedImages.map(img => ({
                type: "image_url",
                image_url: { url: img }
            }))
        ];
    }
    messages.push(new HumanMessage(humanContent))
    const response=await llm.invoke(messages)
    const responseContent = normalizeContent(response.content)
    const responseImages = extractImages(response.content)
    const isImageRequest = /\b(?:image|images|picture|pictures|photo|photos|illustration|illustrations|wallpaper|poster|screenshot|screenshots)\b|\b(?:generate|create|make|draw|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration)\b|\b(?:show|give|find)\s+(?:me\s+)?(?:a\s+)?(?:image|images|picture|pictures|photo|photos)\b|\b(?:image|photos?|pictures?)\s+(?:of|for)\b/i.test(String(state.prompt || ""));
    const finalImages = (Array.isArray(state.images) && state.images.length > 0)
        ? state.images
        : responseImages;

    const finalContent = isImageRequest && finalImages.length > 0
        ? "Here are the images you asked for."
        : responseContent;

    if (state.conversationId) {
            await addMessage(state.conversationId, "user", state.prompt, state.images || []);
            await addMessage(state.conversationId, "assistant", finalContent, finalImages);
        }
    return {
        ...state,
        aiResponse: finalContent,
        images: finalImages
    }
}