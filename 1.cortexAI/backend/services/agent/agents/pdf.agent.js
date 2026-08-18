import { getModel } from "../config/llmModels.js";
import { generatePdf } from "../utils/generatePdf.js";
import { uploadToSupabase } from "../utils/uploadToSupabase.js";
import { getFromSupabase } from "../utils/getFromSupabase.js";
export const pdfAgent = async (state) => {
    try {
        const llm = await getModel("pdf");
        const prompt = `
You are an expert document writer.

Return ONLY valid JSON.

Do NOT return markdown.

Do NOT return explanations.

Structure:

{
"title":"",
"subtitle":"",
"sections":[
{
"heading":"",
"points":[]
}
]
}

Generate 4-8 sections.

Each section should have 3-6 concise bullet points.

Topic:
${state.prompt}
`;

        const res = await llm.invoke(prompt);
        const cleanJson = res.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const data=JSON.parse(cleanJson);
        const pdfBuffer=await generatePdf(data);

        const fileName=`${Date.now()}.pdf`;
        await uploadToSupabase(fileName,pdfBuffer,"application/pdf");
        const downloadUrl=await getFromSupabase(fileName,24*60);
        return {
            ...state,
            aiResponse: `# PDF Generated

**${data.title}**

📖 [Download PDF](${downloadUrl})

_Link expires in 24 hours._`
        };

    } catch (error) {
        console.log(error);
        return {
            ...state,
            aiResponse: "Error generating PDF data structure."
        };
    }
};