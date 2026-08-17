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

export const searchAgent=async (state)=>{
    try {
        const results=await searchTool.invoke({
            query:state.prompt
        })
        const sanitizedResults = sanitizeSearchResults(results?.results || [])
        const imageUrls = sanitizedResults.flatMap((result) => result.images).filter(Boolean).slice(0, 8)

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