import "dotenv/config";
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
})

const gemini=new ChatGoogleGenerativeAI({
    model: "gemini-205-flash"
})

export const getModel=(agent)=>{
    switch(agent) {
        case "chat":
            return groq;
        case "coding":
            return gemini;
        case "search":
            return groq;
        default:
            return groq;
    }
}