
import React from 'react';

export enum AppId {
  TERMINAL = 'terminal',
  BLOG_MANAGER = 'blog_manager',
  CODE_STUDIO = 'code_studio',
  INCOME_STRATEGIST = 'income_strategist',
  SETTINGS = 'settings',
  FILE_MANAGER = 'file_manager',
  BROWSER = 'browser',
  TASK_MANAGER = 'task_manager',
  FTP_CLIENT = 'ftp_client',
  TEXT_EDITOR = 'text_editor',
  OLLAMA_CENTER = 'ollama_center',
  SITE_MANAGER = 'site_manager',
  SEO_ANALYTICS = 'seo_analytics',
  GAI_MEMORY = 'gai_memory',
  MODEL_STATS = 'model_stats',
  AGENT_CONTROL = 'agent_control' // NEW
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  launchArgs?: any; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  timestampStart?: number;
  logType?: 'exec' | 'stdout' | 'stderr' | 'thought' | 'fs' | 'ftp' | 'text' | 'telegram' | 'system' | 'ollama';
  isAutonomous?: boolean;
}

export type AIProvider = 'ollama';
export type SystemTheme = 'neu' | 'glass' | 'classic' | 'windows10' | 'aurora' | 'midnight' | 'frost' | 'oceanic' | 'glacier';

export interface AppConfig {
  title: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  multiInstance: boolean;
  isDynamic?: boolean;
}

export interface UIElement {
  type: 'box' | 'text' | 'button' | 'input' | 'textarea';
  props?: any;
  children?: UIElement[];
  actionId?: string;
}

export interface DynamicAppSchema {
  id: string;
  name: string;
  iconName: string;
  version: string;
  layout: UIElement;
  logic: string;
  createdAt: number;
}

export interface DesktopItem {
  id: string;
  type: 'app' | 'folder';
  title: string;
  appId?: string;
  x: number;
  y: number;
  children?: DesktopItem[];
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
  permissions?: string;
  updatedAt: number;
  content?: string;
  children?: FileNode[];
}

export interface SystemLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'panic';
  message: string;
}

export type ModalType = 'info' | 'success' | 'error' | 'confirm' | 'prompt' | 'choice' | 'progress';

export interface ModalAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string | React.ReactNode;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  inputValue?: string;
  actions?: ModalAction[];
  progressId?: string;
  progress?: {
    value?: number | null;
    status?: string;
    details?: string[];
    canCancel?: boolean;
  };
}

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export type BootState = 'booting' | 'os' | 'recovery';

export interface SystemSettings {
  theme: SystemTheme;
  wallpaper: string;
  soundEnabled?: boolean;
  soundVolume?: number;
  soundStyle?: 'balanced' | 'soft' | 'crisp' | 'retro' | 'ambient' | 'cinematic' | 'minimal' | 'chime' | 'tech' | 'organic' | 'real';
  iconTheme?: 'default' | 'solid' | 'thin' | 'neon';
  blogUrl?: string;
  amazonTag?: string;
  taskbarOpacity: number;
  topbarOpacity?: number;
  desktopWallpaperOpacity?: number;
  desktopDim?: number;
  windowBlurEnabled?: boolean;
  windowBlurPx?: number;
  taskbarBlurEnabled?: boolean;
  taskbarBlurPx?: number;
  topbarBlurEnabled?: boolean;
  topbarBlurPx?: number;
  iconSize: 'small' | 'medium' | 'large';
  developerMode: boolean;
  aiProvider: AIProvider;
  activeModel: string;
  ollamaBaseUrl: string;
  ollamaTtfbTimeoutMs?: number;
  ollamaTtfbTimeoutByRole?: Record<string, number>;
  ollamaTtfbTimeoutByModel?: Record<string, number>;
  modelRoleCandidates?: Record<string, string[]>;
  localBackupModel?: string;

  idleAutoTasksEnabled?: boolean;
  idleAutoTasksTargetOpen?: number;
  idleAutoTasksThrottleSec?: number;
  ollamaNumCtx?: number;
  ollamaNumGpu?: number;
  ollamaWarmup?: boolean;
  ollamaKeepAlive?: string;
  ollamaWarmupMaxB?: number;
  ollamaWarmupModels?: string[];
  modelRoles: {
    chat: string;
    coding: string;
    writing: string;
    planning: string;
    functionCoding: string;
    refactor: string;
    debug: string;
    architecture: string;
    boilerplate: string;
    support: string;
  };
  modelRolesCtx?: {
    chat: number;
    coding: number;
    writing: number;
    planning: number;
    functionCoding: number;
    refactor: number;
    debug: number;
    architecture: number;
    boilerplate: number;
    support: number;
  };
  systemPrompt: string;
  autoThinkEnabled?: boolean;
  ollamaLiveKeepAfterFinish?: boolean;
  apiKeys: Record<AIProvider, string>;
  heartbeat: {
    enabled: boolean;
    intervalSeconds: number;
  };
  autonomyEnabled?: boolean;
  autonomyScheduler?: 'heartbeat' | 'event';
  autonomyWindow: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  autonomyConfig?: {
    maxToolsPerCycle: number;
    watchdogTimeoutMs: number;
    loopBreakerLimit: number;
  };
  ftpConfig: {
    host: string;
    user: string;
    pass: string;
    port: string;
    rootPath: string;
    enabled?: boolean;
  };
  telegramConfig: {
    botToken: string;
    chatId: string;
    enabled: boolean;
  };
  realtimeSources: {
    enabled: boolean;
    intervalMinutes: number;
    urls: string[];
  };
  progressNotifications?: {
    enabled: boolean;
    intervalSeconds: number;
    telegram: boolean;
  };
  dailySnapshots?: {
    enabled: boolean;
    hourLocal: number;
    keep: number;
  };
  terminalLogFilters?: {
    enabled: boolean;
    system: boolean;
    stdout: boolean;
    stderr: boolean;
    exec: boolean;
    fs: boolean;
    ftp: boolean;
    thought: boolean;
  };
  qualityAudit?: {
    enabled: boolean;
    minChangedLines: number;
    minFiles: number;
    cooldownSec: number;
    diffLimit: number;
    autoBuild: boolean;
    autoSummary: boolean;
    autoAiSummary: boolean;
    aiModelRole: string;
  };
  qualityGate?: {
    enabled: boolean;
    requireAiSummary: boolean;
    allowOperatorOverride: boolean;
  };
  taskBreakdown?: {
    enabled: boolean;
    autoOnCreate: boolean;
    autoOnStart: boolean;
    autoCompleteOnChecklist: boolean;
    minItems: number;
    maxItems: number;
    aiModelRole: string;
  };
  autorecovery?: {
    enabled: boolean;
    modelRole: string;
    prompt: string;
    autoOnBoot: boolean;
    cooldownSec: number;
    limits: {
      minCtx: number;
      maxCtx: number;
      minBackoffSec: number;
      maxBackoffSec: number;
    };
  };
  mandatorySelfUpgrade?: {
    enabled: boolean;
    loopLimit: number;
    retryLimit: number;
    cooldownSec: number;
  };
  autoSave?: boolean;
  useSmartFallback?: boolean;
  autonomousObjectives: string; // NEW: Field for custom autonomous goals
  operatorMode?: boolean;

  // --- AGENTIC SYSTEM ARCHITECTURE ---
  agenticSystem: {
    enabled: boolean;
    masterModel: string; // The "Brain" (Orchestrator)
    allowedModels: string[]; // List of models the brain can choose from
    modules: AgentModule[]; // List of specialized agents
  };
}

export interface AgentModule {
  id: string;
  name: string; // e.g. "Researcher", "Writer", "Coder"
  description: string;
  model: string; // e.g. "mistral-nemo", "gemma2"
  systemPrompt: string; // Specialized instructions
  capabilities: ('web_search' | 'vision' | 'file_system' | 'code_execution' | 'ftp')[];
  memoryContext: string[]; // Vector store IDs or file paths relevant to this module
}

export interface TaskSubtask {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    logs: string[];
    updatedAt: number;
    createdAt: number;
    subtasks?: TaskSubtask[];
    breakdown?: {
        generatedAt: number;
        modelRole: string;
        source: string;
    };
    overrideQualityGate?: boolean;
    priority?: 'low' | 'medium' | 'high';
    retryCount?: number;
    withinObjectives?: boolean;
    parentTaskId?: string;
}

export interface SupportHint {
    id: string;
    timestamp: number;
    taskId?: string;
    taskTitle?: string;
    model?: string;
    hint: string;
}

export interface AgentState {
    lastRun: number;
    lastHeartbeatAt?: number;
    currentAction: string;
    thoughtProcess: string;
    consecutiveLoops: number;
    userPriority?: boolean;
    userQueueLength?: number;
    userQueuePreview?: { id?: string; source: string; text: string }[];
    processingStage?: string;
    ollamaWaitStartedAt?: number;
  autonomyBackoffUntil?: number;
  autonomyFailureCount?: number;
  lastAutonomyError?: string;
  taskActionErrorCount?: number;
  lastTaskActionErrorAt?: number;
  lastAutorecoveryAt?: number;
  lastQualityAuditAt?: number;
  lastQualityAuditSummary?: string;
  lastQualityAuditAiSummary?: string;
  pendingQualityAudit?: boolean;
  supportHints?: SupportHint[];
  toolMemory?: { tool: string; key: string; output: string; ts: number }[];
  lastToolCacheClearedAt?: number;
  lastToolCacheClearReason?: string;
  lastSelfImproveAt?: number;
  lastSelfImproveReason?: string;
  lastSelfImproveTaskId?: string;
  modelStats?: Record<string, { attempts: number; successes: number; failures: number; ttfbTotalMs: number; ttfbCount: number; lastError: string; lastAt: number }>;
  modelStatsSeries?: { model: string; ts: number; ok: boolean; ttfbMs: number }[];
  cacheConfig?: {
    fileReadTtlMs: number;
    fileReadLimit: number;
    toolResultTtlMs: number;
    toolResultLimit: number;
    toolMemoryLimit: number;
  };
    pendingTaskApproval?: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      requestedAt: number;
      source: string;
    } | null;
}

export interface DatabaseSchema {
  chatHistory: ChatMessage[];
  tasks: Task[];
  agentState: AgentState;
  settings: SystemSettings;
  reasoningHistory: any[];
  vfs: any[];
  logs: SystemLog[];
  blogs: BlogPost[];
  memories: MemoryEntry[];
  gaiProfile?: any;
  gaiLearnings?: any[];
  notifications?: NotificationEntry[];
  installedApps: DynamicAppSchema[];
  desktopLayout: DesktopItem[];
  version: string;
}

export interface NotificationEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  title: string;
  message: string;
  meta?: any;
  read: boolean;
}

export interface AppContextType {
  windows: WindowState[];
  activeWindowId: string | null;
  apps: { id: string; config: any }[];
  openApp: (id: string, args?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  setTheme: (theme: SystemTheme) => void;
  setWallpaper: (url: string) => void;
  toggleHeartbeat: () => void;
  heartbeatActive: boolean;
  showModal: (type: ModalType, title: string, message: any, onConfirm?: any, onCancel?: any, inputValue?: string, actions?: ModalAction[]) => void;
  openProgressModal: (opts: { title: string; message?: any; value?: number | null; status?: string; details?: string[]; canCancel?: boolean; onCancel?: () => void }) => string;
  updateProgressModal: (id: string, patch: { title?: string; message?: any; value?: number | null; status?: string; details?: string[]; canCancel?: boolean }) => void;
  closeModal: () => void;
  handleContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  desktopLayout: DesktopItem[];
  setDesktopLayout: (layout: DesktopItem[]) => void;
  logout: () => void;
  toggleDesktop: () => void;
  toggleAppDrawer: () => void;
  closeAppDrawer: () => void;
  isAppDrawerOpen: boolean;
  activeAppMenu: { id: string; items: MenuItem[] } | null;
  setAppMenu: (menu: MenuItem[]) => void;
}

export interface MenuItem {
  label: string;
  action?: () => void;
  items?: MenuItem[];
  shortcut?: string;
  disabled?: boolean;
}
