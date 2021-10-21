require('dotenv').config();
const express = require('express');
const path = require('path');
const line = require('@line/bot-sdk');

const apiRouter = require('./routes/api');
const { getConfig } = require('./services/Line');

const app = express();
const port = process.env.PORT || 3000;

app.use('/api/line', line.middleware(getConfig()));

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
setTimeout(async () => {
  const GoogleCloud = require('./services/GoogleCloud');
  const Line = require('./services/Line');

  let url = await GoogleCloud.checkAccessToken();
  if (url) {
    Line.sendJunchiMessage({
      type: 'text',
      text: url,
    });
  }
}, 2000);
