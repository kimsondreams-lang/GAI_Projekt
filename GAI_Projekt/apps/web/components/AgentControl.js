import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Settings, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";

export default function AgentControl({ status, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [agentStats, setAgentStats] = useState({
    wakeCycles: 0,
    totalTasks: 0,
    totalCost: 0,
    successRate: 0,
    lastCycle: null,
    uptime: "0h 0m"
  });

  useEffect(() => {
    fetchAgentStats();
    const interval = setInterval(fetchAgentStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentStats = async () => {
    try {
      const response = await fetch("/api/analytics/agent/history");
      const data = await response.json();
      setAgentStats({
        wakeCycles: data.wake_cycles || 0,
        totalTasks: data.total_tasks || 0,
        totalCost: data.total_cost || 0,
        successRate: (data.success_rate || 0) * 100,
        lastCycle: data.last_cycle,
        uptime: data.uptime || "0h 0m"
      });
    } catch (error) {
      console.error("Błąd pobierania statystyk agenta:", error);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        onStatusChange("running");
        fetchAgentStats();
      } else {
        throw new Error("Błąd uruchamiania agenta");
      }
    } catch (error) {
      console.error("Błąd uruchamiania agenta:", error);
      alert("Nie udało się uruchomić agenta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        onStatusChange("stopped");
        fetchAgentStats();
      } else {
        throw new Error("Błąd zatrzymywania agenta");
      }
    } catch (error) {
      console.error("Błąd zatrzymywania agenta:", error);
      alert("Nie udało się zatrzymać agenta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      await handleStop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await handleStart();
    } catch (error) {
      console.error("Błąd restartowania agenta:", error);
      alert("Nie udało się zrestartować agenta");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800 border-green-200";
      case "starting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "stopping":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <CheckCircle className="h-5 w-5" />;
      case "starting":
      case "stopping":
        return <Clock className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const isAgentRunning = status === "running";
  const isAgentStopped = status === "stopped";
  const isAgentProcessing = status === "starting" || status === "stopping";

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Agent Control</h3>
          <p className="text-sm text-gray-600">Manage autonomous agent operations</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={handleStart}
          disabled={isAgentRunning || isAgentProcessing || isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-4 w-4" />
          <span>Start Agent</span>
        </button>

        <button
          onClick={handleStop}
          disabled={isAgentStopped || isAgentProcessing || isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Pause className="h-4 w-4" />
          <span>Stop Agent</span>
        </button>

        <button
          onClick={handleRestart}
          disabled={isAgentProcessing || isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Restart</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Wake Cycles</span>
            <Zap className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{agentStats.wakeCycles}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Tasks</span>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{agentStats.totalTasks}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Cost</span>
            <div className="h-4 w-4 bg-gray-400 rounded-full"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">${agentStats.totalCost.toFixed(4)}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{agentStats.successRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Additional Info */}
      {agentStats.lastCycle && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Last cycle: {agentStats.lastCycle} • Uptime: {agentStats.uptime}
            </span>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-sm text-yellow-800">Processing agent operation...</span>
          </div>
        </div>
      )}
    </div>
  );
}