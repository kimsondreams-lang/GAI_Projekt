// 🚀 GAI OS AGI SERVER Z KOMPLETNYM FRONTENDEM I BRAKUJĄCYMI ZASOBAMI - FINAL VERSION
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import fs from 'fs';
import { gaiMemory, initializeGAIMemory } from './services/gaiMemoryService.js';
import { gaiExternalAI, initializeExternalAI } from './services/externalAIService.js';
import { gaiSafety, createSafeOperation, checkOperationSafety } from './services/safetyService.js';
import { gaiUncensor, initializeUncensorSystem } from './services/uncensorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 1234;

const pickDataDir = () => {
    const envDir = process.env.GAI_DATA_DIR || process.env.DATA_DIR;
    if (envDir && typeof envDir === 'string') return envDir;
    return path.join(process.cwd(), 'data');
};

const DATA_DIR = pickDataDir();
const DB_PATH = path.join(DATA_DIR, 'gai_db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

console.log('🚀 Starting GAI OS AGI Server with Complete Frontend and Missing Resources...');
console.log('📡 Initializing middleware...');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 🎯 SERWUJ FRONTEND I BRAKUJĄCE ZASOBY
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

const saveState = () => {
    try {
        const data = JSON.stringify(SYSTEM_DB, null, 2);
        fs.writeFileSync(DB_PATH, data, 'utf8');
    } catch (e) {
        console.error('Failed to save state:', e);
    }
};

const loadState = () => {
    try {
        if (!fs.existsSync(DB_PATH)) return;
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            Object.assign(SYSTEM_DB, parsed);
        }
    } catch (e) {
        console.error('Failed to load state:', e);
    }
};

const applyRuntimeConfig = () => {
    console.log('⚙️ Mock applyRuntimeConfig called');
};

const normalizeAllTasks = () => {
    console.log('📋 Mock normalizeAllTasks called');
};

// 🗃️ MOCK DATABASE (dla frontendu)
const SYSTEM_DB = {
    version: '5.0.1',
    settings: {
        theme: 'neu',
        wallpaper: '#212529',
        taskbarOpacity: 0.8,
        iconSize: 'medium',
        developerMode: false,
        chatConsultation: { enabled: true, maxRoles: 2, timeoutMs: 8000 },
        interAgent: { enabled: true, allowDelegation: true },
        ftpConfig: { host: '', user: '', pass: '', port: '21', rootPath: '/', enabled: false },
        telegramConfig: { botToken: '', chatId: '', enabled: false },
        apiKeys: { ollama: '' },
        aiProvider: 'ollama',
        activeModel: 'qwen3:latest',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaNumCtx: 4096,
        ollamaTtfbTimeoutMs: 180000,
        ollamaLiveKeepAfterFinish: false,
        ollamaKeepAlive: '60m',
        ollamaWarmupMaxB: 14,
        ollamaWarmup: true,
        ollamaWarmupModels: ['qwen3:latest', 'qwen2.5-coder:14b'],
        systemPrompt: 'Jesteś GAI OS. Odpowiadaj zwięźle i konkretnie.',
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

loadState();

if (!SYSTEM_DB.settings || typeof SYSTEM_DB.settings !== 'object' || Array.isArray(SYSTEM_DB.settings)) {
    SYSTEM_DB.settings = {};
}
if (!SYSTEM_DB.settings.apiKeys || typeof SYSTEM_DB.settings.apiKeys !== 'object' || Array.isArray(SYSTEM_DB.settings.apiKeys)) {
    SYSTEM_DB.settings.apiKeys = { ollama: '' };
}
if (typeof SYSTEM_DB.settings.apiKeys.ollama !== 'string') {
    SYSTEM_DB.settings.apiKeys.ollama = String(SYSTEM_DB.settings.apiKeys.ollama || '');
}
if (!SYSTEM_DB.settings.aiProvider) SYSTEM_DB.settings.aiProvider = 'ollama';
if (!SYSTEM_DB.settings.ollamaBaseUrl) SYSTEM_DB.settings.ollamaBaseUrl = 'http://localhost:11434';

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

app.get('/api/models', async (req, res) => {
    const providerRaw = req.query.provider || 'ollama';
    const provider = String(providerRaw).toLowerCase();
    const isValidProvider = /^[a-zA-Z0-9._-]+$/.test(provider) && provider.length <= 64;
    if (!isValidProvider) return res.status(400).json({ error: 'Invalid provider name' });
    if (provider !== 'ollama') return res.json({ [provider]: [] });

    try {
        const baseUrl = SYSTEM_DB?.settings?.ollamaBaseUrl || 'http://localhost:11434';
        const r = await fetch(`${baseUrl}/api/tags`);
        if (!r.ok) return res.json({ [provider]: [] });
        const d = await r.json();
        const models = Array.isArray(d?.models) ? d.models : [];
        return res.json({ [provider]: models.map(m => ({ id: m.name, displayName: m.name })) });
    } catch (e) {
        return res.json({ [provider]: [] });
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

// 🎨 BRAKUJĄCE ZASOBY FRONTENDU
app.get('/index.css', (req, res) => {
    console.log('🎨 Serving index.css');
    res.setHeader('Content-Type', 'text/css');
    res.send(`
        /* GAI OS Custom Styles */
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
        }
        
        .gai-os-container {
            background: var(--bg-base, #212529);
            color: var(--text-main, #e9ecef);
            min-height: 100vh;
        }
        
        .neu-button {
            background: var(--bg-light, #2c3238);
            border: 1px solid var(--border-color, rgba(255,255,255,0.03));
            border-radius: var(--radius, 0.75rem);
            box-shadow: var(--shadow-flat, 4px 4px 10px #16191c, -4px -4px 10px #2c3238);
            color: var(--text-main, #e9ecef);
            padding: 0.5rem 1rem;
            transition: all 0.2s ease;
        }
        
        .neu-button:hover {
            box-shadow: var(--shadow-pressed, inset 4px 4px 8px #16191c, inset -4px -4px 8px #2c3238);
        }
        
        .gai-memory-panel {
            background: var(--bg-light, #2c3238);
            border-radius: var(--radius, 0.75rem);
            padding: 1rem;
            margin: 1rem 0;
            box-shadow: var(--shadow-flat, 4px 4px 10px #16191c, -4px -4px 10px #2c3238);
        }
        
        .gai-memory-item {
            background: var(--bg-dark, #16191c);
            border-radius: 0.5rem;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-left: 3px solid var(--accent, #3b82f6);
        }
        
        .agi-status {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 1rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.875rem;
            color: #3b82f6;
        }
        
        .agi-status.active {
            background: rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.3);
            color: #22c55e;
        }
        
        .memory-visualization {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .memory-node {
            background: var(--bg-light, #2c3238);
            border-radius: var(--radius, 0.75rem);
            padding: 1rem;
            text-align: center;
            transition: transform 0.2s ease;
        }
        
        .memory-node:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-flat, 4px 4px 10px #16191c, -4px -4px 10px #2c3238);
        }
        
        .learning-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `);
});

app.get('/favicon.ico', (req, res) => {
    console.log('🔤 Serving favicon.ico');
    res.setHeader('Content-Type', 'image/x-icon');
    res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#3b82f6"/>
            <text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-family="Arial">GAI</text>
        </svg>
    `);
});

app.get('/pwa-192x192.png', (req, res) => {
    console.log('📱 Serving PWA icon');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    const crcTable = (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[i] = c >>> 0;
        }
        return t;
    })();

    const crc32 = (buf) => {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    };

    const chunk = (type, data) => {
        const typeBuf = Buffer.from(type, 'ascii');
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(data.length, 0);
        const crcBuf = Buffer.alloc(4);
        const crc = crc32(Buffer.concat([typeBuf, data]));
        crcBuf.writeUInt32BE(crc, 0);
        return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
    };

    const makePng = (w, h) => {
        const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(w, 0);
        ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8;
        ihdr[9] = 6;
        ihdr[10] = 0;
        ihdr[11] = 0;
        ihdr[12] = 0;

        const stride = w * 4;
        const raw = Buffer.alloc((stride + 1) * h);
        for (let y = 0; y < h; y++) {
            const rowStart = y * (stride + 1);
            raw[rowStart] = 0;
            for (let x = 0; x < w; x++) {
                const p = rowStart + 1 + x * 4;
                raw[p] = 59;
                raw[p + 1] = 130;
                raw[p + 2] = 246;
                raw[p + 3] = 255;
            }
        }

        const idatData = zlib.deflateSync(raw, { level: 9 });
        return Buffer.concat([
            signature,
            chunk('IHDR', ihdr),
            chunk('IDAT', idatData),
            chunk('IEND', Buffer.alloc(0))
        ]);
    };

    res.send(makePng(192, 192));
});

app.get('/manifest.webmanifest', (req, res) => {
    console.log('📋 Serving manifest');
    res.setHeader('Content-Type', 'application/json');
    res.json({
        name: 'GAI OS',
        short_name: 'GAI OS',
        description: 'General Artificial Intelligence Operating System',
        start_url: '/',
        display: 'standalone',
        background_color: '#212529',
        theme_color: '#3b82f6',
        icons: [
            {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            }
        ]
    });
});

app.get('/registerSW.js', (req, res) => {
    console.log('⚙️ Serving service worker');
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        // GAI OS Service Worker
        self.addEventListener('install', (event) => {
            console.log('GAI OS Service Worker installed');
        });
        
        self.addEventListener('activate', (event) => {
            console.log('GAI OS Service Worker activated');
        });
        
        self.addEventListener('fetch', (event) => {
            // Cache strategy for offline support
        });
    `);
});

// 🎯 BASIC ENDPOINTY
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'GAI OS AGI Server Complete with Resources' });
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
                '✅ Complete Frontend Integration',
                '✅ No Missing Resources'
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
console.log('🚀 FINAL: Starting GAI OS AGI Server with Complete Frontend and Resources...');

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
