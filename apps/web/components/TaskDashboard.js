'use client';
import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock, CheckCircle, XCircle, AlertCircle, Loader2, BarChart3, Filter, List, LayoutGrid, ChevronDown } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, colorClass }) => (
  <div className="neo-surface p-4 rounded-lg flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}/20`}>
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
    <div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-neo-muted font-medium">{label}</div>
    </div>
  </div>
);

const TaskItem = ({ task, getStatusVariant, getPriorityVariant, formatCost, formatDuration }) => (
    <div className="p-4 neo-surface rounded-lg transition-shadow hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-md font-semibold text-neo-fg truncate" title={task.title}>
                        {task.title}
                    </h3>
                    <span className={`neo-badge ${getStatusVariant(task.status)}`}>
                        {task.status}
                    </span>
                    <span className={`neo-badge ${getPriorityVariant(task.priority)}`}>
                        {task.priority}
                    </span>
                </div>
                <p className="text-sm text-neo-muted mb-3">{task.description}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neo-muted">
                    <div title="Task Type"><strong>Type:</strong> {task.type}</div>
                    <div title="Estimated Cost"><strong>Cost:</strong> {formatCost(task.cost_usd)}</div>
                    <div title="Execution Duration"><strong>Duration:</strong> {formatDuration(task.execution_time_seconds)}</div>
                    <div title="Creation Date"><strong>Created:</strong> {new Date(task.created_at).toLocaleDateString()}</div>
                    {task.retry_count > 0 && <div className="text-orange-400"><strong>Retries:</strong> {task.retry_count}</div>}
                </div>
            </div>
            <button className="neo-btn text-xs">
                Details
            </button>
        </div>
    </div>
);


export default function TaskDashboard({ compact = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  useEffect(() => {
    fetchTasks();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchTasks, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: "neo-badge-warning",
      running: "neo-badge-info",
      completed: "neo-badge-success",
      failed: "neo-badge-danger",
      cancelled: "neo-badge-warning"
    };
    return variants[status] || "neo-badge-warning";
  };

  const getPriorityVariant = (priority) => {
    const variants = {
      critical: "neo-badge-danger",
      high: "neo-badge-warning",
      medium: "neo-badge-info",
      low: "neo-badge-success"
    };
    return variants[priority] || "neo-badge-info";
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    return task.status === filter;
  }).sort((a, b) => {
    if (sortBy === "created_at") {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === "priority") {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    } else if (sortBy === "cost") {
      return (b.cost_usd || 0) - (a.cost_usd || 0);
    }
    return 0;
  });

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    running: tasks.filter(t => t.status === "running").length,
    completed: tasks.filter(t => t.status === "completed").length,
    failed: tasks.filter(t => t.status === "failed" || t.status === "cancelled").length
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "N/A";
    if (seconds < 1) return `<1s`;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatCost = (cost) => {
    return cost ? `$${cost.toFixed(4)}` : "$0.0000";
  };

  // Compact view is not needed anymore with the new design.
  // The main view will be responsive and adapt to different container sizes.
  if (compact) {
    // We can return a simplified version or just the full component.
    // For now, let's just render the full component regardless of the compact prop.
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neo-surface">
        <div>
            <h1 className="text-3xl font-bold text-neo-fg flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-500" />
                Task Dashboard
            </h1>
            <p className="text-neo-muted mt-1">Monitor and manage autonomous agent tasks.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`neo-btn text-sm ${autoRefresh ? 'neo-btn-primary' : ''}`}
                title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
            >
                <RotateCcw className={`w-4 h-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
                <span>{autoRefresh ? "ON" : "OFF"}</span>
            </button>
            <button
                onClick={fetchTasks}
                className="neo-btn"
                title="Force refresh tasks"
            >
                <RotateCcw className="h-5 w-5" />
            </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="Total Tasks" value={taskStats.total} colorClass="text-blue-500" />
        <StatCard icon={Loader2} label="Running" value={taskStats.running} colorClass="text-yellow-500" />
        <StatCard icon={CheckCircle} label="Completed" value={taskStats.completed} colorClass="text-green-500" />
        <StatCard icon={XCircle} label="Failed" value={taskStats.failed} colorClass="text-red-500" />
      </div>

      {/* Filters & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 neo-surface rounded-lg">
        <div className="flex items-center gap-2">
            <div className="relative">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="neo-input appearance-none pl-3 pr-8"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neo-muted" />
            </div>
            <div className="relative">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="neo-input appearance-none pl-3 pr-8"
                >
                    <option value="created_at">Sort by Date</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="cost">Sort by Cost</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neo-muted" />
            </div>
        </div>
        <div className="flex items-center gap-1 p-1 neo-pressed rounded-lg">
            <button onClick={() => setViewMode('list')} className={`neo-btn-sm ${viewMode === 'list' ? 'neo-btn-primary' : ''}`} title="List View">
                <List className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`neo-btn-sm ${viewMode === 'grid' ? 'neo-btn-primary' : ''}`} title="Grid View">
                <LayoutGrid className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Tasks List/Grid */}
      <div className="neo-card p-2 sm:p-4">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-neo-muted">Loading tasks...</p>
          </div>
        ) : (
          <>
            {filteredTasks.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                    {filteredTasks.map((task) => (
                        <TaskItem 
                            key={task.id} 
                            task={task}
                            getStatusVariant={getStatusVariant}
                            getPriorityVariant={getPriorityVariant}
                            formatCost={formatCost}
                            formatDuration={formatDuration}
                        />
                    ))}
                </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-neo-fg">No Tasks Found</h3>
                <p className="text-neo-muted mt-2">
                  {filter !== "all" ? `No tasks match the filter "${filter}".` : "The agent hasn't created any tasks yet."}
                </p>
                <button onClick={() => setFilter('all')} className="mt-4 neo-btn-primary">
                    Clear Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
