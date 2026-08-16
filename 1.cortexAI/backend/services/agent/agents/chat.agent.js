import { getModel } from "../config/llmModels.js"
import { getMemory, addMessage } from "../config/memory.js"
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
export const chatAgent=async (state)=>{
    const llm= await getModel("chat")
    const history=await getMemory(state.conversationId)
    const prompt=`
        You are CortexAI, an intelligent AI assistant.

        Rules:

        - For simple questions, greetings, and short queries, respond naturally in plain text.
        - For technical, educational, coding, or detailed topics, use clean Markdown.


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
    const messageHistory = Array.isArray(history) ? history : (history?.messages || []);

    messageHistory.forEach(msg => {
        if (msg.role === "user") {
            messages.push(new HumanMessage(msg.content));
        } else {
            messages.push(new AIMessage(msg.content));
        }
    });
    messages.push(new HumanMessage(state.prompt))
    console.log(messages);
    const response=await llm.invoke(messages)
    if (state.conversationId) {
            await addMessage(state.conversationId, "user", state.prompt);
            await addMessage(state.conversationId, "assistant", response.content);
        }
    return {
        ...state,
        aiResponse:response.content
    }
}