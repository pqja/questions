const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');

const app = express();
app.use(cors()); 

// معلومات الاتصال
const apiId = 32514591;
const apiHash = '82e267e4d7ca66a1e1fce35896729eb8';

// السشن الدائمي الخاص بيك (تم إضافته)
const sessionString = '1AgAOMTQ5LjE1NC4xNjcuNTEBu2izoLwDMbx6PmxZz0K1MXqQk1JSjbl3tbcRLGj+LJAXEU86UZ/KwG8ONGMHZlxWGeAswZ1VKD0fGrz5/EolmeJpKQ6bzLHJhj+YwStZ0vFuBoKZOGfvf9RlHKEbyOWpNnvNrTeRIWJ9WmMOZLiHbK9uRT+FQt9pKzH8o4PHfyvM9p8LD2YMRCLABoY8hQNN35uymyUh1FgfylpxhMFTsJE8bQCaE2YcBtL04cesr5i2cmFIaBK3KuPb8fHjGmrhTJWUh6W5IQzl2Sqd5bRPLItUdowzX82fmnftNYlZnN6h0PiwoT9B3YZ/TVZmvzPA1k/jpIXHydfki2QLGQIHQEQ=';

const stringSession = new StringSession(sessionString);
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    console.log('جاري الاتصال بالتلكرام باستخدام السشن المحفوظ...');
    await client.connect();
    console.log('تم الاتصال بنجاح! السيرفر جاهز 100% لبث المحاضرات.');
})();

app.get('/', (req, res) => {
    res.send('سيرفر المحاضرات شغال ومربوط بحسابك الشخصي ومستعد لبث الفيديوهات!');
});

app.get('/video', async (req, res) => {
    try {
        const fullLink = req.query.link; 

        if (!fullLink) {
            return res.status(400).send('يرجى توفير رابط رسالة التلكرام');
        }

        const parts = fullLink.split('/');
        const messageId = parseInt(parts[parts.length - 1]); 
        let channelIdText = parts[parts.length - 2];
        
        let channelId = parseInt(channelIdText);
        if (!channelIdText.startsWith('-100')) {
            channelId = parseInt('-100' + channelIdText);
        }

        const messages = await client.getMessages(channelId, { ids: [messageId] });
        const message = messages[0];

        if (!message || !message.media || !message.media.document) {
            return res.status(404).send('الفيديو غير موجود أو أن حسابك ليس عضواً في القناة');
        }

        const fileSize = Number(message.media.document.size);
        const range = req.headers.range;

        // تهيئة البث المتقطع حتى يقدر الطالب يقدم ويرجع بالفيديو
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
                offset: bigInt(start), 
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
        if (!res.headersSent) { 
            res.status(500).send('حدث خطأ أثناء جلب الفيديو من التلكرام');
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
