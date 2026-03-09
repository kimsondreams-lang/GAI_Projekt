import { db } from './memoryService';
import { generateBlogPost, rewriteArticleText, visualizeProduct, generateStrategy, generateAppSchema } from './aiService';
export const generateChatResponseStream = async function* (history, userMessage, attachments, signal) {
    if (signal?.aborted)
        throw new Error('Aborted');
    const reply = await db.sendCommand(userMessage, 'user', undefined, { modelRole: 'chat' });
    yield reply;
};
export const generateChatResponse = async (history, userMessage, attachments) => {
    return await db.sendCommand(userMessage, 'user', undefined, { modelRole: 'chat' });
};
export { generateBlogPost, rewriteArticleText, visualizeProduct, generateStrategy, generateAppSchema };
