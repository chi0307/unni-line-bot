const fs = require('fs');
const line = require('@line/bot-sdk');

const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = process.env;

const client = new line.Client({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CHANNEL_SECRET,
});
const JUNCHI_USER_ID = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

class Line {
  // 發送訊息
  pushMessage(id, message) {
    client.pushMessage(id, message);
  }

  // 回覆訊息
  replyMessage(replyToken, message) {
    client.replyMessage(replyToken, message);
  }

  // 從 line 下載檔案
  downloadLineContent(messageId, downloadPath) {
    return client.getMessageContent(messageId).then(
      (stream) =>
        new Promise((resolve, reject) => {
          const writable = fs.createWriteStream(downloadPath);
          stream.pipe(writable);
          stream.on('end', () => resolve(downloadPath));
          stream.on('error', reject);
        })
    );
  }

  // 傳訊息給我
  sendJunchiMessage(message) {
    client.pushMessage(JUNCHI_USER_ID, message);
  }

  // get menu 清單
  async getRichMenuList(richMenuName) {
    let list = await client.getRichMenuList();
    list = list.filter((item) => item.name === richMenuName);
    return list[0];
  }

  // 設定 user 為特定清單（richMenuId）
  linkRichMenuToUser(userId, richMenuId) {
    client.linkRichMenuToUser(userId, richMenuId);
  }

  // 設定 user 為特定清單（richMenuName）
  async setRichMenuToUser(userId, richMenuName) {
    let richMenu = await this.getRichMenuList(richMenuName);
    if (richMenu) {
      this.linkRichMenuToUser(userId, richMenu.richMenuId);
    }
  }
}

module.exports = new Line();
