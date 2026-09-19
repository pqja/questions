const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');

const app = express();
app.use(cors()); 

const apiId = 32514591;
const apiHash = '82e267e4d7ca66a1e1fce35896729eb8';
const sessionString = '1AgAOMTQ5LjE1NC4xNjcuNTEBuzKUs/VyJxHW83aJNiwYsXtwEe9jUt/lPwWOVcBtCFBSP8D6Y1g/UtfU6k9VYTmfGJS/hvY+uG4vfJfcG+Qi249GbBwqfuwkLEVP+gZciRrn/EXJ4FWSlUnUyZ9CkpHC6I2RDamHY607K731RnTLpH7RJmm01bCX6LZHveLWBjnbMRg4NV+e+57po1Uu1i5t4P338zCu+fPmfLvKMHOF7+2D4fT9f4VMB66KzpXBv0xiZVKhXYXgFCwep2qZlvCcSqREn9WdWzyt2nPqZqhPnwpNcPISKbrUcze7SGly8lWIBgr8pG4ncQwx/krR4d0ciMo+ANu3gfMSMMbkUIF+1Yw=';

const stringSession = new StringSession(sessionString);
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    console.log('جاري الاتصال بالتلكرام...');
    
    // استخدمنا start بدل connect حتى نعطيه الباسورد مباشرة لتخطي الخطأ
    await client.start({
        password: async () => '.mkiikm.',
        onError: (err) => console.log(err),
    });
    
    console.log('تم الاتصال بنجاح وتخطي التحقق بخطوتين!');
    
    // جلب المحادثات لمرة واحدة حتى يتعرف السيرفر على القنوات
    console.log('جاري التعرف على القنوات...');
    await client.getDialogs();
    console.log('تم التعرف على القنوات! السيرفر جاهز.');
})();

app.get('/', (req, res) => {
    res.send('سيرفر المحاضرات شغال ومربوط بحسابك الشخصي السريع 100%!');
});

app.get('/video', async (req, res) => {
    try {
        const fullLink = req.query.link; 

        if (!fullLink) {
            return res.status(400).send('يرجى توفير رابط التلكرام');
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
