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

  // Pobierz status systemu co 5 sekund
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
        console.error("Błąd pobierania statusu systemu:", error);
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
          <div className="space-y-6">
            <AgentControl status={agentStatus} onStatusChange={setAgentStatus} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Tasks" value={systemStats.totalTasks} color="blue" />
              <StatCard title="Active Tasks" value={systemStats.activeTasks} color="green" />
              <StatCard title="Completed" value={systemStats.completedTasks} color="purple" />
              <StatCard title="Total Cost" value={`$${systemStats.totalCost.toFixed(4)}`} color="orange" />
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
        return <div>Wybierz zakładkę</div>;
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Bot className="h-10 w-10 text-blue-600 drop-shadow-lg" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    agentStatus === "running" ? "bg-green-500 animate-pulse" : 
                    agentStatus === "starting" ? "bg-yellow-500 animate-pulse" : 
                    agentStatus === "error" ? "bg-red-500" : "bg-gray-400"
                  }`}></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GAI Agent
                  </h1>
                  <p className="text-sm text-gray-500">Autonomous AI Control Panel</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden md:flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium capitalize text-gray-700">{agentStatus}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Uptime:</span>
                    <span className="font-medium text-gray-700">{systemStats.uptime}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    agentStatus === "running" ? "bg-green-500 animate-pulse" : 
                    agentStatus === "starting" ? "bg-yellow-500 animate-pulse" : 
                    agentStatus === "error" ? "bg-red-500" : "bg-gray-400"
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{agentStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-1 bg-white/60 backdrop-blur-sm p-1 rounded-xl border">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-white text-blue-600 shadow-md transform scale-105"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border shadow-lg">
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Pomocniczy komponent dla statystyk
function StatCard({ title, value, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
