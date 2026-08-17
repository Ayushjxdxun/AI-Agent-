import { getModel } from "../config/llmModels.js"
export const router=async (state)=>{
    if(state.agent&&state.agent!=="auto") {
        return {
        ...state,
        agent:state.agent
    }
    }

    const promptText = String(state.prompt || "");
    const imageRequestPattern = /\b(?:image|images|picture|pictures|photo|photos|illustration|illustrations|wallpaper|poster|screenshot|screenshots)\b|\b(?:generate|create|make|draw|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration)\b|\b(?:show|give|find)\s+(?:me\s+)?(?:a\s+)?(?:image|images|picture|pictures|photo|photos)\b|\b(?:image|photos?|pictures?)\s+(?:of|for)\b/i;

    if (imageRequestPattern.test(promptText)) {
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