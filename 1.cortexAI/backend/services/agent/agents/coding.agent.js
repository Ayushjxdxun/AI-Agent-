import { getModel } from "../config/llmModels.js"

const extractJsonObject = (value = "") => {
  if (typeof value !== "string") return "";

  let text = value.trim();
  if (!text) return "";

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json|javascript|js|ts|typescript)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    try {
      const unwrapped = JSON.parse(text);
      if (typeof unwrapped === "string") {
        text = unwrapped;
      }
    } catch {
      text = text.slice(1, -1);
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text;
};

const extractProjectFilesFromRawText = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") return [];

  let text = extractJsonObject(rawText);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.files)) {
      return parsed.files.filter((file) => file && typeof file.name === "string" && typeof file.content === "string");
    }
  } catch {
    // continue with regex extraction below
  }

  const files = [];
  const fileRegex = /"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"/gs;
  let match;

  while ((match = fileRegex.exec(text)) !== null) {
    const name = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    const content = match[2]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    files.push({ name, content });
  }

  return files;
};

const parseProjectFiles = (rawText = "") => {
  const files = extractProjectFilesFromRawText(rawText);
  return files.length ? { files } : { files: [] };
};

export const codingAgent=async (state)=>{
    //review code,generate code(in json) if debug or review return markdown i.e. simpple response .
    //find the intent of the user , use deepseek for coding ,for intent detection use groq
  const intentLlm = await getModel("intent")
  const llm=await getModel("coding")
  const intentRes = await intentLlm.invoke(`
You are an intent classifier.

Return ONLY one of these values.

CODE_GENERATION
CODE_REVIEW
CODE_EXPLANATION
DEBUGGING
OPTIMIZATION
CONVERSION
DOCUMENTATION

User Request:
${state.prompt}
`)
  const intent = String(intentRes?.content || "").trim().toUpperCase()
  if(intent === "CODE_GENERATION"){
    const prompt=`
You are CortexAI Coding Agent.

Generate the requested project.

Default stack:
- HTML
- CSS
- JavaScript

Use React / Next.js / Vue ONLY if explicitly requested.

Rules:

- Responsive
- Modern UI
- CSS Variables
- Flexbox/Grid
- Smooth Scroll
- Hover Effects
- Beautiful spacing
- Single page unless user asks otherwise.

Return ONLY valid JSON.

Schema:

{
  "files":[
    {
      "name":"index.html",
      "content":"..."
    },
    {
      "name":"style.css",
      "content":"..."
    },
    {
      "name":"script.js",
      "content":"..."
    }
  ]
}

Rules:

- Output must start with {
- Output must end with }
- No markdown
- No explanation
- No extra text
- No \`\`\`
- Never mention intent

User Request:
${state.prompt}
`
    const res=await llm.invoke(prompt)
    const parsed = parseProjectFiles(res.content)
    const files = parsed.files || []

    return {
        ...state,
        aiResponse:res.content,
        artifacts:[{
            id:Date.now(),
            type:"Project",
            files
        }]
    }
  }
const res = await llm.invoke(`
The user's request is:

${intent}

Return Markdown only.

Never generate project files.

Use headings like:

# Overview

## Explanation

## Problems

## Improvements

## Best Practices

## Optimized Code (if needed)

User Request:

${state.prompt}
`)

const data = res.content
return {
  ...state,
  aiResponse: data,
  artifacts: []
}


}