const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('السيرفر شغال وجاهز لربط التلكرام!');
});

app.listen(10000, () => console.log('Server is running...'));
