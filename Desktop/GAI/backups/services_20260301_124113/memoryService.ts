
import { 
  DatabaseSchema, 
  Task, 
  SystemSettings, 
  DesktopItem, 
  DynamicAppSchema,
  ChatMessage,
  FileNode,
  SystemLog,
  NotificationEntry
} from '../types';
import { INITIAL_SYSTEM_PROMPT } from '../constants.js';

const API_BASE = '/api';

class MemoryService {
  private db: DatabaseSchema;
  private isReady: boolean = false;
  private sessionId: string | null = null;
  private pollingInterval: any = null;
  private pollingTimeout: any = null;
  private initPromise: Promise<void> | null = null;
  private fetchInFlight: Promise<void> | null = null;
  private pollingIntervalMs: number = 3000; // Increased frequency for live updates (was 15000)
  private offlineFailureCount: number = 0;
  private lastOfflineLogAt: number = 0;
  private lastFetchTime: number = 0;
  private readonly MIN_FETCH_INTERVAL = 2000; // Minimum 2s między fetchami

  constructor() {
    this.db = this.getEmptyState();
    window.addEventListener('online', () => {
      if (this.isReady) {
        this.startPolling(this.pollingIntervalMs);
        this.fetchState().catch(() => undefined);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isReady) {
        this.startPolling(this.pollingIntervalMs);
        this.fetchState().catch(() => undefined);
      }
    });
  }

  get isInitialized() { return this.isReady; }

  private getEmptyState(): DatabaseSchema {
    return {
      blogs: [], memories: [], chatHistory: [], vfs: [], installedApps: [],
      desktopLayout: [], tasks: [], 
      gaiProfile: null,
      gaiLearnings: [],
      notifications: [],
      agentState: { lastRun: 0, lastHeartbeatAt: 0, currentAction: 'idle', thoughtProcess: 'System Standby', consecutiveLoops: 0, userPriority: false, userQueueLength: 0, userQueuePreview: [], processingStage: '', ollamaWaitStartedAt: 0, autonomyBackoffUntil: 0, autonomyFailureCount: 0, lastAutonomyError: '', taskActionErrorCount: 0, lastTaskActionErrorAt: 0, lastAutorecoveryAt: 0, lastQualityAuditAt: 0, lastQualityAuditSummary: '', lastQualityAuditAiSummary: '', pendingQualityAudit: false, supportHints: [], toolMemory: [], lastToolCacheClearedAt: 0, lastToolCacheClearReason: '', lastSelfImproveAt: 0, lastSelfImproveReason: '', lastSelfImproveTaskId: '', modelStats: {}, modelStatsSeries: [], cacheConfig: { fileReadTtlMs: 0, fileReadLimit: 0, toolResultTtlMs: 0, toolResultLimit: 0, toolMemoryLimit: 0 }, pendingTaskApproval: null },
      settings: {
        theme: 'neu', wallpaper: '#212529', soundEnabled: true, soundVolume: 0.6, soundStyle: 'soft', taskbarOpacity: 0.8, iconSize: 'medium', developerMode: false,
        autoSave: true, aiProvider: 'ollama', useSmartFallback: false,
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
          chat: 8192,
          coding: 8192,
          writing: 8192,
          planning: 16384,
          functionCoding: 8192,
          refactor: 8192,
          debug: 8192,
          architecture: 16384,
          boilerplate: 8192,
          support: 8192
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
        progressNotifications: { enabled: false, intervalSeconds: 120, telegram: false },
        dailySnapshots: { enabled: true, hourLocal: 3, keep: 10 },
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

  private getHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionId) headers['x-session-id'] = this.sessionId;
    return headers;
  }

  private handleSessionExpired() {
    this.isReady = false;
    this.stopPolling();
    this.sessionId = null;
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      let retries = 3;
      while (retries > 0) {
          try { 
            await this.fetchState(); 
            this.isReady = true; 
            this.startPolling();
            return; // Success
          } catch (e: any) { 
            console.warn(`Sync Failed (Attempts left: ${retries - 1})`, e); 
            retries--;
            const msg = String(e?.message || '');
            const isRateLimited = msg.includes('Rate limited') || msg.includes('429');
            const waitMs = isRateLimited ? 15000 : 2000;
            if (retries > 0) await new Promise(r => setTimeout(r, waitMs));
          }
      }
      console.error("Final Sync Failure: Could not reach Core DB.");
    })().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  startPolling(intervalMs: number = 5000) {
    this.pollingIntervalMs = intervalMs;
    this.stopPolling();
    const tick = async () => {
      try {
        await this.fetchState();
        this.offlineFailureCount = 0;
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        const isOffline = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION_REFUSED');
        if (isOffline) {
          this.offlineFailureCount += 1;
          const backoffMs = Math.min(30000, 1000 * Math.pow(2, Math.min(5, this.offlineFailureCount)));
          const now = Date.now();
          if (now - this.lastOfflineLogAt > 5000) {
            this.lastOfflineLogAt = now;
            console.warn(`Polling paused (offline). Retrying in ${Math.ceil(backoffMs / 1000)}s`);
          }
          this.stopPolling();
          this.pollingTimeout = setTimeout(() => this.startPolling(this.pollingIntervalMs), backoffMs);
          return;
        }
        console.error("Polling Error:", e);
        if (msg.includes('Rate limited') || msg.includes('429')) {
          this.stopPolling();
          this.pollingTimeout = setTimeout(() => this.startPolling(this.pollingIntervalMs), 15000);
          return;
        }
      }
    };
    tick().catch(() => undefined);
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
    if (this.fetchInFlight) return this.fetchInFlight;
    
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;
    
    // Debounce - jeśli ostatni fetch był mniej niż 2s temu, poczekaj
    if (timeSinceLastFetch < this.MIN_FETCH_INTERVAL) {
      const waitTime = this.MIN_FETCH_INTERVAL - timeSinceLastFetch;
      return new Promise(resolve => {
        setTimeout(() => resolve(this.fetchState()), waitTime);
      });
    }
    
    this.fetchInFlight = (async () => {
      this.lastFetchTime = Date.now();
      const res = await fetch(`${API_BASE}/db?t=${Date.now()}`, { headers: this.getHeaders() });
      if (res.status === 401) {
        this.handleSessionExpired();
        throw new Error("Session expired");
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || '0');
        throw new Error(`Rate limited (429). Retry-After: ${retryAfter || 0}`);
      }
      if (!res.ok) throw new Error("Failed to fetch DB state");
      const remoteData = await res.json();
      this.db = { ...this.db, ...remoteData };
      this.notifyListeners();
    })().finally(() => {
      this.fetchInFlight = null;
    });
    return this.fetchInFlight;
  }

  private notifyListeners() {
      window.dispatchEvent(new CustomEvent('gai:state_update', { detail: this.db }));
  }

  getSettings() { return this.db.settings; }
  getTasks() { return this.db.tasks || []; }
  getAgentState() { return this.db.agentState; }
  getChatHistory() { return this.db.chatHistory || []; }
  getMemories() { return this.db.memories || []; }
  getGaiProfile() { return (this.db as any).gaiProfile || null; }
  getGaiLearnings() { return Array.isArray((this.db as any).gaiLearnings) ? (this.db as any).gaiLearnings : []; }
  getNotifications() { return Array.isArray((this.db as any).notifications) ? ((this.db as any).notifications as NotificationEntry[]) : ([] as NotificationEntry[]); }
  getSessionId() { return this.sessionId; }
  
  async updateMemories(memories: any[]) {
    this.db.memories = memories;
    // Użyj sync endpoint zamiast updateSettings
    await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ memories })
    });
    await this.fetchState();
  }

  async updateGaiProfile(profile: any) {
    (this.db as any).gaiProfile = profile;
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ gaiProfile: profile })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Sync failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async updateGaiLearnings(learnings: any[]) {
    (this.db as any).gaiLearnings = learnings;
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ gaiLearnings: learnings })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Sync failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async deleteChatMessage(idOrIds: string | string[]) {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const cleaned = ids.map(x => String(x || '').trim()).filter(Boolean);
    const payload = cleaned.length <= 1 ? { id: cleaned[0] } : { ids: cleaned };
    const res = await fetch(`${API_BASE}/chat/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Delete failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/read`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ id })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Mark read failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read_all`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Mark all read failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async clearNotifications() {
    const res = await fetch(`${API_BASE}/notifications/clear`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || `Clear failed: ${res.status}`);
    }
    await this.fetchState();
  }

  async sendCommand(message: string, role: 'user' | 'model' = 'user', attachments?: any, config?: any): Promise<string> {
      const res = await fetch(`${API_BASE}/command`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ message, role, attachments, config })
      });
      let data: any = null;
      try {
          data = await res.json();
      } catch {
          const text = await res.text().catch(() => '');
          throw new Error(text || `AI Request Failed (${res.status})`);
      }
      if (!res.ok) throw new Error(data?.error || `AI Request Failed (${res.status})`);
      const response = String(data?.response || '');
      if (!response.trim()) throw new Error('AI returned empty response.');
      return response;
  }

  // Task Management
  async addTask(task: Partial<Task>) {
      const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(task)
      });
      await this.fetchState();
  }

  async updateTask(id: string, updates: Partial<Task>) {
      await fetch(`${API_BASE}/tasks/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(updates)
      });
      await this.fetchState();
  }

  async deleteTask(id: string) {
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
  async updateSettings(settings: Partial<SystemSettings>) {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ settings: { ...this.db.settings, ...settings } })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || `Sync failed: ${res.status}`);
      }
      await this.fetchState();
  }

  readVFS(path: string): string | null {
      const file = this.db.vfs?.find((f: any) => f.path === path);
      if (!file) return null;
      const c = file.content || null;
      if (c === '[BLOB_OMITTED_FOR_PERFORMANCE]' || c === '[Content deferred]') return null;
      return c;
  }

  async fetchFileContent(path: string) {
      const res = await fetch(`${API_BASE}/fs/read`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ path }) });
      if (res.ok) { const d = await res.json(); return d.content; }
      return null;
  }

  getInstalledApps() { return this.db.installedApps || []; }
  getDesktopLayout() { return this.db.desktopLayout || []; }
  async saveDesktopLayout(l: any) {
    const res = await fetch(`${API_BASE}/sync`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ desktopLayout: l }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
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
  async installApp(app: DynamicAppSchema) {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ installedApps: [...this.db.installedApps, app] })
    });
    if (!res.ok) throw new Error("Failed to install app");
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
  async removeVFS(path: string, permanent: boolean) {
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
  async moveToTrash(path: string) {
    const trashPath = `/.trash/${path.split('/').pop()}`;
    await this.moveVFS(path, trashPath);
  }

  /**
   * Creates a new directory in the VFS.
   */
  async makeDir(path: string) {
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
  async copyVFS(src: string, dest: string) {
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
  async moveVFS(src: string, dest: string) {
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
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.snapshots) ? data.snapshots : [];
  }

  /**
   * Restores the system state to a specific snapshot ID.
   */
  async restoreSnapshot(id: string) {
    const res = await fetch(`${API_BASE}/snapshot/restore`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ id })
    });
    if (!res.ok) return false;
    await this.fetchState();
    return true;
  }

  /**
   * Writes content to a file in the VFS and synchronizes it with the server.
   * Now returns a boolean to satisfy truthiness checks in components.
   */
  writeVFS(p: string, c: string) { 
    const fileName = p.split('/').pop() || '';
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov', 'pdf'].includes(ext);
    const encoding: 'utf8' | 'base64' = isBinary ? 'base64' : 'utf8';
    const storedContent = isBinary ? '[Content deferred]' : c;
    const newFile = { name: fileName, type: 'file' as const, path: p, content: storedContent, size: c.length, updatedAt: Date.now() };
    this.db.vfs = [...(this.db.vfs || []).filter((f: any) => f.path !== p), newFile];
    
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
  logSystem(level: 'info' | 'warn' | 'error' | 'panic', message: string) {
    const log: SystemLog = { id: `log_${Date.now()}`, timestamp: Date.now(), level, message };
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

  async listRealDisk(path: string): Promise<FileNode[]> {
    const r = await fetch(`${API_BASE}/fs/list`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ path }) });
    const data = await r.json();
    return Array.isArray(data) ? (data as FileNode[]) : [];
  }
}

export const db = new MemoryService();
