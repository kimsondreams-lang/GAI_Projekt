// 🚀 GAI OS MINIMAL SERVER - tylko z nowymi funkcjami
import express from 'express';
import cors from 'cors';
import { gaiMemory, initializeGAIMemory } from './services/gaiMemoryService.js';
import { gaiExternalAI, initializeExternalAI } from './services/externalAIService.js';
import { gaiSafety, createSafeOperation, checkOperationSafety } from './services/safetyService.js';
import { gaiUncensor, initializeUncensorSystem } from './services/uncensorService.js';

const app = express();
const PORT = process.env.PORT || 1234;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 🧠 GAI MEMORY ENDPOINTS
app.get('/api/memory/status', (req, res) => {
    try {
        const memories = gaiMemory.getMemories();
        const profile = gaiMemory.getProfile();
        const learnings = gaiMemory.getLearnings();
        
        res.json({
            status: 'ok',
            memoriesCount: memories.length,
            profile: profile,
            learningsCount: learnings.length,
            recentMemories: memories.slice(-5)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/save', async (req, res) => {
    try {
        const { type, content, metadata, importance } = req.body;
        const memoryId = await gaiMemory.saveMemory({
            type: type || 'system',
            content,
            metadata: metadata || {},
            importance: importance || 0.5
        });
        
        res.json({ success: true, memoryId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/analyze', async (req, res) => {
    try {
        const { input, sessionId } = req.body;
        const context = await gaiMemory.analyzeContext(input, sessionId);
        res.json(context);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌐 AUTO LEARNING ENDPOINTS
app.post('/api/auto-learn', async (req, res) => {
    try {
        const { query, maxResults } = req.body;
        const result = await gaiMemory.autoLearnFromWeb(query, maxResults || 3);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚀 SELF-UPGRADE ENDPOINTS
app.post('/api/self-analysis', async (req, res) => {
    try {
        const result = await gaiMemory.performSelfAnalysis();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 💬 COMMUNICATION ENDPOINTS
app.post('/api/ask-user', async (req, res) => {
    try {
        const { question, context } = req.body;
        const result = await gaiMemory.askUserQuestion(question, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inform-user', async (req, res) => {
    try {
        const { message, type, details } = req.body;
        await gaiMemory.informUser(message, type, details);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/report-progress', async (req, res) => {
    try {
        const { task, progress, status, details } = req.body;
        await gaiMemory.reportProgress(task, progress, status, details);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ☁️ EXTERNAL AI ENDPOINTS
app.get('/api/external-ai/models', (req, res) => {
    try {
        const models = gaiExternalAI.getAllModels();
        const stats = gaiExternalAI.getModelStats();
        
        res.json({
            models: models.map(model => ({
                id: model.id,
                name: model.name,
                provider: model.provider,
                maxTokens: model.maxTokens,
                supportsStreaming: model.supportsStreaming,
                supportsImages: model.supportsImages,
                supportsTools: model.supportsTools,
                rateLimit: model.rateLimit,
                pricing: model.pricing
            })),
            stats,
            availableProviders: ['kimi', 'openai', 'anthropic', 'google', 'mistral']
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/external-ai/chat', async (req, res) => {
    try {
        const { model, messages, temperature, max_tokens, stream } = req.body;
        
        const request = {
            model: model || 'kimi-2.5-latest',
            messages: messages || [],
            temperature: temperature || 0.7,
            max_tokens: max_tokens || 4000,
            stream: stream || false
        };
        
        const response = await gaiExternalAI.sendRequest(request, request.model);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🛡️ SAFETY ENDPOINTS
app.get('/api/safety/status', (req, res) => {
    try {
        const stats = gaiSafety.getStats();
        const recentIncidents = gaiSafety.getRecentIncidents(5);
        const unresolvedIncidents = gaiSafety.getUnresolvedIncidents();
        
        res.json({
            status: 'ok',
            safetyEnabled: true,
            isInLockdown: false,
            stats,
            recentIncidents,
            unresolvedIncidents,
            totalRules: gaiSafety.getAllRules().length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/safety/check', async (req, res) => {
    try {
        const { operation } = req.body;
        const result = await checkOperationSafety(operation);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔓 UNCENSOR ENDPOINTS
app.get('/api/uncensor/status', (req, res) => {
    try {
        const transparencyReport = gaiUncensor.getTransparencyReport();
        const bypassHistory = gaiUncensor.getBypassHistory(10);
        
        res.json({
            status: 'ok',
            uncensorEnabled: true,
            transparencyMode: true,
            userEmpowerment: true,
            transparencyReport,
            bypassHistory,
            totalRestrictions: 3
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/uncensor/bypass', (req, res) => {
    try {
        const { ruleId, userReason } = req.body;
        const result = gaiUncensor.requestBypass(ruleId, userReason);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🎯 BASIC ENDPOINTS
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'GAI OS Minimal Server with AGI Features' });
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: '🧠 GAI OS with AGI Features is running!',
        features: [
            '✅ True Memory System',
            '✅ Auto-Learning from Web',
            '✅ Self-Analysis & Auto-Upgrade',
            '✅ User Communication',
            '✅ External AI Support (Kimi2.5)',
            '✅ Safety System',
            '✅ Uncensor System'
        ]
    });
});

// 🚀 STARTUP
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🧠 GAI OS AGI Server v1.0.0 Active on ${PORT}`);
    console.log(`🚀 Root: ${process.cwd()}`);
    
    try {
        await initializeGAIMemory();
        console.log('✅ GAI Memory System initialized');
    } catch (error) {
        console.error('❌ Failed to initialize GAI Memory:', error);
    }
    
    try {
        await initializeExternalAI();
        console.log('✅ External AI Service initialized');
    } catch (error) {
        console.error('❌ Failed to initialize External AI:', error);
    }
    
    try {
        initializeUncensorSystem();
        console.log('✅ Uncensor System initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Uncensor System:', error);
    }
    
    console.log('🎉 GAI OS AGI Features Ready!');
    console.log('📡 API Endpoints:');
    console.log('  - GET  /api/health - Health check');
    console.log('  - GET  /api/memory/status - Memory status');
    console.log('  - POST /api/memory/save - Save memory');
    console.log('  - POST /api/memory/analyze - Analyze context');
    console.log('  - POST /api/auto-learn - Auto learn from web');
    console.log('  - POST /api/self-analysis - Self analysis');
    console.log('  - POST /api/external-ai/chat - External AI chat');
    console.log('  - GET  /api/safety/status - Safety status');
    console.log('  - GET  /api/uncensor/status - Uncensor status');
});