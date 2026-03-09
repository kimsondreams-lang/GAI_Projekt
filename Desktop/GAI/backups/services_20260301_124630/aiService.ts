
import { db } from "./memoryService";
import { BLOG_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT, EDITOR_REWRITE_PROMPT, PRODUCT_VISUALIZER_PROMPT } from "../constants";

export const generateChatResponse = async (
  history: any[],
  userMessage: string,
  attachments?: string[]
): Promise<string> => {
    return await db.sendCommand(userMessage, 'user', attachments, { modelRole: 'chat' });
};

export const generateBlogPost = async (topic: string, instructions?: string, amazonTag?: string): Promise<string> => {
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

export const rewriteArticleText = async (selection: string, instruction: string): Promise<string> => {
    const prompt = `Original Text:\n"${selection}"\n\nInstruction: ${instruction}`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: EDITOR_REWRITE_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```/g, '').trim();
};

export const rewriteFullArticleHtml = async (html: string, instruction?: string): Promise<string> => {
    const safeHtml = String(html || '').trim();
    const prompt = `Rewrite the following HTML article.\n\nInstruction: ${instruction || 'Improve clarity, flow, and professionalism while preserving meaning.'}\n\nRules:\n- Return ONLY HTML body content.\n- Keep the existing structure and headings.\n- Do NOT include markdown fences.\n- Do NOT wrap output in <think> tags.\n\n[HTML]\n${safeHtml}\n[/HTML]`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: BLOG_SYSTEM_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```html/g, '').replace(/```/g, '').trim();
};

export const rewriteHtmlFragment = async (htmlFragment: string, instruction: string): Promise<string> => {
    const safeHtml = String(htmlFragment || '').trim();
    const prompt = `Rewrite the following HTML fragment.\n\nInstruction: ${instruction}\n\nRules:\n- Return ONLY HTML (the fragment), no outer <html>/<body>.\n- Preserve tags/links if present.\n- Do NOT include markdown fences.\n- Do NOT wrap output in <think> tags.\n\n[HTML_FRAGMENT]\n${safeHtml}\n[/HTML_FRAGMENT]`;
    const response = await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: BLOG_SYSTEM_PROMPT,
        modelRole: 'writing'
    });
    return response.replace(/```html/g, '').replace(/```/g, '').trim();
};

export const visualizeProduct = async (productName: string, environment: string): Promise<string> => {
    const r = await fetch('/api/visualize-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, environment })
    });
    const data = await r.json().catch(() => ({} as any));
    if (!r.ok) {
        throw new Error(data?.error || `Visualize product failed: HTTP_${r.status}`);
    }
    const url = String(data?.imageUrl || '').trim();
    if (!url) throw new Error('Visualize product failed: missing imageUrl');
    return url;
};

export const generateStrategy = async (context: string): Promise<string> => {
    const prompt = `Analyze this market context and provide a passive income strategy: "${context}"`;
    return await db.sendCommand(prompt, 'user', undefined, {
        systemInstruction: STRATEGY_SYSTEM_PROMPT,
        modelRole: 'planning'
    });
};

export const generateAppSchema = async (requirement: string): Promise<string> => {
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
}
