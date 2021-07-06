const fs = require('fs');
const line = require('@line/bot-sdk');
const axios = require('axios');

const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = process.env;

const config = {
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);
const JUNCHI_USER_ID = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

class Line {
  getConfig() {
    return config;
  }

  /**
   * 發送訊息
   * @param {*} id
   * @param {*} message
   */
  pushMessage(id, message) {
    client.pushMessage(id, message);
  }

  /**
   * 回覆訊息單一訊息
   * @param {*} replyToken
   * @param {*} message
   */
  replyMessage(replyToken, message) {
    client.replyMessage(replyToken, message);
  }

  /**
   * 回覆多個訊息
   * @param {*}} replyToken
   * @param {*} messages
   */
  replyMessages(replyToken, messages) {
    axios({
      method: 'post',
      url: 'https://api.line.me/v2/bot/message/reply',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      data: {
        replyToken,
        messages,
      },
    }).catch((err) => {
      console.log(err.response.data);
    });
  }

  /**
   * 從 line 下載檔案
   * @param {*} messageId
   * @param {*} downloadPath
   * @returns
   */
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

  /**
   * 傳訊息給我
   * @param {*} message
   */
  sendJunchiMessage(message) {
    client.pushMessage(JUNCHI_USER_ID, message);
  }

  /**
   * get menu 清單
   * @param {*} richMenuName
   * @returns
   */
  async getRichMenuList(richMenuName) {
    let list = await client.getRichMenuList();
    list = list.filter((item) => item.name === richMenuName);
    return list[0];
  }

  /**
   * 設定 user 為特定清單（richMenuId）
   * @param {*} userId
   * @param {*} richMenuId
   */
  linkRichMenuToUser(userId, richMenuId) {
    client.linkRichMenuToUser(userId, richMenuId);
  }

  /**
   * 設定 user 為特定清單（richMenuName）
   * @param {*} userId
   * @param {*} richMenuName
   */
  async setRichMenuToUser(userId, richMenuName) {
    let richMenu = await this.getRichMenuList(richMenuName);
    if (richMenu) {
      this.linkRichMenuToUser(userId, richMenu.richMenuId);
    }
  }
}

module.exports = new Line();
