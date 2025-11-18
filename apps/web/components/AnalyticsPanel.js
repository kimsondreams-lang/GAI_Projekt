'use client';
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Clock, Target, BarChart3, RefreshCw, Calendar, Users, MousePointerClick, AlertTriangle, FileText, Globe } from "lucide-react";

const StatCard = ({ icon, title, value, change, changeType }) => {
    const Icon = icon;
    const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

    return (
        <div className="neo-surface p-4 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-neo-muted">{title}</p>
                <Icon className="h-5 w-5 text-neo-muted" />
            </div>
            <div>
                <p className="text-2xl font-bold text-neo-fg">{value}</p>
                {change && (
                    <p className={`text-xs ${changeColor}`}>{change}</p>
                )}
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="neo-card p-3 rounded-lg shadow-lg">
                <p className="label text-sm font-semibold text-neo-fg">{`${label}`}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="text-xs">{`${p.name}: ${p.value}`}</p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPanel() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics/dashboard?time_range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch analytics data.");
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError(error.message);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="neo-card p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold text-neo-fg">An Error Occurred</h3>
            <p className="text-neo-muted mt-2">{error}</p>
            <button onClick={handleRefresh} className="neo-btn neo-btn-primary mt-6">Try Again</button>
        </div>
    );
  }

  const overview = analyticsData?.dashboard?.overview || {};
  const timeSeries = analyticsData?.dashboard?.time_series || [];
  const topContent = analyticsData?.dashboard?.top_content || [];
  const trafficSources = analyticsData?.dashboard?.traffic_sources || {};

  const chartData = timeSeries.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Views: item.page_views || 0,
    Revenue: item.revenue || 0,
    Sessions: item.sessions || 0
  }));

  const trafficData = Object.entries(trafficSources).map(([source, data]) => ({
    name: source.charAt(0).toUpperCase() + source.slice(1),
    value: data.visits || 0,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neo-surface">
        <div>
            <h1 className="text-3xl font-bold text-neo-fg flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                Analytics Dashboard
            </h1>
            <p className="text-neo-muted mt-1">Performance and engagement metrics overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neo-muted pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="neo-input pl-9 pr-8 appearance-none"
            >
              <option value="1d">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="neo-btn neo-btn-primary"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} title="Total Page Views" value={formatNumber(overview.total_page_views)} />
        <StatCard icon={DollarSign} title="Total Revenue" value={formatCurrency(overview.total_revenue)} />
        <StatCard icon={Clock} title="Avg. Session" value={`${Math.round(overview.avg_session_duration || 0)}s`} />
        <StatCard icon={MousePointerClick} title="Bounce Rate" value={`${((overview.bounce_rate || 0) * 100).toFixed(1)}%`} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Page Views & Revenue Trend */}
        <div className="neo-card p-4 sm:p-6 lg:col-span-3">
          <h3 className="text-lg font-semibold text-neo-fg mb-4">Views & Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--neo-surface)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: 'var(--neo-muted)' }} stroke="var(--neo-surface)" fontSize={12} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--neo-muted)' }} stroke="var(--neo-surface)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--neo-muted)' }} stroke="var(--neo-surface)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="Views" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Sources */}
        <div className="neo-card p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-neo-fg mb-4">Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={trafficData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {trafficData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Content */}
      <div className="neo-card">
        <header className="p-4 sm:p-6 border-b border-neo-surface">
          <h3 className="text-lg font-semibold text-neo-fg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            Top Performing Content
          </h3>
        </header>
        <div className="divide-y divide-neo-surface">
          {topContent.length > 0 ? topContent.slice(0, 10).map((content, index) => (
            <div key={content.url} className="p-4 hover:bg-neo-surface/50 transition-colors">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-6 flex items-center gap-4 min-w-0">
                    <span className="text-sm font-bold text-neo-muted">#{index + 1}</span>
                    <div className="min-w-0">
                        <h4 className="text-sm font-medium text-neo-fg truncate" title={content.title || content.url}>
                            {content.title || content.url}
                        </h4>
                        <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-xs text-neo-muted hover:text-purple-400 truncate flex items-center gap-1.5">
                            <Globe size={12} /> {content.url}
                        </a>
                    </div>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                    <div className="font-medium text-neo-fg text-sm">{formatNumber(content.page_views || 0)}</div>
                    <div className="text-xs text-neo-muted">Views</div>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                    <div className="font-medium text-neo-fg text-sm">{formatCurrency(content.revenue || 0)}</div>
                    <div className="text-xs text-neo-muted">Revenue</div>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                    <div className="font-medium text-neo-fg text-sm">{((content.engagement_rate || 0) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-neo-muted">Engagement</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-neo-muted">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold">No content data available</p>
              <p className="text-sm mt-1">Start publishing content to see analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
