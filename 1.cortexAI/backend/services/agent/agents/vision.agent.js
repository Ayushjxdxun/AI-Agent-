import {getModel} from "../config/llmModels.js"
import axios from "axios"
import { uploadToSupabase } from "../utils/uploadToSupabase.js";
import { getFromSupabase } from "../utils/getFromSupabase.js";
export const visionAgent=async (state)=>{
    try {
    const llm = await getModel("image");
    const res = await llm.invoke(
      `You are an elite AI image prompt engineer.

Convert the user request into a highly detailed image generation prompt.

Requirements:

- Cinematic lighting
- Professional composition
- Ultra realistic
- High detail
- Beautiful color palette
- Sharp focus
- 8K quality
- Photorealistic
- Depth of field
- Professional photography
- Stunning visuals

Return only the image prompt.

User Request:
${state.prompt}`
    );

    const prompt = res.content.trim();

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });

    const buffer = Buffer.from(imageRes.data);
    const filename = `image-${Date.now()}.png`;

    // Replaced AWS with Supabase upload and fetch
    await uploadToSupabase(filename, buffer, "image/png");
    const downloadUrl = await getFromSupabase(filename, 24*60);

    return {
      ...state,
      aiResponse: `
# 🖼️ Image Generated Successfully

![Generated Image](${downloadUrl})

📥 [Download Image](${downloadUrl})

⏳ Link expires in 24 hours.`,
      images: [downloadUrl],
      downloadUrl
    };

  } catch (error) {
    console.error("Error in visionAgent:", error);
    return {
      ...state,
      aiResponse: "Sorry, I encountered an error while generating your image."
    };
  }
}