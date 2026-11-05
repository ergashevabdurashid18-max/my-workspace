const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// Render port muammosini hal qilish uchun Express server
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('JARVIS Bot is running!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Supabase ulanishi
const SUPABASE_URL = 'https://lttkipilvjrxkjtoftxx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vtGRgSmG3fI3M1Z296m1Q_wS-ghH_W';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOKEN = '9245306269:AAFyWBN6Z1iPCEYpNWv6B3MTNF3gMfSbPx8';
const bot = new TelegramBot(TOKEN, { polling: true });

let activeChatIds = new Set();

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    activeChatIds.add(chatId);

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "🧠 Ikkinchi Miya (Qaydlar)" }, { text: "📁 Portfolio (Loyihalar)" }],
                [{ text: "🔥 Odatlar va Vaqtli Eslatmalar" }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, `🤖 **JARVIS Bot faollashdi!** Saytdagi barcha ma'lumotlar real vaqtda sinxron ishlaydi.`, { parse_mode: 'Markdown', ...options });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    activeChatIds.add(chatId);
    const text = msg.text;

    if (text === "🧠 Ikkinchi Miya (Qaydlar)") {
        const { data } = await supabase.from('notes').select('*');
        if (!data || data.length === 0) return bot.sendMessage(chatId, "🧠 Qaydlar topilmadi. Saytdan yangi qayd qo'shing.");
        let res = "🧠 **Ikkinchi Miya (Qaydlar):**\n\n";
        data.forEach((n, i) => res += `${i+1}. *${n.title}*\n${n.content}\n\n`);
        bot.sendMessage(chatId, res, { parse_mode: 'Markdown' });
    }
    else if (text === "📁 Portfolio (Loyihalar)") {
        const { data } = await supabase.from('projects').select('*');
        if (!data || data.length === 0) return bot.sendMessage(chatId, "📁 Portfolio loyihalari topilmadi. Saytdan loyiha qo'shing.");
        let res = "📁 **Sizning Loyihalaringiz (Portfolio):**\n\n";
        data.forEach((p, i) => res += `${i+1}. *${p.title}* - [Havola](${p.url})\n`);
        bot.sendMessage(chatId, res, { parse_mode: 'Markdown' });
    }
    else if (text === "🔥 Odatlar va Vaqtli Eslatmalar") {
        const { data } = await supabase.from('habits').select('*');
        if (!data || data.length === 0) return bot.sendMessage(chatId, "🔥 Odatlar mavjud emas.");
        let res = "🔥 **Sizning Odatlaringiz va Vaqtlari:**\n\n";
        data.forEach((h, i) => res += `${i+1}. *${h.title}* ⏰ Vaqti: ${h.time}\n`);
        bot.sendMessage(chatId, res, { parse_mode: 'Markdown' });
    }
});

// 1. Har kuni ertalab 07:00 da eslatma qo'shish haqida xabar
cron.schedule('0 7 * * *', () => {
    const text = "🌅 **Xayrli tong! Bugungi yangi rejalaringiz va eslatmalaringizni saytga kirib qo'shishni unutmang!** 🚀";
    activeChatIds.forEach(id => bot.sendMessage(id, text, { parse_mode: 'Markdown' }).catch(() => {}));
}, { timezone: "Asia/Tashkent" });

// 2. Har 1 soatda ikkinchi miya qaydlarini eslatib turish
cron.schedule('0 * * * *', async () => {
    const { data } = await supabase.from('notes').select('*');
    if (data && data.length > 0) {
        let text = "⏰ **JARVIS • Ikkinchi Miya Eslatmasi (Har 1 soatlik):**\n\n";
        data.slice(-3).forEach(n => text += `📌 *${n.title}*\n${n.content}\n\n`);
        activeChatIds.forEach(id => bot.sendMessage(id, text, { parse_mode: 'Markdown' }).catch(() => {}));
    }
});

// 3. Odatlar vaqtiga qarab xabar yuborish (masalan: 17:30 da)
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    const currentTime = String(tashkentTime.getHours()).padStart(2, '0') + ':' + String(tashkentTime.getMinutes()).padStart(2, '0');
    
    const { data } = await supabase.from('habits').select('*');
    if (data && data.length > 0) {
        data.forEach(h => {
            if (h.time === currentTime) {
                const text = `⏰ **Vaqt bo'ldi! Odatni bajarish vaqti keldi:**\n\n🔥 *${h.title}* (Vaqti: ${h.time})`;
                activeChatIds.forEach(id => bot.sendMessage(id, text, { parse_mode: 'Markdown' }).catch(() => {}));
            }
        });
    }
}, { timezone: "Asia/Tashkent" });

console.log("JARVIS Telegram boti va barcha vaqtli eslatmalar tizimi ishga tushdi...");