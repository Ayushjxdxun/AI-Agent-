import { searchTool } from "../config/tavily.js";

const normalizeImageUrl = (value) => {
    if (!value) return "";

    const raw = typeof value === "string" ? value : value?.url || value?.src || value?.image_url?.url || "";
    if (typeof raw !== "string") return "";

    const trimmed = raw.trim().replace(/[\])}>"']+$/g, "");
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return "";
    if (/\b(?:null|undefined)\b/i.test(trimmed)) return "";

    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) return "";

        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();

        if (/(?:favicon|avatar|logo|ads|tracking|pixel|analytics|tinyurl|bit\.ly)/i.test(host) || /(?:favicon|avatar|logo|ads|tracking|pixel|analytics)/i.test(path)) {
            return "";
        }

        const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?.*)?$/i.test(path);
        const hasImageFolder = /\/(?:images?|photos?|media|uploads?|files?|attachments?|content|cdn)\//i.test(path);
        if (!hasImageExt && !hasImageFolder) {
            return "";
        }

        return trimmed;
    } catch {
        return "";
    }
};

const dedupeImages = (images = []) => {
    const seen = new Set();

    const validImages = images
        .map((image) => normalizeImageUrl(image))
        .filter(Boolean)
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        });

    return validImages.sort((a, b) => {
        const aScore = /(unsplash|pexels|pixabay|wallhaven|images\.flickr|flickr|imgur)/i.test(new URL(a).hostname) ? 1 : 0;
        const bScore = /(unsplash|pexels|pixabay|wallhaven|images\.flickr|flickr|imgur)/i.test(new URL(b).hostname) ? 1 : 0;
        return bScore - aScore;
    });
};

const sanitizeSearchResults = (results = []) => {
    if (!Array.isArray(results)) return [];

    return results.slice(0, 5).map((result) => ({
        title: result?.title || "Search result",
        url: result?.url || "",
        content: String(result?.content || "").slice(0, 800),
        images: dedupeImages(Array.isArray(result?.images) ? result.images.slice(0, 10) : [])
    }));
};

const isImageRequest = (prompt = "") => {
    const normalizedPrompt = String(prompt);
    const imageRequestPattern = /\b(?:image|images|picture|pictures|photo|photos|illustration|illustrations|wallpaper|poster|screenshot|screenshots)\b|\b(?:show|give|find)\s+(?:me\s+)?(?:a\s+)?(?:image|images|picture|pictures|photo|photos)\b|\b(?:image|photos?|pictures?)\s+(?:of|for)\b/i;

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
            ? dedupeImages(sanitizedResults.flatMap((result) => result.images)).slice(0, 8)
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