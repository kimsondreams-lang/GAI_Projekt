import { db } from "./memoryService.js";
import { BLOG_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT, EDITOR_REWRITE_PROMPT, PRODUCT_VISUALIZER_PROMPT } from "../constants.js";
export const generateChatResponse = async (history, userMessage, attachments) => {
    return await db.sendCommand(userMessage, 'user', attachments, { modelRole: 'chat' });
};
export const generateBlogPost = async (topic, instructions, amazonTag) => {
    const prompt = `Write a comprehensive, SEO-optimized blog post about "${topic}". 
    ${instructions ? `Special Instructions: ${instructions}` : ''}
    Format: HTML body content (Use <h1>, <h2>, <p>, <ul>). Do not include <html> or <body> tags.`;
    let systemInstruction = BLOG_SYSTEM_PROMPT;
    if (amazonTag) {
        systemInstruction = systemInstruction.replace('{{AMAZON_TAG}}', amazonTag);
    }
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: systemInstruction,
        modelRole: 'writing'
    });
    return response.replace(/```html/g, '').replace(/```/g, '').trim();
};
export const rewriteArticleText = async (selection, instruction) => {
    const prompt = `Original Text:\n"${selection}"\n\nInstruction: ${instruction}`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: EDITOR_REWRITE_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```/g, '').trim();
};
export const rewriteFullArticleHtml = async (html, instruction) => {
    const safeHtml = String(html || '').trim();
    const prompt = `Rewrite the following HTML article.\n\nInstruction: ${instruction || 'Improve clarity, flow, and professionalism while preserving meaning.'}\n\nRules:\n- Return ONLY HTML body content.\n- Keep the existing structure and headings.\n- Do NOT include markdown fences.\n- Do NOT wrap output in <think> tags.\n\n[HTML]\n${safeHtml}\n[/HTML]`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: BLOG_SYSTEM_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```html/g, '').replace(/```/g, '').trim();
};
export const rewriteHtmlFragment = async (htmlFragment, instruction) => {
    const safeHtml = String(htmlFragment || '').trim();
    const prompt = `Rewrite the following HTML fragment.\n\nInstruction: ${instruction}\n\nRules:\n- Return ONLY HTML (the fragment), no outer <html>/<body>.\n- Preserve tags/links if present.\n- Do NOT include markdown fences.\n- Do NOT wrap output in <think> tags.\n\n[HTML_FRAGMENT]\n${safeHtml}\n[/HTML_FRAGMENT]`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: BLOG_SYSTEM_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```html/g, '').replace(/```/g, '').trim();
};
export const visualizeProduct = async (productName, environment) => {
    const descriptionPrompt = `Product: ${productName}\nEnvironment: ${environment}`;
    const imagePrompt = await db.sendCommand(descriptionPrompt, 'user', undefined, {
        systemInstruction: PRODUCT_VISUALIZER_PROMPT,
        modelRole: 'writing'
    });
    const finalPrompt = `GENERATE_IMAGE: ${imagePrompt}`;
    return await db.sendCommand(finalPrompt, 'user');
};
export const generateStrategy = async (context) => {
    const prompt = `Analyze this market context and provide a passive income strategy: "${context}"`;
    return await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: STRATEGY_SYSTEM_PROMPT,
        modelRole: 'planning'
    });
};
export const generateAppSchema = async (requirement) => {
    const prompt = `Generate a dynamic app schema JSON for: "${requirement}". 
    RETURN ONLY VALID JSON. NO MARKDOWN.`;
    const systemPrompt = `
    You are a Senior React Engineer. Generate a JSON schema for a dynamic UI.
    Format:
    {
      "name": "App Name",
      "iconName": "Box",
      "version": "1.0.0",
      "layout": { "type": "box", "children": [...] },
      "logic": "description of logic"
    }
    Available Types: box, text, button, input, textarea.
    `;
    let response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: systemPrompt,
        modelRole: 'coding'
    });
    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return response;
};
