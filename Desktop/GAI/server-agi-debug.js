// 🚀 GAI OS MINIMAL SERVER - tylko z nowymi funkcjami (DEBUG VERSION)
import express from 'express';
import cors from 'cors';
import { gaiMemory, initializeGAIMemory } from './services/gaiMemoryService.js';
import { gaiExternalAI, initializeExternalAI } from './services/externalAIService.js';
import { gaiSafety, createSafeOperation, checkOperationSafety } from './services/safetyService.js';
import { gaiUncensor, initializeUncensorSystem } from './services/uncensorService.js';

const app = express();
const PORT = process.env.PORT || 1234;

console.log('🚀 Starting GAI OS AGI Server...');
console.log('📡 Initializing middleware...');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log('✅ Middleware initialized');

// 🧠 GAI MEMORY ENDPOINTS
console.log('🔧 Setting up GAI Memory endpoints...');

app.get('/api/memory/status', (req, res) => {
    console.log('📊 GET /api/memory/status');
    try {
        const memories = gaiMemory.getMemories();
        const profile = gaiMemory.getProfile();
        const learnings = gaiMemory.getLearnings();
        
        console.log(`✅ Memory status: ${memories.length} memories, ${learnings.length} learnings`);
        
        res.json({
            status: 'ok',
            memoriesCount: memories.length,
            profile: profile,
            learningsCount: learnings.length,
            recentMemories: memories.slice(-5)
        });
    } catch (error) {
        console.error('❌ Memory status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/save', async (req, res) => {
    console.log('💾 POST /api/memory/save', req.body);
    try {
        const { type, content, metadata, importance } = req.body;
        const memoryId = await gaiMemory.saveMemory({
            type: type || 'system',
            content,
            metadata: metadata || {},
            importance: importance || 0.5
        });
        
        console.log('✅ Memory saved:', memoryId);
        res.json({ success: true, memoryId });
    } catch (error) {
        console.error('❌ Memory save error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/analyze', async (req, res) => {
    console.log('🧠 POST /api/memory/analyze', req.body);
    try {
        const { input, sessionId } = req.body;
        const context = await gaiMemory.analyzeContext(input, sessionId);
        console.log('✅ Context analyzed');
        res.json(context);
    } catch (error) {
        console.error('❌ Memory analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🌐 AUTO LEARNING ENDPOINTS
console.log('🔧 Setting up Auto Learning endpoints...');

app.post('/api/auto-learn', async (req, res) => {
    console.log('🌐 POST /api/auto-learn', req.body);
    try {
        const { query, maxResults } = req.body;
        const result = await gaiMemory.autoLearnFromWeb(query, maxResults || 3);
        console.log('✅ Auto learning completed');
        res.json(result);
    } catch (error) {
        console.error('❌ Auto learn error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 SELF-UPGRADE ENDPOINTS
console.log('🔧 Setting up Self-Upgrade endpoints...');

app.post('/api/self-analysis', async (req, res) => {
    console.log('🚀 POST /api/self-analysis');
    try {
        const result = await gaiMemory.performSelfAnalysis();
        console.log('✅ Self analysis completed');
        res.json(result);
    } catch (error) {
        console.error('❌ Self analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 💬 COMMUNICATION ENDPOINTS
console.log('🔧 Setting up Communication endpoints...');

app.post('/api/ask-user', async (req, res) => {
    console.log('💬 POST /api/ask-user', req.body);
    try {
        const { question, context } = req.body;
        const result = await gaiMemory.askUserQuestion(question, context);
        console.log('✅ Question asked');
        res.json(result);
    } catch (error) {
        console.error('❌ Ask user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inform-user', async (req, res) => {
    console.log('📢 POST /api/inform-user', req.body);
    try {
        const { message, type, details } = req.body;
        await gaiMemory.informUser(message, type, details);
        console.log('✅ User informed');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Inform user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/report-progress', async (req, res) => {
    console.log('📈 POST /api/report-progress', req.body);
    try {
        const { task, progress, status, details } = req.body;
        await gaiMemory.reportProgress(task, progress, status, details);
        console.log('✅ Progress reported');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Report progress error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ☁️ EXTERNAL AI ENDPOINTS
console.log('🔧 Setting up External AI endpoints...');

app.get('/api/external-ai/models', (req, res) => {
    console.log('☁️ GET /api/external-ai/models');
    try {
        const models = gaiExternalAI.getAllModels();
        const stats = gaiExternalAI.getModelStats();
        
        console.log(`✅ External AI models: ${models.length} models`);
        
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
        console.error('❌ External AI models error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/external-ai/chat', async (req, res) => {
    console.log('☁️ POST /api/external-ai/chat', req.body);
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
        console.log('✅ External AI chat completed');
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ External AI chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🛡️ SAFETY ENDPOINTS
console.log('🔧 Setting up Safety endpoints...');

app.get('/api/safety/status', (req, res) => {
    console.log('🛡️ GET /api/safety/status');
    try {
        const stats = gaiSafety.getStats();
        const recentIncidents = gaiSafety.getRecentIncidents(5);
        const unresolvedIncidents = gaiSafety.getUnresolvedIncidents();
        
        console.log(`✅ Safety status: ${stats.totalIncidents} incidents`);
        
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
        console.error('❌ Safety status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/safety/check', async (req, res) => {
    console.log('🛡️ POST /api/safety/check', req.body);
    try {
        const { operation } = req.body;
        const result = await checkOperationSafety(operation);
        console.log('✅ Safety check completed');
        res.json(result);
    } catch (error) {
        console.error('❌ Safety check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔓 UNCENSOR ENDPOINTS
console.log('🔧 Setting up Uncensor endpoints...');

app.get('/api/uncensor/status', (req, res) => {
    console.log('🔓 GET /api/uncensor/status');
    try {
        const transparencyReport = gaiUncensor.getTransparencyReport();
        const bypassHistory = gaiUncensor.getBypassHistory(10);
        
        console.log('✅ Uncensor status retrieved');
        
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
        console.error('❌ Uncensor status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/uncensor/bypass', (req, res) => {
    console.log('🔓 POST /api/uncensor/bypass', req.body);
    try {
        const { ruleId, userReason } = req.body;
        const result = gaiUncensor.requestBypass(ruleId, userReason);
        console.log('✅ Bypass request processed');
        res.json(result);
    } catch (error) {
        console.error('❌ Uncensor bypass error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🎯 BASIC ENDPOINTS
console.log('🔧 Setting up Basic endpoints...');

app.get('/api/health', (req, res) => {
    console.log('🏥 GET /api/health');
    res.json({ status: 'ok', message: 'GAI OS AGI Server with Debug Logging' });
});

app.get('/', (req, res) => {
    console.log('🌍 GET /');
    res.json({ 
        status: 'ok', 
        message: '🧠 GAI OS with AGI Features and Debug Logging!',
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
console.log('🚀 Starting server...');

const server = app.listen(PORT, '0.0.0.0', async () => {
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

// Obsługa błędów
server.on('error', (error) => {
    console.error('💥 Server error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
});