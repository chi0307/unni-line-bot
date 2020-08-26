require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const apiRouter = require('./routes/api');

// 確認 env 輸入是否正確
if (
  !process.env.HOST_PATH ||
  !process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  !process.env.LINE_CHANNEL_SECRET ||
  !process.env.GOOGLE_APPLICATION_CREDENTIALS
) {
  throw 'env error';
}

// 確認 google credentials 檔案是否存在
fs.access(process.env.GOOGLE_APPLICATION_CREDENTIALS, (err) => {
  if (err) {
    throw err;
  }
});

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
const GooglePhotos = require('./services/GooglePhotos.js');
setTimeout(() => {
  GooglePhotos.getImage();
}, 2000);
