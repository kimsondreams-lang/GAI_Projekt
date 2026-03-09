import React from 'react';
import { Terminal, BookOpen, Code, TrendingUp, Settings, Box, Zap, List, Calculator, FolderOpen, Globe, Activity, UploadCloud, FileEdit, Server, BarChart3, Brain } from 'lucide-react';
import { AppId, AppConfig } from '../types';

import { TerminalApp } from '../components/apps/TerminalApp';
import { BlogManager } from '../components/apps/BlogManager';
import { IncomeStrategist } from '../components/apps/IncomeStrategist';
import { CodeStudio } from '../components/apps/CodeStudio';
import { SettingsApp } from '../components/apps/SettingsApp';
import { FileManager } from '../components/apps/FileManager';
import { BrowserApp } from '../components/apps/BrowserApp';
import { TaskManager } from '../components/apps/TaskManager';
import { FTPClient } from '../components/apps/FTPClient';
import { TextEditor } from '../components/apps/TextEditor';
import { OllamaCenter } from '../components/apps/OllamaCenter';
import { SiteManager } from '../components/apps/SiteManager';
import { SEOAnalytics } from '../components/apps/SEOAnalytics';
import { GAIMemory } from '../components/apps/GAIMemory';
import { ModelStats } from '../components/apps/ModelStats';

import { AgentControl } from '../components/apps/AgentControl';

export const BUILTIN_APPS: { id: string; config: AppConfig }[] = [
    { id: AppId.TERMINAL, config: { title: 'Terminal', icon: <Terminal size={28} className="text-green-400" />, component: TerminalApp, multiInstance: false } },
    { id: AppId.AGENT_CONTROL, config: { title: 'Agent Control', icon: <Brain size={28} className="text-indigo-400" />, component: AgentControl, multiInstance: false } },
    { id: AppId.FILE_MANAGER, config: { title: 'Files', icon: <FolderOpen size={28} className="text-orange-400" />, component: FileManager, multiInstance: true } },
    { id: AppId.TEXT_EDITOR, config: { title: 'Text Editor', icon: <FileEdit size={28} className="text-gray-200" />, component: TextEditor, multiInstance: true } },
    { id: AppId.BROWSER, config: { title: 'Web', icon: <Globe size={28} className="text-cyan-400" />, component: BrowserApp, multiInstance: true } },
    { id: AppId.FTP_CLIENT, config: { title: 'FTP Client', icon: <UploadCloud size={28} className="text-pink-400" />, component: FTPClient, multiInstance: false } },
    { id: AppId.TASK_MANAGER, config: { title: 'Tasks', icon: <Activity size={28} className="text-blue-400" />, component: TaskManager, multiInstance: false } },
    { id: AppId.SEO_ANALYTICS, config: { title: 'SEO Analytics', icon: <BarChart3 size={28} className="text-cyan-300" />, component: SEOAnalytics, multiInstance: false } },
    { id: AppId.GAI_MEMORY, config: { title: 'GAI Memory', icon: <Brain size={28} className="text-blue-300" />, component: GAIMemory, multiInstance: false } },
    { id: AppId.MODEL_STATS, config: { title: 'Model Stats', icon: <BarChart3 size={28} className="text-emerald-300" />, component: ModelStats, multiInstance: false } },
    { id: AppId.OLLAMA_CENTER, config: { title: 'Ollama', icon: <Server size={28} className="text-blue-400" />, component: OllamaCenter, multiInstance: false } },
    { id: AppId.SITE_MANAGER, config: { title: 'Site', icon: <Server size={28} className="text-cyan-400" />, component: SiteManager, multiInstance: false } },
    { id: AppId.BLOG_MANAGER, config: { title: 'Technova', icon: <BookOpen size={28} className="text-blue-400" />, component: BlogManager, multiInstance: false } },
    { id: AppId.CODE_STUDIO, config: { title: 'Code Studio', icon: <Code size={28} className="text-purple-400" />, component: CodeStudio, multiInstance: false } },
    { id: AppId.INCOME_STRATEGIST, config: { title: 'Strategy', icon: <TrendingUp size={28} className="text-emerald-400" />, component: IncomeStrategist, multiInstance: false } },
    { id: AppId.SETTINGS, config: { title: 'Settings', icon: <Settings size={28} className="text-gray-400" />, component: SettingsApp, multiInstance: false } },
];

export const IconMap: Record<string, any> = { Box, Zap, List, Calculator, Terminal, Code };
