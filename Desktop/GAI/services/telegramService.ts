import { db } from './memoryService.js';

let pollTimeout: NodeJS.Timeout | null = null;
let lastUpdateId = 0;

export const telegramService = {
    
    isEnabled: () => {
        const { telegramConfig } = db.getSettings();
        return telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId;
    },

    sendMessage: async (text: string) => {
        const { telegramConfig } = db.getSettings();
        
        if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
            console.warn("Telegram not configured");
            return;
        }

        const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegramConfig.chatId,
                    text: `[GAI OS]: ${text}`,
                    parse_mode: 'Markdown'
                })
            });

            if (!response.ok) {
                console.error("Telegram API Error", await response.text());
            }
        } catch (e) {
            console.error("Telegram Network Error", e);
        }
    },

    startPolling: async () => {
        const { telegramConfig } = db.getSettings();
        
        if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
            console.log("[Telegram] Polling not configured, skipping");
            return;
        }

        console.log("[Telegram] Starting poll loop...");
        
        const poll = async () => {
            try {
                const url = `https://api.telegram.org/bot${telegramConfig.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    console.error("[Telegram] Poll error:", await response.text());
                    pollTimeout = setTimeout(poll, 5000);
                    return;
                }

                const data = await response.json();
                
                if (data.ok && data.result && data.result.length > 0) {
                    for (const update of data.result) {
                        lastUpdateId = update.update_id;
                        
                        if (update.message && update.message.chat.id.toString() === telegramConfig.chatId) {
                            const userMessage = update.message.text;
                            console.log("[Telegram] Received:", userMessage);
                            
                            // Forward message to GAI OS for processing
                            // This will be handled by the main autonomy loop
                            await telegramService.sendMessage(`Received: ${userMessage}`);
                        }
                    }
                }
                
                pollTimeout = setTimeout(poll, 1000);
            } catch (e) {
                console.error("[Telegram] Poll exception:", e);
                pollTimeout = setTimeout(poll, 5000);
            }
        };
        
        poll();
    },

    stopPolling: () => {
        if (pollTimeout) {
            clearTimeout(pollTimeout);
            pollTimeout = null;
            console.log("[Telegram] Polling stopped");
        }
    }
};