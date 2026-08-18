import { getModel } from "../config/llmModels.js"
export const router=async (state)=>{
    const normalizedAgent = String(state.agent || "").trim().toLowerCase();
    if (normalizedAgent && normalizedAgent !== "auto") {
        return {
            ...state,
            agent: normalizedAgent === "image" ? "vision" : normalizedAgent
        }
    }

    const promptText = String(state.prompt || "");
    const imageKeywordPattern = /\b(?:image|images|picture|pictures|photo|photos|illustration|illustrations|poster|wallpaper|screenshot|screenshots|portrait)\b/i;
    const generationVerbPattern = /\b(?:generate|create|make|draw|render|design|produce|craft|compose)\b/i;
    const imageGenerationPattern = /\b(?:generate|create|make|draw|render|design|produce|craft|compose)\s+(?:an?\s+)?(?:image|picture|photo|illustration|poster|artwork|portrait)\b|\b(?:image|picture|photo|illustration|poster|artwork|portrait)\s+(?:of|for)\b|\b(?:show|give|make)\s+(?:me\s+)?(?:a\s+)?(?:image|picture|photo|illustration)\b/i;

    const isImageGenerationRequest = generationVerbPattern.test(promptText) && imageKeywordPattern.test(promptText);
    const isWebImageLookupRequest = imageKeywordPattern.test(promptText) && !generationVerbPattern.test(promptText);

    if (isImageGenerationRequest || imageGenerationPattern.test(promptText)) {
        return {
            ...state,
            agent: "vision"
        }
    }

    if (isWebImageLookupRequest) {
        return {
            ...state,
            agent: "search"
        }
    }

    const llm=await getModel("router")
    const prompt=`You are an agent router.
    
    Available agents:
    1. chat
    2. coding
    3. vision
    4. pdf
    5. ppt
    6. search

    Rules:
    chat:
    General Conversation,
    explanation,
    learning,
    concepts.

    search:
    current event,
    latest information,
    news,
    recent developments,
    internet lookup.

    coding:
    Geneerate code,
    debug code,
    build projects,
    architecture,
    API design.

    pdf:
    Questions about gennerate pdf
    or document context.

    ppt:
    Questions about gennerate ppt
    or ppt context.

    vision:
    Generate or create image.

    Return only one woord:

    chat
    search
    coding
    pdf
    ppt
    vision

    User Query:
    ${state.prompt}`

const response=await llm.invoke(prompt);
const cleanedAgent = response.content.replace(/[^a-zA-Z]/g, "").toLowerCase();
console.log(response);
return {
    ...state,
    agent:response.content.trim().toLowerCase()
}

}