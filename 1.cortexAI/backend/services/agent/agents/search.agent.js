import { searchTool } from "../config/tavily.js";

const sanitizeSearchResults = (results = []) => {
    if (!Array.isArray(results)) return [];

    return results.slice(0, 5).map((result) => ({
        title: result?.title || "Search result",
        url: result?.url || "",
        content: String(result?.content || "").slice(0, 800),
        images: Array.isArray(result?.images) ? result.images.slice(0, 5) : []
    }));
};

const isImageRequest = (prompt = "") => {
    const normalizedPrompt = String(prompt);
    const imageRequestPattern = /\b(?:image|images|picture|pictures|photo|photos|illustration|illustrations|wallpaper|poster|screenshot|screenshots)\b|\b(?:generate|create|make|draw|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration)\b|\b(?:show|give|find)\s+(?:me\s+)?(?:a\s+)?(?:image|images|picture|pictures|photo|photos)\b|\b(?:image|photos?|pictures?)\s+(?:of|for)\b/i;

    return imageRequestPattern.test(normalizedPrompt);
};

export const searchAgent=async (state)=>{
    try {
        const results=await searchTool.invoke({
            query:state.prompt
        })
        const sanitizedResults = sanitizeSearchResults(results?.results || [])
        const wantsImages = isImageRequest(state.prompt)
        const imageUrls = wantsImages
            ? sanitizedResults.flatMap((result) => result.images).filter(Boolean).slice(0, 8)
            : [];

        return {
            ...state,
            searchResults: sanitizedResults,
            images: imageUrls
        }
    } catch(error) {
        return {
            ...state,
            searchResults:[],
            images:[]
        }
    }
};