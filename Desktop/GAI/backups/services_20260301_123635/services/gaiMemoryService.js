/**
 * 🧠 GAI MEMORY SERVICE - Prawdziwa pamięć jak ChatGPT-5.2
 *
 * To jest SERCE systemu - prawdziwa pamięć kontekstowa która:
 * - Pamięta WSZYSTKIE rozmowy z Tobą
 * - Uczy się z każdej interakcji
 * - Rozwija się samodzielnie
 * - Ma kontekst długoterminowy
 * - Potrafi się przypomnieć o ważnych rzeczach
 */
import { db } from './memoryService';
class GAIMemoryService {
    constructor() {
        this.memories = [];
        this.profile = null;
        this.learnings = [];
        this.isInitialized = false;
        this.contextWindow = 16000; // tokens, jak GPT-4
        this.maxMemories = 10000; // max w pamięci
        // 🚀 SAMOROZWÓJ I AUTO-UPGRADE
        this.upgradeSuggestions = [];
        this.lastSelfAnalysis = 0;
        this.selfAnalysisInterval = 24 * 60 * 60 * 1000; // 24h
        this.version = '1.0.0';
        this.upgradeHistory = [];
    }
    // 🔮 INTELIGENTNA ANALIZA KONTEXTU
    async analyzeContext(input, currentSession) {
        await this.ensureInitialized();
        const relevantMemories = await this.findRelevantMemories(input, currentSession);
        const relatedLearnings = this.findRelevantLearnings(input);
        const emotionalContext = this.analyzeEmotionalTone(input);
        const suggestedApproach = this.determineApproach(input, relevantMemories);
        return {
            relevantMemories,
            userProfile: this.profile,
            relatedLearnings,
            emotionalContext,
            suggestedApproach
        };
    }
    // 💾 ZAPISYWANIE DO PAMIĘCI
    async saveMemory(params) {
        await this.ensureInitialized();
        const memory = {
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: params.type,
            content: params.content,
            metadata: {
                timestamp: Date.now(),
                userId: this.profile?.userName || 'unknown',
                sessionId: db.getSessionId?.() || undefined,
                importance: params.importance || 0.5,
                tags: params.metadata?.tags || [],
                context: params.metadata?.context,
                emotionalTone: params.metadata?.emotionalTone || 'neutral',
                relatedMemories: params.metadata?.relatedMemories || []
            },
            accessStats: {
                accessCount: 0,
                lastAccessed: Date.now(),
                firstCreated: Date.now(),
                relevanceScore: 1.0
            }
        };
        this.memories.push(memory);
        await this.persistMemory(memory);
        // 🔍 AKTUALIZUJ PROFIL NA PODSTAWIE NOWEJ INFORMACJI
        if (params.type === 'user_preference' || params.type === 'conversation') {
            await this.updateProfileFromMemory(memory);
        }
        return memory.id;
    }
    // 📖 UCZENIE SIĘ Z NOWYCH ŹRÓDEŁ
    async learnFromSource(source, content, topic) {
        await this.ensureInitialized();
        try {
            // 🧠 ANALIZA TREŚCI I WYCIĄGANIE WNIOSKÓW
            const analysis = await this.analyzeContentForLearning(content, topic);
            const learning = {
                id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                topic,
                source,
                content: analysis.processedContent,
                learnedAt: Date.now(),
                confidence: analysis.confidence,
                verified: false,
                relatedTopics: analysis.relatedTopics,
                usageCount: 0,
                lastUsed: 0
            };
            this.learnings.push(learning);
            await this.persistLearning(learning);
            // 📝 ZAPISZ JAKO PAMIĘĆ SYSTEMOWĄ
            await this.saveMemory({
                type: 'learning',
                content: `Learned about ${topic}: ${analysis.summary}`,
                importance: analysis.confidence,
                metadata: {
                    tags: ['learning', topic, ...analysis.relatedTopics],
                    context: `Learned from: ${source}`
                }
            });
            return {
                success: true,
                learningId: learning.id,
                confidence: analysis.confidence,
                summary: analysis.summary
            };
        }
        catch (error) {
            console.error('Learning failed:', error);
            return { success: false, confidence: 0, summary: 'Learning failed' };
        }
    }
    // 🌐 AUTOUCZENIE SIĘ Z INTERNETU
    async autoLearnFromWeb(query, maxResults = 3) {
        await this.ensureInitialized();
        try {
            // 🔍 WYSZUKAJ W INTERNECIE
            console.log(`🌐 Auto-learning from web: "${query}"`);
            // Użyj istniejącej funkcji web search z server.js
            const searchResults = await this.performWebSearch(query, maxResults);
            const learnings = [];
            const sources = [];
            for (const result of searchResults) {
                try {
                    // 📖 NAUCZ SIĘ Z KAŻDEGO ŹRÓDŁA
                    const learningResult = await this.learnFromSource(result.url, result.content || result.snippet || '', query);
                    if (learningResult.success && learningResult.learningId) {
                        sources.push(result.url);
                        // Znajdź learning po ID
                        const learning = this.learnings.find(l => l.id === learningResult.learningId);
                        if (learning) {
                            learnings.push(learning);
                        }
                    }
                }
                catch (error) {
                    console.error(`Failed to learn from ${result.url}:`, error);
                }
            }
            const summary = `Learned ${learnings.length} new things about "${query}" from ${sources.length} sources`;
            // 💾 ZAPISZ JAKO PAMIĘĆ SYSTEMOWĄ
            await this.saveMemory({
                type: 'learning',
                content: summary,
                importance: 0.8,
                metadata: {
                    tags: ['auto_learning', 'web_search', ...query.toLowerCase().split(' ')],
                    context: `Auto-learned from web search: ${query}`,
                    relatedMemories: learnings.map(l => l.id)
                }
            });
            return {
                success: true,
                learnings,
                sources,
                summary
            };
        }
        catch (error) {
            console.error('Auto-learning failed:', error);
            return {
                success: false,
                learnings: [],
                sources: [],
                summary: 'Auto-learning failed'
            };
        }
    }
    // 🚀 SAMOROZWÓJ I AUTO-UPGRADE SYSTEMU
    async performSelfAnalysis() {
        await this.ensureInitialized();
        const now = Date.now();
        if (now - this.lastSelfAnalysis < this.selfAnalysisInterval) {
            return {
                suggestions: this.upgradeSuggestions,
                improvements: [],
                upgrades: [],
                report: 'Self-analysis performed recently. Skipping to prevent over-analysis.'
            };
        }
        this.lastSelfAnalysis = now;
        try {
            // 📊 ANALIZA WYDAJNOŚCI
            const performanceAnalysis = this.analyzePerformance();
            // 🔍 ANALIZA UŻYCIA I PATTERNS
            const usageAnalysis = this.analyzeUsagePatterns();
            // 💡 GENEROWANIE SUGESTII ULEPSZEŃ
            const suggestions = this.generateImprovementSuggestions(performanceAnalysis, usageAnalysis);
            // 🎯 PRIORYTYZACJA ULEPSZEŃ
            const prioritizedUpgrades = this.prioritizeUpgrades(suggestions);
            // 📝 RAPORT
            const report = this.generateSelfAnalysisReport(performanceAnalysis, usageAnalysis, suggestions);
            // 💾 ZAPISZ ANALIZĘ DO PAMIĘCI
            await this.saveMemory({
                type: 'system',
                content: `Self-analysis performed: ${report}`,
                importance: 0.9,
                metadata: {
                    tags: ['self_analysis', 'auto_upgrade', 'system_improvement'],
                    context: 'Automated self-analysis and upgrade suggestion generation'
                }
            });
            return {
                suggestions: this.upgradeSuggestions,
                improvements: suggestions,
                upgrades: prioritizedUpgrades,
                report
            };
        }
        catch (error) {
            console.error('Self-analysis failed:', error);
            return {
                suggestions: [],
                improvements: [],
                upgrades: [],
                report: `Self-analysis failed: ${error}`
            };
        }
    }
    // 💬 KOMUNIKACJA GAI Z UŻYTKOWNIKIEM
    async askUserQuestion(question, context) {
        await this.ensureInitialized();
        const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        // 💾 ZAPISZ PYTANIE DO PAMIĘCI
        await this.saveMemory({
            type: 'system',
            content: `Asked user: ${question}${context ? ` (Context: ${context})` : ''}`,
            importance: 0.7,
            metadata: {
                tags: ['user_question', 'communication', 'interaction'],
                context: context || 'General question to user',
                emotionalTone: 'neutral'
            }
        });
        // 🔔 POWIADOM UŻYTKOWNIKA (przez system notification)
        this.notifyUser(question, questionId, 'question');
        return {
            questionId,
            question,
            context,
            timestamp: Date.now(),
            urgency: this.determineQuestionUrgency(question, context),
            category: this.categorizeQuestion(question, context)
        };
    }
    async informUser(message, type = 'info', details) {
        await this.ensureInitialized();
        // 💾 ZAPISZ INFORMACJĘ DO PAMIĘCI
        await this.saveMemory({
            type: 'system',
            content: `Informed user [${type}]: ${message}${details ? ` Details: ${details}` : ''}`,
            importance: type === 'error' ? 0.9 : type === 'warning' ? 0.7 : 0.5,
            metadata: {
                tags: ['user_notification', type, 'communication'],
                context: details || 'System notification to user',
                emotionalTone: type === 'error' ? 'negative' : type === 'success' ? 'positive' : 'neutral'
            }
        });
        // 🔔 POWIADOM UŻYTKOWNIKA
        this.notifyUser(message, `info_${Date.now()}`, type, details);
    }
    async reportProgress(task, progress, status, details) {
        await this.ensureInitialized();
        const progressMessage = `Task "${task}": ${status} (${progress}%)${details ? ` - ${details}` : ''}`;
        // 💾 ZAPISZ POSTĘP DO PAMIĘCI
        await this.saveMemory({
            type: 'system',
            content: progressMessage,
            importance: status === 'failed' ? 0.9 : status === 'completed' ? 0.8 : 0.6,
            metadata: {
                tags: ['progress_report', 'task_update', status],
                context: `Progress update for task: ${task}`,
                emotionalTone: status === 'failed' ? 'negative' : status === 'completed' ? 'positive' : 'neutral'
            }
        });
        // 🔔 POWIADOM UŻYTKOWNIKA O POSTĘPIE
        this.notifyUser(progressMessage, `progress_${Date.now()}`, 'info', details);
    }
    // 🧠 PUBLICZNE GETTERY
    getMemories() {
        return [...this.memories];
    }
    getProfile() {
        return this.profile ? { ...this.profile } : null;
    }
    getLearnings() {
        return [...this.learnings];
    }
    // 🧹 CZYSZCZENIE I OPTYMALIZACJA
    async cleanup() {
        // Usuń stare, nieistotne wspomnienia
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 dni
        const oldMemories = this.memories.filter(m => m.metadata.importance < 0.3 &&
            m.accessStats.lastAccessed < cutoffTime &&
            m.accessStats.accessCount < 3);
        this.memories = this.memories.filter(m => !oldMemories.includes(m));
        // Zaktualizuj relevance score
        this.memories.forEach(memory => {
            const ageInDays = (Date.now() - memory.metadata.timestamp) / (1000 * 60 * 60 * 24);
            memory.accessStats.relevanceScore = Math.max(0, 1 - (ageInDays / 365)); // 1 rok = 0 relevance
        });
        // Zapisz do bazy
        await db.updateMemories?.(this.memories);
    }
    // 🔧 PRYWATNE METODY POMOCNICZE
    async ensureInitialized() {
        if (this.isInitialized)
            return;
        await this.loadMemoriesFromDB();
        await this.loadProfileFromDB();
        await this.loadLearningsFromDB();
        this.isInitialized = true;
    }
    async loadMemoriesFromDB() {
        try {
            const dbMemories = db.getMemories?.() || [];
            // Konwertuj proste MemoryEntry na GAIMemory
            this.memories = dbMemories.map((entry) => ({
                id: entry.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                type: entry.type || 'system',
                content: entry.content || '',
                metadata: {
                    timestamp: entry.timestamp || Date.now(),
                    userId: entry.userId || 'unknown',
                    sessionId: entry.sessionId,
                    importance: entry.importance || 0.5,
                    tags: entry.tags || [],
                    context: entry.context,
                    emotionalTone: entry.emotionalTone || 'neutral',
                    relatedMemories: entry.relatedMemories || []
                },
                accessStats: {
                    accessCount: entry.accessCount || 0,
                    lastAccessed: entry.lastAccessed || Date.now(),
                    firstCreated: entry.firstCreated || Date.now(),
                    relevanceScore: entry.relevanceScore || 1.0
                }
            }));
        }
        catch (error) {
            console.error('Failed to load memories:', error);
            this.memories = [];
        }
    }
    async loadProfileFromDB() {
        try {
            // Spróbuj załadować zapisany profil
            const savedProfile = localStorage.getItem('gai_profile');
            if (savedProfile) {
                this.profile = JSON.parse(savedProfile);
            }
            else {
                // Stwórz domyślny profil
                this.profile = {
                    userName: 'User',
                    userPreferences: {},
                    communicationStyle: 'technical',
                    expertiseLevel: 'advanced',
                    interests: ['technology', 'AI', 'programming'],
                    goals: ['build amazing things', 'learn continuously'],
                    painPoints: [],
                    successStories: [],
                    lastInteraction: Date.now(),
                    totalInteractions: 0,
                    trustLevel: 0.5
                };
            }
        }
        catch (error) {
            console.error('Failed to load profile:', error);
        }
    }
    async loadLearningsFromDB() {
        try {
            const savedLearnings = localStorage.getItem('gai_learnings');
            this.learnings = savedLearnings ? JSON.parse(savedLearnings) : [];
        }
        catch (error) {
            console.error('Failed to load learnings:', error);
            this.learnings = [];
        }
    }
    async persistMemory(memory) {
        try {
            // Zapisz do bazy danych
            const currentMemories = db.getMemories?.() || [];
            const updatedMemories = [...currentMemories, memory];
            await db.updateMemories?.(updatedMemories);
            // Zapisz do localStorage jako backup
            localStorage.setItem('gai_memories_backup', JSON.stringify(this.memories.slice(-1000))); // Ostatnie 1000
        }
        catch (error) {
            console.error('Failed to persist memory:', error);
        }
    }
    async persistLearning(learning) {
        try {
            localStorage.setItem('gai_learnings', JSON.stringify(this.learnings));
        }
        catch (error) {
            console.error('Failed to persist learning:', error);
        }
    }
    findRelevantLearnings(query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        const scored = this.learnings.map(learning => {
            let score = 0;
            const topicLower = learning.topic.toLowerCase();
            const contentLower = learning.content.toLowerCase();
            // 🔍 DOKŁADNE DOPASOWANIE
            queryWords.forEach(word => {
                if (topicLower.includes(word))
                    score += 2;
                if (contentLower.includes(word))
                    score += 1;
                if (learning.relatedTopics.some(topic => topic.toLowerCase().includes(word)))
                    score += 1.5;
            });
            // ⭐ WAŻNOŚĆ I ŚWIEŻOŚĆ
            const ageInDays = (Date.now() - learning.learnedAt) / (1000 * 60 * 60 * 24);
            const freshnessScore = Math.max(0, 1 - (ageInDays / 90)); // 90 dni = max świeżość
            score += learning.confidence * 3;
            score += freshnessScore;
            score += Math.min(1, learning.usageCount / 10); // Bonus za użycie
            return { learning, score };
        });
        return scored
            .filter(item => item.score > 1.0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.learning);
    }
    async findRelevantMemories(query, sessionId) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        const scored = this.memories.map(memory => {
            let score = 0;
            const contentLower = memory.content.toLowerCase();
            // 🔍 DOKŁADNE DOPASOWANIE
            queryWords.forEach(word => {
                if (contentLower.includes(word))
                    score += 1;
                if (memory.metadata.tags.some(tag => tag.toLowerCase().includes(word)))
                    score += 2;
            });
            // 💡 SEMANTYCZNE DOPASOWANIE (proste)
            if (this.isSemanticallyRelated(queryLower, contentLower)) {
                score += 0.5;
            }
            // ⭐ WAŻNOŚĆ I ŚWIEŻOŚĆ
            const ageInDays = (Date.now() - memory.metadata.timestamp) / (1000 * 60 * 60 * 24);
            const freshnessScore = Math.max(0, 1 - (ageInDays / 30)); // 30 dni = max świeżość
            score += memory.metadata.importance * 2;
            score += freshnessScore;
            // 🔗 SESYJNOŚĆ
            if (sessionId && memory.metadata.sessionId === sessionId) {
                score += 1;
            }
            return { memory, score };
        });
        return scored
            .filter(item => item.score > 0.5)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(item => item.memory);
    }
    analyzeEmotionalTone(text) {
        const positiveWords = ['amazing', 'great', 'awesome', 'perfect', 'love', 'excellent', 'fantastic'];
        const negativeWords = ['terrible', 'awful', 'bad', 'hate', 'frustrating', 'annoying', 'useless'];
        const excitedWords = ['excited', 'thrilled', 'cant wait', 'amazing', 'incredible'];
        const textLower = text.toLowerCase();
        let positive = 0, negative = 0, excited = 0;
        positiveWords.forEach(word => { if (textLower.includes(word))
            positive++; });
        negativeWords.forEach(word => { if (textLower.includes(word))
            negative++; });
        excitedWords.forEach(word => { if (textLower.includes(word))
            excited++; });
        if (excited > 0)
            return 'excited';
        if (positive > negative)
            return 'positive';
        if (negative > positive)
            return 'negative';
        return 'neutral';
    }
    determineApproach(input, relevantMemories) {
        if (input.includes('help') || input.includes('problem')) {
            return 'supportive_and_detailed';
        }
        if (input.includes('build') || input.includes('create')) {
            return 'creative_and_constructive';
        }
        if (input.includes('learn') || input.includes('teach')) {
            return 'educational_and_patient';
        }
        // Sprawdź poprzednie interakcje
        const recentMemories = relevantMemories.filter(m => Date.now() - m.metadata.timestamp < 24 * 60 * 60 * 1000 // 24h
        );
        if (recentMemories.some(m => m.metadata.emotionalTone === 'frustrated')) {
            return 'patient_and_supportive';
        }
        return 'adaptive_and_helpful';
    }
    isSemanticallyRelated(query, content) {
        // Prosta analiza semantyczna - można rozbudować o embeddings
        const queryWords = new Set(query.toLowerCase().split(/\s+/));
        const contentWords = new Set(content.toLowerCase().split(/\s+/));
        const intersection = new Set([...queryWords].filter(x => contentWords.has(x)));
        const union = new Set([...queryWords, ...contentWords]);
        return intersection.size > 0 && (intersection.size / union.size) > 0.1;
    }
    async analyzeContentForLearning(content, topic) {
        // Prosta analiza - można rozbudować o prawdziwe NLP
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const relevantSentences = sentences.filter(s => s.toLowerCase().includes(topic.toLowerCase()) ||
            this.isSemanticallyRelated(topic, s));
        const processedContent = relevantSentences.join('. ').trim();
        const confidence = Math.min(1.0, relevantSentences.length / Math.max(1, sentences.length));
        return {
            processedContent,
            confidence,
            summary: `Learned ${relevantSentences.length} relevant sentences about ${topic}`,
            relatedTopics: [topic, ...this.extractTopics(content)]
        };
    }
    extractTopics(content) {
        // Proste wyciąganie tematów - można ulepszyć
        const words = content.toLowerCase().split(/\s+/);
        const potentialTopics = words.filter(w => w.length > 4 && !['about', 'would', 'could', 'should'].includes(w));
        const topicCounts = potentialTopics.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([topic]) => topic);
    }
    async updateProfileFromMemory(memory) {
        if (!this.profile)
            return;
        // Aktualizuj na podstawie treści pamięci
        if (memory.type === 'user_preference') {
            // Wyciągnij preferencje z treści
            const preferences = this.extractPreferences(memory.content);
            Object.assign(this.profile.userPreferences, preferences);
        }
        if (memory.type === 'conversation') {
            this.profile.totalInteractions++;
            this.profile.lastInteraction = Date.now();
            // Aktualizuj trust level na podstawie długości i jakości interakcji
            if (memory.accessStats.accessCount > 5) {
                this.profile.trustLevel = Math.min(1.0, this.profile.trustLevel + 0.01);
            }
        }
        // Zapisz zaktualizowany profil
        localStorage.setItem('gai_profile', JSON.stringify(this.profile));
    }
    extractPreferences(content) {
        const preferences = {};
        // Proste wyciąganie preferencji
        if (content.includes('like') || content.includes('prefer')) {
            if (content.includes('technical'))
                preferences.communicationStyle = 'technical';
            if (content.includes('simple'))
                preferences.communicationStyle = 'casual';
            if (content.includes('formal'))
                preferences.communicationStyle = 'formal';
        }
        return preferences;
    }
    // 🔍 PRYWATNA FUNKCJA WEB SEARCH
    async performWebSearch(query, maxResults) {
        try {
            // Użyj istniejącego endpointu w GAIOS
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, maxResults })
            });
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            const data = await response.json();
            return data.results || [];
        }
        catch (error) {
            console.error('Web search failed:', error);
            // Fallback - zwróć pustą tablicę
            return [];
        }
    }
    // 🔧 METODY SAMOROZWOJU
    analyzePerformance() {
        const totalRequests = this.memories.filter(m => m.type === 'conversation').length;
        const successfulRequests = this.memories.filter(m => m.type === 'conversation' && m.metadata.emotionalTone !== 'negative').length;
        return {
            memoryUsage: this.memories.length,
            responseTime: this.memories.length > 0 ?
                this.memories.reduce((sum, m) => sum + m.accessStats.lastAccessed, 0) / this.memories.length : 0,
            successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
            bottlenecks: this.identifyBottlenecks()
        };
    }
    analyzeUsagePatterns() {
        const conversationMemories = this.memories.filter(m => m.type === 'conversation');
        const userMemories = this.memories.filter(m => m.type === 'user_preference');
        return {
            mostUsedFeatures: this.extractMostUsedFeatures(),
            userPreferences: this.profile?.userPreferences || {},
            interactionPatterns: this.extractInteractionPatterns(conversationMemories),
            improvementAreas: this.identifyImprovementAreas(conversationMemories, userMemories)
        };
    }
    identifyBottlenecks() {
        const bottlenecks = [];
        if (this.memories.length > 8000) {
            bottlenecks.push('High memory usage');
        }
        const recentFailures = this.memories.filter(m => m.type === 'error' &&
            Date.now() - m.metadata.timestamp < 24 * 60 * 60 * 1000);
        if (recentFailures.length > 10) {
            bottlenecks.push('High error rate in last 24h');
        }
        return bottlenecks;
    }
    extractMostUsedFeatures() {
        const featureCounts = {};
        this.memories.forEach(memory => {
            if (memory.metadata.tags) {
                memory.metadata.tags.forEach(tag => {
                    featureCounts[tag] = (featureCounts[tag] || 0) + 1;
                });
            }
        });
        return Object.entries(featureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([feature]) => feature);
    }
    extractInteractionPatterns(conversationMemories) {
        const patterns = [];
        const negativeInteractions = conversationMemories.filter(m => m.metadata.emotionalTone === 'negative' || m.metadata.emotionalTone === 'frustrated');
        if (negativeInteractions.length > conversationMemories.length * 0.3) {
            patterns.push('high_frustration_rate');
        }
        const codingInteractions = conversationMemories.filter(m => m.content.toLowerCase().includes('code') ||
            m.content.toLowerCase().includes('programming') ||
            m.metadata.tags?.includes('coding'));
        if (codingInteractions.length > conversationMemories.length * 0.5) {
            patterns.push('coding_focused');
        }
        return patterns;
    }
    identifyImprovementAreas(conversationMemories, userMemories) {
        const areas = [];
        if (conversationMemories.length === 0) {
            areas.push('increase_user_engagement');
        }
        if (userMemories.length < 5) {
            areas.push('better_user_preference_learning');
        }
        const recentInteractions = conversationMemories.filter(m => Date.now() - m.metadata.timestamp < 7 * 24 * 60 * 60 * 1000);
        if (recentInteractions.length < 10) {
            areas.push('improve_user_retention');
        }
        return areas;
    }
    generateImprovementSuggestions(performance, usage) {
        const suggestions = [];
        // Sugestie na podstawie wydajności
        if (performance.successRate < 0.8) {
            suggestions.push('Improve response quality and accuracy');
        }
        if (performance.memoryUsage > 5000) {
            suggestions.push('Implement memory optimization and cleanup');
        }
        // Sugestie na podstawie użycia
        if (usage.mostUsedFeatures.includes('coding')) {
            suggestions.push('Enhance code analysis and generation capabilities');
        }
        if (usage.interactionPatterns.includes('frustrated')) {
            suggestions.push('Improve user experience and reduce friction');
        }
        this.upgradeSuggestions = suggestions;
        return suggestions;
    }
    prioritizeUpgrades(suggestions) {
        return suggestions.map(suggestion => ({
            type: this.categorizeUpgradeType(suggestion),
            description: suggestion,
            priority: this.assessPriority(suggestion),
            estimatedEffort: this.estimateEffort(suggestion)
        }));
    }
    generateSelfAnalysisReport(performance, usage, suggestions) {
        return `Self-Analysis Report (${new Date().toISOString()}):
    
Performance Metrics:
- Memory Usage: ${performance.memoryUsage} memories
- Success Rate: ${(performance.successRate * 100).toFixed(1)}%
- Bottlenecks: ${performance.bottlenecks.join(', ') || 'none'}

Usage Patterns:
- Most Used Features: ${usage.mostUsedFeatures.join(', ')}
- Interaction Patterns: ${usage.interactionPatterns.join(', ')}
- Improvement Areas: ${usage.improvementAreas.join(', ')}

Generated Suggestions: ${suggestions.length}
${suggestions.map(s => `- ${s}`).join('\n')}`;
    }
    categorizeUpgradeType(suggestion) {
        if (suggestion.includes('fix') || suggestion.includes('bug'))
            return 'bugfix';
        if (suggestion.includes('performance') || suggestion.includes('speed'))
            return 'performance';
        if (suggestion.includes('ui') || suggestion.includes('interface') || suggestion.includes('experience'))
            return 'ui';
        return 'feature';
    }
    assessPriority(suggestion) {
        if (suggestion.includes('critical') || suggestion.includes('security') || suggestion.includes('data loss'))
            return 'high';
        if (suggestion.includes('improve') || suggestion.includes('enhance'))
            return 'medium';
        return 'low';
    }
    estimateEffort(suggestion) {
        // Prosta estymacja w godzinach
        if (suggestion.includes('simple') || suggestion.includes('minor'))
            return 1;
        if (suggestion.includes('complex') || suggestion.includes('major'))
            return 8;
        return 4; // średni wysiłek
    }
    // 💬 METODY KOMUNIKACJI
    notifyUser(message, notificationId, type, details) {
        // Użyj systemu powiadomień GAIOS
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('gai:notification', {
                detail: {
                    id: notificationId,
                    message,
                    type,
                    details,
                    timestamp: Date.now()
                }
            }));
        }
        // Log do konsoli dla development
        console.log(`[GAI Notification ${type.toUpperCase()}] ${message}${details ? ` - ${details}` : ''}`);
    }
    determineQuestionUrgency(question, context) {
        const urgentKeywords = ['urgent', 'important', 'critical', 'asap', 'emergency', 'blocking'];
        const combinedText = `${question} ${context || ''}`.toLowerCase();
        if (urgentKeywords.some(keyword => combinedText.includes(keyword))) {
            return 'high';
        }
        if (question.length > 100 || (context && context.length > 200)) {
            return 'medium';
        }
        return 'low';
    }
    categorizeQuestion(question, context) {
        const questionLower = question.toLowerCase();
        if (questionLower.includes('?') && (questionLower.includes('what') || questionLower.includes('how') || questionLower.includes('why'))) {
            return 'clarification';
        }
        if (questionLower.includes('permission') || questionLower.includes('allow') || questionLower.includes('authorize')) {
            return 'permission';
        }
        if (questionLower.includes('think') || questionLower.includes('opinion') || questionLower.includes('feedback')) {
            return 'feedback';
        }
        return 'suggestion';
    }
    determinePermissionUrgency(request, reason) {
        const urgentRequests = ['delete', 'remove', 'overwrite', 'modify', 'system', 'critical'];
        const combinedText = `${request} ${reason}`.toLowerCase();
        if (urgentRequests.some(keyword => combinedText.includes(keyword))) {
            return 'high';
        }
        return 'medium';
    }
}
// 🌍 GLOBALNA INSTANCJA - SERCE GAI
export const gaiMemory = new GAIMemoryService();
// 🔄 INTEGRACJA Z ISTNIEJĄCYM SYSTEMEM
export const initializeGAIMemory = async () => {
    await gaiMemory.saveMemory({
        type: 'system',
        content: 'GAI Memory System initialized. Ready for intelligent interactions.',
        importance: 1.0,
        metadata: {
            tags: ['initialization', 'system', 'memory'],
            context: 'System startup'
        }
    });
    console.log('🧠 GAI Memory System initialized with true contextual memory');
};
