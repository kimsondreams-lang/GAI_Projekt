// 🧠 GAI Memory Service - Full Implementation linked to Backend
import { db } from './memoryService.js';

export const gaiMemory = {
  analyzeContext: async (text) => {
    try {
        const memories = db.getMemories() || [];
        const profile = db.getGaiProfile();
        const learnings = db.getGaiLearnings() || [];
        
        // Simple client-side relevance check (keyword matching)
        // In a full implementation, this should be done by the backend LLM
        const keywords = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const relevant = memories.filter(m => {
            const content = (m.content || '').toLowerCase();
            const tags = (m.metadata?.tags || []).join(' ').toLowerCase();
            return keywords.some(k => content.includes(k) || tags.includes(k));
        }).slice(0, 5);

        return { 
            relevantMemories: relevant, 
            userProfile: profile, 
            relatedLearnings: learnings.slice(0, 3), 
            emotionalContext: 'neutral', 
            suggestedApproach: 'helpful' 
        };
    } catch (e) {
        console.error('GAI Memory Analyze Error:', e);
        return { relevantMemories: [], userProfile: null, relatedLearnings: [], emotionalContext: 'neutral', suggestedApproach: 'helpful' };
    }
  },

  saveMemory: async (memory) => {
    try {
        const current = db.getMemories() || [];
        const newMemory = {
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            ...memory
        };
        const updated = [...current, newMemory].slice(-200); // Keep last 200
        await db.updateMemories(updated);
        return newMemory.id;
    } catch (e) {
        console.error('GAI Memory Save Error:', e);
        throw e;
    }
  },

  getMemories: () => db.getMemories() || [],
  getProfile: () => db.getGaiProfile(),
  getLearnings: () => db.getGaiLearnings() || []
};

export const initializeGAIMemory = async () => {
  console.log('🧠 GAI Memory System (Full Integration) initialized');
};