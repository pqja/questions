const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const apiId = 32514591;
const apiHash = '82e267e4d7ca66a1e1fce35896729eb8';
const stringSession = new StringSession('');
const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let phoneCodePromise;

app.get('/', (req, res) => {
    res.send('<h2 dir="rtl">السيرفر شغال. اضف /login لنهاية الرابط حتى يوصلك كود التلكرام.</h2>');
});

app.get('/login', (req, res) => {
    res.send('<h2 dir="rtl">تم طلب الكود! روح للتلكرام جيب الكود (الارقام) وارجع اكتبه بالرابط بهذا الشكل: /send?c=12345</h2>');
    
    // عملية تسجيل الدخول وتخطي التحقق بخطوتين
    client.start({
        phoneNumber: '+9647773847800',
        password: async () => '.mkiikm.',
        phoneCode: async () => {
            return new Promise((resolve) => {
                phoneCodePromise = resolve;
            });
        },
        onError: (err) => console.log(err),
    }).then(() => {
        console.log('تم تسجيل الدخول بنجاح!');
    });
});

app.get('/send', (req, res) => {
    const code = req.query.c;
    if (!code) return res.send('<h2 dir="rtl">نسيت تكتب الكود بالرابط!</h2>');
    
    if (phoneCodePromise) {
        phoneCodePromise(code);
        // ننتظر 4 ثواني حتى يكتمل تسجيل الدخول ويستخرج السشن
        setTimeout(() => {
            const sessionStr = client.session.save();
            res.send(`
                <div style="text-align: center; padding: 20px;">
                    <h2 dir="rtl" style="color: green;">تم تسجيل الدخول وتخطي الباسورد بنجاح! انسخ هذا السشن وارجعلي:</h2>
                    <textarea rows="12" style="width: 90%; font-size: 16px;" readonly>${sessionStr}</textarea>
                </div>
            `);
        }, 4000);
    } else {
        res.send('<h2 dir="rtl">اكو خطأ، ارجع للرابط /login اولاً</h2>');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
