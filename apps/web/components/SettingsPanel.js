import { useState, useEffect } from "react";
import { Settings, Key, Save, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff, EyeOff as EyeOffIcon } from "lucide-react";

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    openai_api_key: "",
    anthropic_api_key: "",
    deepseek_api_key: "",
    amazon_api_key: "",
    analytics_tracking: true,
    auto_refresh_interval: 5000,
    max_tasks_per_cycle: 10,
    budget_limit: 10.0,
    debug_mode: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    deepseek: false,
    amazon: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSettings(data.settings || settings);
    } catch (error) {
      console.error("Błąd pobierania ustawień:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      });
      
      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Błąd zapisywania ustawień:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchSettings();
    setMessage({ type: "success", text: "Settings refreshed" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleKeyVisibility = (key) => {
    setShowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatApiKey = (key) => {
    if (!key) return "";
    if (showKeys[Object.keys(showKeys).find(k => settings[`${k}_api_key`] === key)] || key.length < 8) {
      return key;
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neo-fg">System Settings</h2>
          <p className="text-neo-muted">Configure API keys and system preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="neo-btn neo-btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="neo-btn neo-btn-primary flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`neo-card p-4 flex items-center space-x-2 ${
          message.type === "success" ? "text-green-400" : "text-red-400"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* API Keys Section */}
      <div className="neo-card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Key className="h-5 w-5 text-neo-muted" />
          <h3 className="text-lg font-semibold text-neo-fg">API Keys</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              OpenAI API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showKeys.openai ? "text" : "password"}
                value={formatApiKey(settings.openai_api_key)}
                onChange={(e) => handleInputChange("openai_api_key", e.target.value)}
                className="neo-input flex-1"
                placeholder="sk-..."
              />
              <button
                onClick={() => toggleKeyVisibility("openai")}
                className="neo-btn neo-btn-secondary p-2"
                title={showKeys.openai ? "Hide key" : "Show key"}
              >
                {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              Anthropic API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showKeys.anthropic ? "text" : "password"}
                value={formatApiKey(settings.anthropic_api_key)}
                onChange={(e) => handleInputChange("anthropic_api_key", e.target.value)}
                className="neo-input flex-1"
                placeholder="sk-ant-..."
              />
              <button
                onClick={() => toggleKeyVisibility("anthropic")}
                className="neo-btn neo-btn-secondary p-2"
                title={showKeys.anthropic ? "Hide key" : "Show key"}
              >
                {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              DeepSeek API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showKeys.deepseek ? "text" : "password"}
                value={formatApiKey(settings.deepseek_api_key)}
                onChange={(e) => handleInputChange("deepseek_api_key", e.target.value)}
                className="neo-input flex-1"
                placeholder="sk-..."
              />
              <button
                onClick={() => toggleKeyVisibility("deepseek")}
                className="neo-btn neo-btn-secondary p-2"
                title={showKeys.deepseek ? "Hide key" : "Show key"}
              >
                {showKeys.deepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              Amazon API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showKeys.amazon ? "text" : "password"}
                value={formatApiKey(settings.amazon_api_key)}
                onChange={(e) => handleInputChange("amazon_api_key", e.target.value)}
                className="neo-input flex-1"
                placeholder="AKIA..."
              />
              <button
                onClick={() => toggleKeyVisibility("amazon")}
                className="neo-btn neo-btn-secondary p-2"
                title={showKeys.amazon ? "Hide key" : "Show key"}
              >
                {showKeys.amazon ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings Section */}
      <div className="neo-card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="h-5 w-5 text-neo-muted" />
          <h3 className="text-lg font-semibold text-neo-fg">System Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-neo-muted">Analytics Tracking</label>
              <p className="text-sm text-neo-muted">Enable anonymous usage analytics</p>
            </div>
            <button
              onClick={() => handleInputChange("analytics_tracking", !settings.analytics_tracking)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.analytics_tracking ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.analytics_tracking ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              Auto Refresh Interval (ms)
            </label>
            <input
              type="number"
              value={settings.auto_refresh_interval}
              onChange={(e) => handleInputChange("auto_refresh_interval", parseInt(e.target.value) || 5000)}
              className="neo-input w-full"
              min="1000"
              max="60000"
              step="1000"
            />
            <p className="text-sm text-neo-muted mt-1">How often to refresh dashboard data</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              Max Tasks per Cycle
            </label>
            <input
              type="number"
              value={settings.max_tasks_per_cycle}
              onChange={(e) => handleInputChange("max_tasks_per_cycle", parseInt(e.target.value) || 10)}
              className="neo-input w-full"
              min="1"
              max="100"
            />
            <p className="text-sm text-neo-muted mt-1">Maximum number of tasks per agent cycle</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neo-muted mb-2">
              Budget Limit (USD)
            </label>
            <input
              type="number"
              value={settings.budget_limit}
              onChange={(e) => handleInputChange("budget_limit", parseFloat(e.target.value) || 10.0)}
              className="neo-input w-full"
              min="0.1"
              max="1000"
              step="0.1"
            />
            <p className="text-sm text-neo-muted mt-1">Daily budget limit for API calls</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-neo-muted">Debug Mode</label>
              <p className="text-sm text-neo-muted">Enable detailed logging and debugging</p>
            </div>
            <button
              onClick={() => handleInputChange("debug_mode", !settings.debug_mode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.debug_mode ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.debug_mode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
