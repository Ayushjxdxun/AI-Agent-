import { getModel } from "../config/llmModels.js"
export const router=async (state)=>{
    const llm=getModel("router")
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
console.log(response);
return {
    ...state,
    agent:response.content.trim().tolowerCase()
}

}