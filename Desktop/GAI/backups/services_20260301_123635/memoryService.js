import { INITIAL_SYSTEM_PROMPT } from '../constants.js';
const API_BASE = '/api';
class MemoryService {
    constructor() {
        this.isReady = false;
        this.sessionId = null;
        this.pollingInterval = null;
        this.pollingTimeout = null;
        this.initPromise = null;
        this.fetchInFlight = null;
        this.pollingIntervalMs = 5000;
        this.db = this.getEmptyState();
    }
    get isInitialized() { return this.isReady; }
    getEmptyState() {
        return {
            blogs: [], memories: [], chatHistory: [], vfs: [], installedApps: [],
            desktopLayout: [], tasks: [],
      agentState: { lastRun: 0, lastHeartbeatAt: 0, currentAction: 'idle', thoughtProcess: 'System Standby', consecutiveLoops: 0, userPriority: false, userQueueLength: 0, userQueuePreview: [], processingStage: '', ollamaWaitStartedAt: 0, autonomyBackoffUntil: 0, autonomyFailureCount: 0, lastAutonomyError: '', taskActionErrorCount: 0, lastTaskActionErrorAt: 0, lastAutorecoveryAt: 0, lastQualityAuditAt: 0, lastQualityAuditSummary: '', lastQualityAuditAiSummary: '', pendingQualityAudit: false, supportHints: [], toolMemory: [], lastToolCacheClearedAt: 0, lastToolCacheClearReason: '', lastSelfImproveAt: 0, lastSelfImproveReason: '', lastSelfImproveTaskId: '', modelStats: {}, modelStatsSeries: [], cacheConfig: { fileReadTtlMs: 0, fileReadLimit: 0, toolResultTtlMs: 0, toolResultLimit: 0, toolMemoryLimit: 0 }, pendingTaskApproval: null },
            settings: {
                theme: 'neu', wallpaper: '#212529', taskbarOpacity: 0.8, iconSize: 'medium', developerMode: false,
                autoSave: true, aiProvider: 'ollama', useSmartFallback: true,
                apiKeys: { ollama: '' },
                blogUrl: '',
                amazonTag: '',
                activeModel: '',
                ollamaBaseUrl: 'http://localhost:11434',
                ollamaNumCtx: 8192,
                ollamaWarmup: true,
                ollamaKeepAlive: '30m',
                ollamaWarmupMaxB: 14,
                ollamaWarmupModels: [],
                ollamaTtfbTimeoutMs: 180000,
                ollamaTtfbTimeoutByRole: { planning: 180000, architecture: 180000, debug: 120000 },
                ollamaTtfbTimeoutByModel: {},
                modelRoleCandidates: {},
                localBackupModel: '',
                modelRoles: {
                    chat: '',
                    coding: '',
                    writing: '',
                    planning: '',
                    functionCoding: '',
                    refactor: '',
                    debug: '',
                    architecture: '',
                    boilerplate: '',
                    support: ''
                },
                modelRolesCtx: {
                    chat: 4096,
                    coding: 4096,
                    writing: 4096,
                    planning: 4096,
                    functionCoding: 4096,
                    refactor: 4096,
                    debug: 4096,
                    architecture: 4096,
                    boilerplate: 4096,
                    support: 4096
                },
                systemPrompt: INITIAL_SYSTEM_PROMPT,
                ollamaLiveKeepAfterFinish: false,
                ftpConfig: { host: '', user: '', port: '21', pass: '', rootPath: '/' },
                telegramConfig: { botToken: '', chatId: '', enabled: false },
                heartbeat: { enabled: true, intervalSeconds: 20 },
                autonomyWindow: { enabled: false, startHour: 0, endHour: 0 },
                autonomyConfig: {
                    maxToolsPerCycle: 3,
                    watchdogTimeoutMs: 60000,
                    loopBreakerLimit: 10
                },
                autonomousObjectives: '',
                autorecovery: {
                    enabled: true,
                    modelRole: 'planning',
                    prompt: '',
                    autoOnBoot: true,
                    cooldownSec: 60,
                    limits: { minCtx: 512, maxCtx: 8192, minBackoffSec: 5, maxBackoffSec: 600 }
                },
                mandatorySelfUpgrade: {
                    enabled: true,
                    loopLimit: 4,
                    retryLimit: 3,
                    cooldownSec: 900
                },
                qualityAudit: {
                    enabled: true,
                    minChangedLines: 80,
                    minFiles: 3,
                    cooldownSec: 120,
                    diffLimit: 120000,
                    autoBuild: true,
                    autoSummary: true,
                    autoAiSummary: true,
                    aiModelRole: 'planning'
                },
                qualityGate: {
                    enabled: true,
                    requireAiSummary: true,
                    allowOperatorOverride: true
                },
                taskBreakdown: {
                    enabled: true,
                    autoOnCreate: true,
                    autoOnStart: true,
                    autoCompleteOnChecklist: true,
                    minItems: 3,
                    maxItems: 6,
                    aiModelRole: 'planning'
                },
                operatorMode: true,
                realtimeSources: { enabled: false, intervalMinutes: 60, urls: [] },
                terminalLogFilters: {
                    enabled: true,
                    system: true,
                    stdout: true,
                    stderr: true,
                    exec: true,
                    fs: true,
                    ftp: true,
                    thought: true
                }
            },
            logs: [], reasoningHistory: [], version: '5.0.1'
        };
    }
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.sessionId)
            headers['x-session-id'] = this.sessionId;
        return headers;
    }
    handleSessionExpired() {
        this.isReady = false;
        this.stopPolling();
        this.sessionId = null;
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    async init() {
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = (async () => {
            let retries = 3;
            while (retries > 0) {
                try {
                    await this.fetchState();
                    this.isReady = true;
                    this.startPolling();
                    return; // Success
                }
                catch (e) {
                    console.warn(`Sync Failed (Attempts left: ${retries - 1})`, e);
                    retries--;
                    const msg = String(e?.message || '');
                    const isRateLimited = msg.includes('Rate limited') || msg.includes('429');
                    const waitMs = isRateLimited ? 15000 : 2000;
                    if (retries > 0)
                        await new Promise(r => setTimeout(r, waitMs));
                }
            }
            console.error("Final Sync Failure: Could not reach Core DB.");
        })().finally(() => {
            this.initPromise = null;
        });
        return this.initPromise;
    }
    startPolling(intervalMs = 5000) {
        this.pollingIntervalMs = intervalMs;
        this.stopPolling();
        const tick = async () => {
            try {
                await this.fetchState();
            }
            catch (e) {
                console.error("Polling Error:", e);
                const msg = String(e?.message || '');
                if (msg.includes('Rate limited') || msg.includes('429')) {
                    this.stopPolling();
                    this.pollingTimeout = setTimeout(() => this.startPolling(this.pollingIntervalMs), 15000);
                    return;
                }
            }
        };
        this.pollingInterval = setInterval(() => {
            tick().catch(() => undefined);
        }, intervalMs);
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
            this.pollingTimeout = null;
        }
    }
    async fetchState() {
        if (this.fetchInFlight)
            return this.fetchInFlight;
        this.fetchInFlight = (async () => {
            const res = await fetch(`${API_BASE}/db`, { headers: this.getHeaders() });
            if (res.status === 401) {
                this.handleSessionExpired();
                throw new Error("Session expired");
            }
            if (res.status === 429) {
                const retryAfter = Number(res.headers.get('retry-after') || '0');
                throw new Error(`Rate limited (429). Retry-After: ${retryAfter || 0}`);
            }
            if (!res.ok)
                throw new Error("Failed to fetch DB state");
            const remoteData = await res.json();
            this.db = { ...this.db, ...remoteData };
            this.notifyListeners();
        })().finally(() => {
            this.fetchInFlight = null;
        });
        return this.fetchInFlight;
    }
    notifyListeners() {
        window.dispatchEvent(new CustomEvent('gai:state_update', { detail: this.db }));
    }
    getSettings() { return this.db.settings; }
    getTasks() { return this.db.tasks || []; }
    getAgentState() { return this.db.agentState; }
    getChatHistory() { return this.db.chatHistory || []; }
    getMemories() { return this.db.memories || []; }
    getGaiProfile() { var _a; return ((_a = this.db) === null || _a === void 0 ? void 0 : _a.gaiProfile) || null; }
    getGaiLearnings() { var _a; return Array.isArray((_a = this.db) === null || _a === void 0 ? void 0 : _a.gaiLearnings) ? this.db.gaiLearnings : []; }
    getSessionId() { return this.sessionId; }
    async updateMemories(memories) {
        this.db.memories = memories;
        // Użyj sync endpoint zamiast updateSettings
        await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ memories })
        });
        await this.fetchState();
    }
    async sendCommand(message, role = 'user', attachments, config) {
        const res = await fetch(`${API_BASE}/command`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ message, role, attachments, config })
        });
        let data = null;
        try {
            data = await res.json();
        }
        catch {
            const text = await res.text().catch(() => '');
            throw new Error(text || `AI Request Failed (${res.status})`);
        }
        if (!res.ok)
            throw new Error(data?.error || `AI Request Failed (${res.status})`);
        const response = String(data?.response || '');
        if (!response.trim())
            throw new Error('AI returned empty response.');
        return response;
    }
    // Task Management
    async addTask(task) {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(task)
        });
        await this.fetchState();
    }
    async updateTask(id, updates) {
        await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updates)
        });
        await this.fetchState();
    }
    async deleteTask(id) {
        await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        await this.fetchState();
    }
    async deleteAllTasks() {
        await fetch(`${API_BASE}/tasks`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        await this.fetchState();
    }
    // Common Methods
    async updateSettings(settings) {
        const res = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ settings: { ...this.db.settings, ...settings } })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || `Sync failed: ${res.status}`);
        }
        await this.fetchState();
    }
    readVFS(path) {
        const file = this.db.vfs?.find((f) => f.path === path);
        if (!file)
            return null;
        const c = file.content || null;
        if (c === '[BLOB_OMITTED_FOR_PERFORMANCE]' || c === '[Content deferred]')
            return null;
        return c;
    }
    async fetchFileContent(path) {
        const res = await fetch(`${API_BASE}/fs/read`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ path }) });
        if (res.ok) {
            const d = await res.json();
            return d.content;
        }
        return null;
    }
    getInstalledApps() { return this.db.installedApps || []; }
    getDesktopLayout() { return this.db.desktopLayout || []; }
    async saveDesktopLayout(l) {
        const res = await fetch(`${API_BASE}/sync`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ desktopLayout: l }) });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || `Layout sync failed: ${res.status}`);
        }
    }
    // FIX: Implemented missing methods to satisfy frontend requirements
    /**
     * Clears the chat history from the system database.
     */
    async clearChatHistory() {
        await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ chatHistory: [] })
        });
        await this.fetchState();
    }
    /**
     * Installs a new dynamic application to the system database.
     */
    async installApp(app) {
        const res = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ installedApps: [...this.db.installedApps, app] })
        });
        if (!res.ok)
            throw new Error("Failed to install app");
        await this.fetchState();
    }
    /**
     * Retrieves the system's reasoning/thought history.
     */
    getReasoningHistory() { return this.db.reasoningHistory || []; }
    /**
     * Retrieves all system logs.
     */
    getLogs() { return this.db.logs || []; }
    /**
     * Removes a file or directory from the VFS.
     */
    async removeVFS(path, permanent) {
        await fetch(`${API_BASE}/fs/delete`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ path, permanent })
        });
        await this.fetchState();
    }
    /**
     * Moves a file or directory to the system trash.
     */
    async moveToTrash(path) {
        const trashPath = `/.trash/${path.split('/').pop()}`;
        await this.moveVFS(path, trashPath);
    }
    /**
     * Creates a new directory in the VFS.
     */
    async makeDir(path) {
        await fetch(`${API_BASE}/fs/mkdir`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ path })
        });
        await this.fetchState();
    }
    /**
     * Copies a file or directory in the VFS.
     */
    async copyVFS(src, dest) {
        await fetch(`${API_BASE}/fs/copy`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ src, dest })
        });
        await this.fetchState();
    }
    /**
     * Moves a file or directory in the VFS.
     */
    async moveVFS(src, dest) {
        await fetch(`${API_BASE}/fs/move`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ src, dest })
        });
        await this.fetchState();
    }
    /**
     * Lists available system snapshots for recovery.
     */
    async listSnapshots() {
        const res = await fetch(`${API_BASE}/snapshot/list`, { headers: this.getHeaders() });
        if (!res.ok)
            return [];
        const data = await res.json();
        return Array.isArray(data.snapshots) ? data.snapshots : [];
    }
    /**
     * Restores the system state to a specific snapshot ID.
     */
    async restoreSnapshot(id) {
        const res = await fetch(`${API_BASE}/snapshot/restore`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ id })
        });
        if (!res.ok)
            return false;
        await this.fetchState();
        return true;
    }
    /**
     * Writes content to a file in the VFS and synchronizes it with the server.
     * Now returns a boolean to satisfy truthiness checks in components.
     */
    writeVFS(p, c) {
        const fileName = p.split('/').pop() || '';
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov', 'pdf'].includes(ext);
        const encoding = isBinary ? 'base64' : 'utf8';
        const storedContent = isBinary ? '[Content deferred]' : c;
        const newFile = { name: fileName, type: 'file', path: p, content: storedContent, size: c.length, updatedAt: Date.now() };
        this.db.vfs = [...(this.db.vfs || []).filter((f) => f.path !== p), newFile];
        fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ vfs: this.db.vfs })
        }).then(() => this.fetchState());
        fetch(`${API_BASE}/fs/write`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ path: p, content: c, encoding })
        }).catch(() => undefined);
        return true;
    }
    /**
     * Records a log entry in the system database.
     */
    logSystem(level, message) {
        const log = { id: `log_${Date.now()}`, timestamp: Date.now(), level, message };
        this.db.logs = [...(this.db.logs || []), log];
        fetch(`${API_BASE}/sync`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ logs: this.db.logs }) });
    }
    /**
     * Performs a factory reset by wiping the server state and reloading the client.
     */
    factoryReset() {
        fetch(`${API_BASE}/reset`, { method: 'POST', headers: this.getHeaders() })
            .then(() => {
            window.location.reload();
        });
    }
    async listRealDisk(path) {
        const r = await fetch(`${API_BASE}/fs/list`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ path }) });
        const data = await r.json();
        return Array.isArray(data) ? data : [];
    }
}
export const db = new MemoryService();
