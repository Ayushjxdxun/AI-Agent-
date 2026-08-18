import { getModel } from "../config/llmModels.js";
import { generatePpt } from "../utils/generatePpt.js";
import { uploadToSupabase } from "../utils/uploadToSupabase.js";
import { getFromSupabase } from "../utils/getFromSupabase.js";
export const pptAgent = async (state) => {
    try {
        const llm = await getModel("ppt");
        const prompt = `You are a professional presentation designer.

Return ONLY valid JSON.

Format:

{
"title":"",
"subtitle":"",
"slides":[
{
"title":"",
"points":[
"",
"",
"",
""
]
}
]
}

Rules:

- Generate exactly 6 content slides.
- Each slide should have 4-6 concise bullet points.
- No markdown.
- No explanation.
- No code block.
- Return ONLY JSON.

Topic:
${state.prompt}`;

        const res = await llm.invoke(prompt);
        const cleanJson = res.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const data=JSON.parse(cleanJson);
        const buffer=await generatePpt(data);
        
        const fileName=`ppt-${Date.now()}.pptx`
        await uploadToSupabase(fileName,buffer,"application/vnd.openxmlformats-officedocument.presentationml.presentation")
        const downloadUrl = await getFromSupabase(fileName, 24 * 60 * 60);

    return {
        ...state,
        aiResponse: `# ✅ Presentation Generated

**${data.title}**

🗂️ [Download PPT](${downloadUrl})

_Link expires in 10 minutes._`
    }
    } catch (error) {console.log(error)
    return {
        ...state,
        aiResponse: "Failed to generate PPT.."
    }
}
}