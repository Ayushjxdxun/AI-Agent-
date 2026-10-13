import "dotenv/config";
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
})

let gemini;
const getGemini = () => {
    if (!gemini) {
        const apiKey = process.env.GOOGLE_API_KEY
            || process.env.GEMINI_API_KEY
            || process.env.Google_API_KEY
            || process.env.Google_API_Key;
        if (!apiKey) {
            throw new Error("Gemini requires GOOGLE_API_KEY or GEMINI_API_KEY in the environment.");
        }
        gemini = new ChatGoogleGenerativeAI({
            model: "gemini-3.8-flash",
            apiKey
        });
    }
    return gemini;
};

export const getModel=(agent)=>{
    switch(agent) {
        case "chat":
            return groq;
        case "coding":
            return getGemini();
        case "search":
            return groq;
        case "image":
        case "vision":
            return groq;
        case "gemini":
            return getGemini();
        default:
            return groq;
    }
}