import { db } from './memoryService';
import {
  generateBlogPost,
  rewriteArticleText,
  visualizeProduct,
  generateStrategy,
  generateAppSchema
} from './aiService';

export const generateChatResponseStream = async function* (
  history: any[],
  userMessage: string,
  attachments?: { mimeType: string; data: string },
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (signal?.aborted) throw new Error('Aborted');
  const reply = await db.sendCommand(userMessage, 'user', undefined, { modelRole: 'chat' });
  yield reply;
};

export const generateChatResponse = async (
  history: any[],
  userMessage: string,
  attachments?: { mimeType: string; data: string }
): Promise<string> => {
  return await db.sendCommand(userMessage, 'user', undefined, { modelRole: 'chat' });
};

export { generateBlogPost, rewriteArticleText, visualizeProduct, generateStrategy, generateAppSchema };
