const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
// السماح للمنصة مالتك بتشغيل الفيديوهات
app.use(cors()); 

// معلوماتك الخاصة
const apiId = 32614591;
const apiHash = 'f2c267e4d7c2e6a1c1fca3589a729eb8';
const botToken = '8856314868:AAHoQbJXMpJdqSRXsfFArNwEKWTlAJekmhE';

// إنشاء الاتصال
const stringSession = new StringSession('');
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// تشغيل البوت وربطه بالسيرفر
(async () => {
    console.log('جاري الاتصال بالتلكرام...');
    await client.start({ botAuthToken: botToken });
    console.log('تم الاتصال بنجاح! البوت جاهز لسحب المحاضرات.');
})();

app.get('/', (req, res) => {
    res.send('سيرفر المحاضرات شغال ومربوط بالبوت 100%!');
});

// مسار سحب وبث الفيديوهات
app.get('/video', async (req, res) => {
    try {
        const channelId = req.query.c; // معرف القناة
        const messageId = parseInt(req.query.m); // رقم رسالة الفيديو

        if (!channelId || !messageId) {
            return res.status(400).send('يرجى توفير معرف القناة ورقم الرسالة');
        }

        // جلب رسالة الفيديو من القناة
        const messages = await client.getMessages(channelId, { ids: [messageId] });
        const message = messages[0];

        if (!message || !message.media || !message.media.document) {
            return res.status(404).send('الفيديو غير موجود أو الرسالة لا تحتوي على فيديو');
        }

        const fileSize = Number(message.media.document.size);
        const range = req.headers.range;

        // تهيئة البث كأجزاء (Chunks) حتى يشتغل داخل مشغل HTML بدون تقطيع
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            });

            const stream = client.iterDownload({
                file: message.media,
                offset: start,
                limit: chunksize,
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            }); 
            
            const stream = client.iterDownload({
                file: message.media,
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ أثناء جلب الفيديو من التلكرام');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
