const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');

const app = express();
app.use(cors()); 

const apiId = 32514591;
const apiHash = '82e267e4d7ca66a1e1fce35896729eb8';
const botToken = '8856314868:AAHoQbJXMpJdqSRXsfFArNwEKWTlAJekmhE';

const stringSession = new StringSession('');
// تعطيل WebSockets للاعتماد على اتصال TCP المباشر الأسرع
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: false, 
});

(async () => {
    console.log('جاري الاتصال بالتلكرام...');
    await client.start({ botAuthToken: botToken });
    console.log('تم الاتصال بنجاح! البوت جاهز.');
})();

app.get('/', (req, res) => {
    res.send('سيرفر المحاضرات شغال بأقصى سرعة!');
});

app.get('/video', async (req, res) => {
    try {
        const fullLink = req.query.link; 
        if (!fullLink) return res.status(400).send('يرجى توفير رابط التلكرام');

        const parts = fullLink.split('/');
        const messageId = parseInt(parts[parts.length - 1]); 
        const channelId = parseInt('-100' + parts[parts.length - 2]); 

        const messages = await client.getMessages(channelId, { ids: [messageId] });
        const message = messages[0];

        if (!message || !message.media || !message.media.document) {
            return res.status(404).send('الفيديو غير موجود');
        }

        const fileSize = Number(message.media.document.size);
        const range = req.headers.range;
        const CHUNK_SIZE = 1048576; // الحد الأقصى المطلق للتلكرام (1 ميجابايت)

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
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            });

            const stream = client.iterDownload({
                file: message.media,
                offset: bigInt(start),
                limit: chunksize,
                chunkSize: CHUNK_SIZE 
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-store, no-cache',
                'Access-Control-Allow-Origin': '*'
            });
            
            const stream = client.iterDownload({
                file: message.media,
                chunkSize: CHUNK_SIZE
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        }
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).send('حدث خطأ بالشبكة');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
