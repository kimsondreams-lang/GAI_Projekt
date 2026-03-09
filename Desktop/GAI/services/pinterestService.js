const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../config/social_media_config.json");
const LOGS_PATH = path.join(__dirname, "../data/social_media/logs");

if (!fs.existsSync(LOGS_PATH)) fs.mkdirSync(LOGS_PATH, { recursive: true });

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    console.error("Failed to load config:", e.message);
    return { pinterest: {} };
  }
}

function logMessage(level, message) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(LOGS_PATH, "pinterest_" + dateStr + ".log");
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
  console.log("[" + level + "] " + message);
}

async function createPin(title, description, imageUrl, link) {
  const config = loadConfig();
  const { api_key, board_id } = config.pinterest || {};
  
  if (!api_key || !board_id) {
    logMessage("warn", "Pinterest not configured - missing API key or board ID");
    return { success: false, error: "Not configured" };
  }
  
  try {
    const response = await axios.post(
      "https://api.pinterest.com/v5/boards/" + board_id + "/pins",
      {
        board_id: board_id,
        title: title,
        description: description,
        media_source: {
          source_type: "image_url",
          url: imageUrl
        },
        link: link
      },
      {
        headers: {
          "Authorization": "Bearer " + api_key,
          "Content-Type": "application/json"
        }
      }
    );
    
    logMessage("info", "Pin created successfully: " + title);
    return { success: true, platform: "pinterest", pinId: response.data.id };
  } catch (error) {
    logMessage("error", "Pinterest API Error: " + error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadConfig,
  logMessage,
  createPin
};
