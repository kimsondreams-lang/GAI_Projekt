import { useState, useEffect } from "react";
import Head from "next/head";
import ChatInterface from "../components/ChatInterface";
import TaskDashboard from "../components/TaskDashboard";
import AnalyticsPanel from "../components/AnalyticsPanel";
import PublicationsManager from "../components/PublicationsManager";
import SettingsPanel from "../components/SettingsPanel";
import AgentControl from "../components/AgentControl";
import { Bot, BarChart3, FileText, Settings, Cpu, MessageSquare } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [agentStatus, setAgentStatus] = useState("stopped");
  const [systemStats, setSystemStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalCost: 0,
    uptime: "0h 0m"
  });

  // Fetch system status every 5 seconds
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch("/api/system/status");
        const data = await response.json();
        setAgentStatus(data.agent_status || "stopped");
        setSystemStats({
          totalTasks: data.total_tasks || 0,
          activeTasks: data.active_tasks || 0,
          completedTasks: data.completed_tasks || 0,
          totalCost: data.total_cost || 0,
          uptime: data.uptime || "0h 0m"
        });
      } catch (error) {
        console.error("Error fetching system status:", error);
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: Cpu },
    { id: "publications", label: "Publications", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8">
            <AgentControl status={agentStatus} onStatusChange={setAgentStatus} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Tasks" value={systemStats.totalTasks} />
              <StatCard title="Active Tasks" value={systemStats.activeTasks} />
              <StatCard title="Completed" value={systemStats.completedTasks} />
              <StatCard title="Total Cost" value={`$${systemStats.totalCost.toFixed(4)}`} />
            </div>
            <TaskDashboard compact={true} />
          </div>
        );
      case "chat":
        return <ChatInterface />;
      case "tasks":
        return <TaskDashboard compact={false} />;
      case "publications":
        return <PublicationsManager />;
      case "analytics":
        return <AnalyticsPanel />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <>
      <Head>
        <title>GAI Agent Dashboard</title>
        <meta name="description" content="Autonomous AI Agent Control Panel" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neo text-neo-fg">
        {/* Header */}
        <header className="neo-surface backdrop-blur-lg border-b border-border sticky top-0 z-50">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-4">
                <div className="relative p-2 rounded-full neo-pressed">
                  <Bot className="h-8 w-8 text-neo-accent" />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                    agentStatus === "running" ? "bg-green-500 animate-pulse" : 
                    agentStatus === "starting" ? "bg-yellow-500 animate-pulse" : 
                    agentStatus === "error" ? "bg-red-500" : "bg-gray-400"
                  }`}></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neo-fg">
                    GAI Agent
                  </h1>
                  <p className="text-xs text-neo-muted">Autonomous AI Control Panel</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden md:flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-neo-muted">Status:</span>
                    <span className="font-semibold capitalize text-neo-fg">{agentStatus}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-neo-muted">Uptime:</span>
                    <span className="font-semibold text-neo-fg">{systemStats.uptime}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 neo-badge">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    agentStatus === "running" ? "bg-green-400 animate-pulse" : 
                    agentStatus === "starting" ? "bg-yellow-400 animate-pulse" : 
                    agentStatus === "error" ? "bg-red-400" : "bg-gray-500"
                  }`}></div>
                  <span className="text-sm font-semibold capitalize">{agentStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-2 neo-card p-1.5 rounded-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 neo-btn rounded-full transition-all duration-300 ${
                      activeTab === tab.id
                        ? "neo-btn-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="neo-card p-6">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </>
  );
}

// Helper component for stats
function StatCard({ title, value }) {
  return (
    <div className="neo-surface p-5 rounded-lg">
      <div className="text-sm font-medium text-neo-muted">{title}</div>
      <div className="text-3xl font-bold mt-1 text-neo-fg">{value}</div>
    </div>
  );
}
