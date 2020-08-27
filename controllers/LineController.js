const fs = require('fs');
const line = require('@line/bot-sdk');

const STTAndTTS = require('../services/STTAndTTS');
const GooglePhotos = require('../services/GooglePhotos');
const GoogleCloud = require('../services/GoogleCloud');
const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const junchiUserId = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

async function getReturnMessages(inputText) {
  let messages;
  if (/(貓|喵)/.test(inputText)) {
    let image = await GooglePhotos.getImage();
    messages = [
      {
        type: 'image',
        originalContentUrl: image,
        previewImageUrl: image,
      },
    ];
  } else if (/(幹話|屁話|心情不好)/.test(inputText)) {
    let index = Math.floor(Math.random() * dryTalks.length);
    messages = [
      {
        type: 'text',
        text: dryTalks[index],
      },
    ];
  } else if (/(情話)/.test(inputText)) {
    let index = Math.floor(Math.random() * loveTalks.length);
    messages = [
      {
        type: 'text',
        text: loveTalks[index],
      },
    ];
  }

  return messages;
}

class LineController {
  index(req, res) {
    if (req.body && req.body.events) {
      for (let event of req.body.events) {
        let userId = event.source.userId,
          replyToken = event.replyToken,
          sourceType = event.source.type;

        new Promise(async (resolve, reject) => {
          if (event.type === 'message') {
            let message = event.message;
            let inputText, replyText;
            switch (message.type) {
              case 'text': {
                inputText = message.text;

                let messages = await getReturnMessages(inputText);
                if (messages) {
                  resolve(messages);
                } else {
                  reject();
                }
                break;
              }
              case 'audio': {
                inputText = await STTAndTTS.saveLineAudioAndConvertToText(message.id);

                console.log('Google 聲音辨識為：', inputText);
                let messages = await getReturnMessages(inputText),
                  replyText;
                if (messages) {
                  for (let index in messages) {
                    let message = messages[index];
                    if (message.type === 'text') {
                      console.log('回覆為：', message.text);
                      let lineAudioObject = await STTAndTTS.textConvertToAudioAndComposeLineAudioObject(message.text);
                      messages[index] = lineAudioObject;
                    }
                  }
                  resolve(messages);
                } else {
                  let lineAudioObject = await STTAndTTS.textConvertToAudioAndComposeLineAudioObject(inputText);
                  resolve([lineAudioObject]);
                }
                break;
              }
              default: {
                reject();
                break;
              }
            }
          } else {
            reject();
          }
        })
          .then((messages) => {
            for (let index in messages) {
              let message = messages[index];
              if (index === '0') {
                lineClient.replyMessage(replyToken, message);
              } else {
                lineClient.pushMessage(userId, message);
              }
            }
          })
          .catch(() => {
            console.log('Other Event');
            console.log(JSON.stringify(event, null, 2));
          });
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
