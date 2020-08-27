require('dotenv').config();
const express = require('express');
const path = require('path');

const apiRouter = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.all('*', function (req, res, next) {
  console.log(req.method, req.url);
  next();
});

app.use('/api', apiRouter);
app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Open http://localhost:${port}`);
});

// 確認 google 認證是否失效
const LineController = require('./controllers/LineController.js');
setTimeout(() => {
  LineController.checkAccessToken();
}, 2000);
