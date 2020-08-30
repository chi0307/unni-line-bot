const fs = require('fs');
const line = require('@line/bot-sdk');

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});
const JUNCHI_USER_ID = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

class Line {
  pushMessage(id, message) {
    lineClient.pushMessage(id, message);
  }

  replyMessage(replyToken, message) {
    lineClient.replyMessage(replyToken, message);
  }

  // 從 line 下載檔案
  downloadLineContent(messageId, downloadPath) {
    return lineClient.getMessageContent(messageId).then(
      (stream) =>
        new Promise((resolve, reject) => {
          const writable = fs.createWriteStream(downloadPath);
          stream.pipe(writable);
          stream.on('end', () => resolve(downloadPath));
          stream.on('error', reject);
        })
    );
  }

  sendJunchiMessage(message) {
    lineClient.pushMessage(JUNCHI_USER_ID, message);
  }
}

module.exports = new Line();
