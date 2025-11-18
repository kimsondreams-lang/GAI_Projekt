import { useState, useEffect } from "react";
import { Settings, Key, Save, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    openai_api_key: "",
    anthropic_api_key: "",
    deepseek_api_key: "",
    // No Amazon key in the original state, but the form has it. Let's add it for consistency.
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
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      // Ensure all keys exist in state, even if not returned by API
      setSettings(prev => ({ ...prev, ...data.settings }));
    } catch (error) {
      console.error("Error fetching settings:", error);
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
        body: JSON.stringify({ settings }),
      });
      
      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: error.message });
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

  // This function is complex and unnecessary. 
  // The input's type="password" already handles obfuscation.
  // We will remove its usage and simplify the input fields.

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const ApiKeyInput = ({ id, label, value, onChange, onToggle, show }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neo-muted mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value || ""}
          onChange={onChange}
          className="neo-input w-full pr-10"
          placeholder={`Enter ${label}`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-neo-muted hover:text-neo-fg transition-colors"
          title={show ? "Hide key" : "Show key"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  const SettingToggle = ({ label, description, enabled, onToggle }) => (
    <div className="flex items-center justify-between p-3 neo-surface rounded-lg">
      <div>
        <label className="font-medium text-neo-fg">{label}</label>
        <p className="text-sm text-neo-muted">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neo-bg focus:ring-blue-500 ${
          enabled ? "bg-blue-600" : "bg-neo-muted/50"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const SettingInput = ({ label, description, value, onChange, ...props }) => (
     <div className="p-3 neo-surface rounded-lg">
      <label className="block text-sm font-medium text-neo-fg mb-1">{label}</label>
      <input
        value={value}
        onChange={onChange}
        className="neo-input w-full"
        {...props}
      />
      {description && <p className="text-xs text-neo-muted mt-2">{description}</p>}
    </div>
  );


  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-neo-surface">
        <div>
          <h1 className="text-3xl font-bold text-neo-fg flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-500" />
            System Settings
          </h1>
          <p className="text-neo-muted mt-1">Manage API keys, agent behavior, and system preferences.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="neo-btn"
            title="Refresh settings"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="neo-btn-primary flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </header>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* API Keys Section (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
            <div className="neo-card p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-neo-fg flex items-center gap-3 mb-6">
                    <Key className="w-6 h-6 text-blue-500" />
                    API Keys
                </h2>
                <div className="space-y-4">
                    <ApiKeyInput
                        id="openai_api_key"
                        label="OpenAI API Key"
                        value={settings.openai_api_key}
                        onChange={(e) => handleInputChange("openai_api_key", e.target.value)}
                        onToggle={() => toggleKeyVisibility("openai")}
                        show={showKeys.openai}
                    />
                    <ApiKeyInput
                        id="anthropic_api_key"
                        label="Anthropic API Key"
                        value={settings.anthropic_api_key}
                        onChange={(e) => handleInputChange("anthropic_api_key", e.target.value)}
                        onToggle={() => toggleKeyVisibility("anthropic")}
                        show={showKeys.anthropic}
                    />
                    <ApiKeyInput
                        id="deepseek_api_key"
                        label="DeepSeek API Key"
                        value={settings.deepseek_api_key}
                        onChange={(e) => handleInputChange("deepseek_api_key", e.target.value)}
                        onToggle={() => toggleKeyVisibility("deepseek")}
                        show={showKeys.deepseek}
                    />
                    <ApiKeyInput
                        id="amazon_api_key"
                        label="Amazon Bedrock Key"
                        value={settings.amazon_api_key}
                        onChange={(e) => handleInputChange("amazon_api_key", e.target.value)}
                        onToggle={() => toggleKeyVisibility("amazon")}
                        show={showKeys.amazon}
                    />
                </div>
            </div>
        </div>

        {/* System Settings Section (Right Columns) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="neo-card p-4 sm:p-6">
                 <h2 className="text-xl font-semibold text-neo-fg flex items-center gap-3 mb-6">
                    <Settings className="w-6 h-6 text-blue-500" />
                    Agent & System
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                        label="Debug Mode"
                        description="Enable verbose logging"
                        enabled={settings.debug_mode}
                        onToggle={() => handleInputChange("debug_mode", !settings.debug_mode)}
                    />
                    <SettingToggle
                        label="Analytics Tracking"
                        description="Allow usage analytics"
                        enabled={settings.analytics_tracking}
                        onToggle={() => handleInputChange("analytics_tracking", !settings.analytics_tracking)}
                    />
                    <SettingInput
                        label="Auto Refresh Interval (ms)"
                        description="Dashboard data refresh rate"
                        type="number"
                        min="1000"
                        max="60000"
                        step="1000"
                        value={settings.auto_refresh_interval}
                        onChange={(e) => handleInputChange("auto_refresh_interval", parseInt(e.target.value, 10))}
                    />
                    <SettingInput
                        label="Max Tasks per Cycle"
                        description="Agent's task execution limit"
                        type="number"
                        min="1"
                        max="100"
                        value={settings.max_tasks_per_cycle}
                        onChange={(e) => handleInputChange("max_tasks_per_cycle", parseInt(e.target.value, 10))}
                    />
                    <div className="md:col-span-2">
                        <SettingInput
                            label="Daily Budget Limit (USD)"
                            description="Maximum daily spend for API calls"
                            type="number"
                            min="0.1"
                            max="1000"
                            step="0.1"
                            value={settings.budget_limit}
                            onChange={(e) => handleInputChange("budget_limit", parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
