// 🚀 GAI OS AGI SERVER Z KOMPLETNYM FRONTENDEM - FINAL VERSION
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { gaiMemory, initializeGAIMemory } from './services/gaiMemoryService.js';
import { gaiExternalAI, initializeExternalAI } from './services/externalAIService.js';
import { gaiSafety, createSafeOperation, checkOperationSafety } from './services/safetyService.js';
import { gaiUncensor, initializeUncensorSystem } from './services/uncensorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 1234;

console.log('🚀 Starting GAI OS AGI Server with Complete Frontend...');
console.log('📡 Initializing middleware...');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 🎯 SERWUJ FRONTEND
const frontendPath = path.join(__dirname, 'dist');
console.log('📁 Frontend path:', frontendPath);

// Sprawdź czy dist istnieje
import { existsSync } from 'fs';
if (existsSync(frontendPath)) {
    console.log('✅ Frontend dist found, serving static files');
    app.use(express.static(frontendPath));
} else {
    console.log('⚠️ Frontend dist not found, API only mode');
}

// 🗃️ MOCK DATABASE (dla frontendu)
const SYSTEM_DB = {
    version: '5.0.1',
    settings: {
        theme: 'neu',
        taskbarOpacity: 0.8,
        aiProvider: 'ollama',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaWarmup: true,
        ollamaWarmupModels: ['qwen3:latest', 'qwen2.5-coder:14b'],
        modelRoles: {
            chat: 'qwen3:latest',
            coding: 'qwen2.5-coder:14b',
            planning: 'deepseek-r1:32b',
            analysis: 'qwen3:14b'
        }
    },
    agentState: {
        mode: 'normal',
        lastActivity: Date.now(),
        currentTask: null
    },
    tasks: [],
    vfs: [],
    logs: [],
    chatHistory: [],
    reasoningHistory: [],
    memories: [],
    learnings: []
};

// 🔧 FUNKCJE POMOCNICZE
const saveState = () => {
    console.log('💾 Mock saveState called');
};

const applyRuntimeConfig = () => {
    console.log('⚙️ Mock applyRuntimeConfig called');
};

const normalizeAllTasks = () => {
    console.log('📋 Mock normalizeAllTasks called');
};

console.log('✅ Middleware initialized');

// 🗃️ PODSTAWOWE ENDPOINTY DB (dla frontendu)
app.get('/api/db', (req, res) => {
    try {
        console.log('📊 GET /api/db');
        
        // Safe serialization
        const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular]';
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        const dbView = {
            ...SYSTEM_DB,
            vfs: SYSTEM_DB.vfs.slice(-50), // Ostatnie 50 plików
            logs: SYSTEM_DB.logs.slice(-200),
            chatHistory: SYSTEM_DB.chatHistory.slice(-1000),
            reasoningHistory: SYSTEM_DB.reasoningHistory.slice(-20),
            memories: gaiMemory.getMemories(),
            learnings: gaiMemory.getLearnings()
        };

        const json = JSON.stringify(dbView, getCircularReplacer());
        const sizeMb = (json.length / 1024 / 1024).toFixed(2);
        if (parseFloat(sizeMb) > 1.0) console.log(`[API/DB] Serving DB state: ${sizeMb} MB`);
        
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
    } catch (e) {
        console.error("❌ API/DB Error:", e);
        res.status(500).json({ error: "Failed to serialize DB", details: e.message });
    }
});

app.post('/api/sync', (req, res) => {
    console.log('🔄 POST /api/sync');
    try {
        const body = req.body || {};
        if (body && typeof body === 'object') {
            if (body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
                SYSTEM_DB.settings = { ...(SYSTEM_DB.settings || {}), ...body.settings };
                delete body.settings;
            }
            if (body.agentState && typeof body.agentState === 'object' && !Array.isArray(body.agentState)) {
                SYSTEM_DB.agentState = { ...(SYSTEM_DB.agentState || {}), ...body.agentState };
                delete body.agentState;
            }
            Object.assign(SYSTEM_DB, body);
        }
        applyRuntimeConfig();
        normalizeAllTasks();
        saveState();
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('❌ Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/status', (req, res) => {
    console.log('ℹ️ GET /api/system/status');
    try {
        const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
        const serviceName = process.env.K_SERVICE || 'GAI_CORE_V6';
        
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            platform: process.platform,
            arch: process.arch,
            nodeEnv: process.env.NODE_ENV || 'production',
            cpus: 8,
            projectId,
            serviceName,
            memory: process.memoryUsage(),
            persistence: { path: './data', status: 'WRITABLE' },
            logs: SYSTEM_DB.logs,
            version: SYSTEM_DB.version
        });
    } catch (error) {
        console.error('❌ System status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🧠 GAI MEMORY ENDPOINTY
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
        console.error('❌ Memory status error:', error);
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
        console.error('❌ Memory save error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/analyze', async (req, res) => {
    try {
        const { input, sessionId } = req.body;
        const context = await gaiMemory.analyzeContext(input, sessionId);
        res.json(context);
    } catch (error) {
        console.error('❌ Memory analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🌐 AUTO LEARNING ENDPOINTY
app.post('/api/auto-learn', async (req, res) => {
    try {
        const { query, maxResults } = req.body;
        const result = await gaiMemory.autoLearnFromWeb(query, maxResults || 3);
        res.json(result);
    } catch (error) {
        console.error('❌ Auto learn error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 SELF-UPGRADE ENDPOINTY
app.post('/api/self-analysis', async (req, res) => {
    try {
        const result = await gaiMemory.performSelfAnalysis();
        res.json(result);
    } catch (error) {
        console.error('❌ Self analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 💬 COMMUNICATION ENDPOINTY
app.post('/api/ask-user', async (req, res) => {
    try {
        const { question, context } = req.body;
        const result = await gaiMemory.askUserQuestion(question, context);
        res.json(result);
    } catch (error) {
        console.error('❌ Ask user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inform-user', async (req, res) => {
    try {
        const { message, type, details } = req.body;
        await gaiMemory.informUser(message, type, details);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Inform user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/report-progress', async (req, res) => {
    try {
        const { task, progress, status, details } = req.body;
        await gaiMemory.reportProgress(task, progress, status, details);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Report progress error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ☁️ EXTERNAL AI ENDPOINTY
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
        console.error('❌ External AI models error:', error);
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
        console.error('❌ External AI chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🛡️ SAFETY ENDPOINTY
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
        console.error('❌ Safety status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/safety/check', async (req, res) => {
    try {
        const { operation } = req.body;
        const result = await checkOperationSafety(operation);
        res.json(result);
    } catch (error) {
        console.error('❌ Safety check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔓 UNCENSOR ENDPOINTY
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
        console.error('❌ Uncensor status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/uncensor/bypass', (req, res) => {
    try {
        const { ruleId, userReason } = req.body;
        const result = gaiUncensor.requestBypass(ruleId, userReason);
        res.json(result);
    } catch (error) {
        console.error('❌ Uncensor bypass error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🎯 BASIC ENDPOINTY
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'GAI OS AGI Server Complete' });
});

// 🌍 GŁÓWNY ENDPOINT - SERWUJ FRONTEND LUB API INFO
app.get('/', (req, res) => {
    if (existsSync(path.join(frontendPath, 'index.html'))) {
        console.log('📄 Serving index.html');
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.json({ 
            status: 'ok', 
            message: '🧠 GAI OS with AGI Features and Complete Frontend!',
            features: [
                '✅ True Memory System',
                '✅ Auto-Learning from Web',
                '✅ Self-Analysis & Auto-Upgrade',
                '✅ User Communication',
                '✅ External AI Support (Kimi2.5)',
                '✅ Safety System',
                '✅ Uncensor System',
                '✅ Complete Frontend Integration'
            ],
            api: {
                memory: '/api/memory/*',
                learning: '/api/auto-learn',
                analysis: '/api/self-analysis',
                external: '/api/external-ai/*',
                safety: '/api/safety/*',
                uncensor: '/api/uncensor/*',
                db: '/api/db',
                sync: '/api/sync',
                system: '/api/system/status'
            }
        });
    }
});

// 🚀 STARTUP - FINAL VERSION
console.log('🚀 FINAL: Starting GAI OS AGI Server with Complete Frontend...');

const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🧠 FINAL: GAI OS AGI Server v1.0.0 Active on ${PORT}`);
    console.log(`🚀 FINAL: Root: ${process.cwd()}`);
    console.log(`🌍 FINAL: Frontend: ${existsSync(frontendPath) ? 'ENABLED' : 'API ONLY'}`);
    
    try {
        await initializeGAIMemory();
        console.log('✅ FINAL: GAI Memory System initialized');
    } catch (error) {
        console.error('❌ FINAL: Failed to initialize GAI Memory:', error);
    }
    
    try {
        await initializeExternalAI();
        console.log('✅ FINAL: External AI Service initialized');
    } catch (error) {
        console.error('❌ FINAL: Failed to initialize External AI:', error);
    }
    
    try {
        initializeUncensorSystem();
        console.log('✅ FINAL: Uncensor System initialized');
    } catch (error) {
        console.error('❌ FINAL: Failed to initialize Uncensor System:', error);
    }
    
    console.log('🎉 FINAL: GAI OS AGI Features Ready!');
    console.log('📡 FINAL: All endpoints ready!');
    console.log('🌐 FINAL: Open http://localhost:' + PORT + ' in your browser!');
});

// Obsługa błędów
server.on('error', (error) => {
    console.error('💥 FINAL: Server error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('💥 FINAL: Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 FINAL: Unhandled rejection at:', promise, 'reason:', reason);
});

// Upewnij się że serwer działa
setInterval(() => {
    console.log('💓 FINAL: Server heartbeat - still running on port', PORT);
}, 30000); // Co 30 sekund