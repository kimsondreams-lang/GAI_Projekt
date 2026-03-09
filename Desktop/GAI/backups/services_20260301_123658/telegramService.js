import { db } from './memoryService';
export const telegramService = {
    isEnabled: () => {
        const { telegramConfig } = db.getSettings();
        return telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId;
    },
    sendMessage: async (text) => {
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
        }
        catch (e) {
            console.error("Telegram Network Error", e);
        }
    }
};
