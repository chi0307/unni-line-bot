const fs = require('fs');
const line = require('@line/bot-sdk');

const STTAndTTS = require('../services/STTAndTTS');
const GooglePhotos = require('../services/GooglePhotos');
const GoogleCloud = require('../services/GoogleCloud');

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const junchiUserId = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

// 從 line 下載檔案
function downloadContent(messageId, downloadPath) {
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

class LineController {
  async index(req, res) {
    if (req.body && req.body.events) {
      for (let event of req.body.events) {
        let userId = event.source.userId,
          replyToken = event.replyToken;

        if (event.type === 'message') {
          let message = event.message;
          if (event.source.type === 'user') {
            let inputText, replyText;
            switch (message.type) {
              case 'text':
                inputText = message.text;

                if (/(吸貓|貓貓|貓咪|喵咪|屁貓|笨貓|胖貓)/.test(inputText)) {
                  let image = await GooglePhotos.getImage();

                  lineClient.replyMessage(replyToken, {
                    type: 'image',
                    originalContentUrl: image,
                    previewImageUrl: image,
                  });
                }
                break;
              case 'audio':
                inputText = await STTAndTTS.saveLineAudioAndConvertToText(message.id);

                console.log('Google 聲音辨識為：', inputText);
                replyText = await STTAndTTS.inputAndReplyContent(inputText);
                console.log('回覆為：', replyText);

                let lineAudioObject = await STTAndTTS.textConvertToAudioAndComposeLineAudioObject(replyText);
                // lineClient.pushMessage(userId, lineAudioObject);
                lineClient.replyMessage(replyToken, lineAudioObject);
                break;
              default:
                console.log('Other Message', message);
                break;
            }
          }
        } else if (event.type === 'postback') {
        }
      }
      res.send();
    }
  }

  async checkAccessToken() {
    let check = await GoogleCloud.checkAccessToken();
    if (!check) {
      let url = await GoogleCloud.getAccessUrl();
      lineClient.pushMessage(junchiUserId, {
        type: 'text',
        text: url,
      });
    }
  }
}

module.exports = new LineController();
