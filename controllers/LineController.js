const fs = require('fs');
const line = require('@line/bot-sdk');

const GoogleSttAndTts = require('../services/GoogleSttAndTts');
const GooglePhotos = require('../services/GooglePhotos');
const GoogleCloud = require('../services/GoogleCloud');
const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const junchiUserId = 'Ua4df45e4a80fb8b9a2bdcb5383408acc';

// 音檔回傳 line 提供的位置
const HOST_PATH = process.env.HOST_PATH + (/\/$/.test(process.env.HOST_PATH) ? '' : '/');
// 音檔下載位置（位於專案中的相對位置）
const FILE_SAVE_PATH = './public/files/';

// 輸入文字，回傳 line messages object
async function getReturnMessages(inputText) {
  let messages = [];
  if (/(貓|喵|污泥|烏泥)/.test(inputText)) {
    let image = await GooglePhotos.getImages();
    messages.push({
      type: 'image',
      originalContentUrl: image,
      previewImageUrl: image,
    });
  }
  if (/(幹話|屁話|心情不好|不爽)/.test(inputText)) {
    let index = Math.floor(Math.random() * dryTalks.length);
    messages.push({
      type: 'text',
      text: dryTalks[index],
    });
  }
  if (/(情話|撩)/.test(inputText)) {
    let index = Math.floor(Math.random() * loveTalks.length);
    messages.push({
      type: 'text',
      text: loveTalks[index],
    });
  }

  return messages.length > 0 ? messages : null;
}

// 從 line 下載檔案
function downloadLineContent(messageId, downloadPath) {
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

// 下載音檔，音檔轉文字，回傳字串
async function saveLineAudioAndConvertToText(audioId) {
  let m4aFilePath = `${FILE_SAVE_PATH}${new Date().getTime()}.m4a`;
  let wavFilePath = m4aFilePath.replace(/\.\w*$/, '.wav');

  await downloadLineContent(audioId, m4aFilePath);
  let audioMilliSecond = await GoogleSttAndTts.getAudioDurationInMilliSecond(m4aFilePath);
  await GoogleSttAndTts.audioFormatFileExtension(m4aFilePath, wavFilePath);

  let inputText = await GoogleSttAndTts.speechToText(wavFilePath, audioMilliSecond);
  GoogleSttAndTts.deleteFile(m4aFilePath);
  GoogleSttAndTts.deleteFile(wavFilePath);
  return inputText;
}

// 文字轉音檔，回傳 line audio object
async function textConvertToAudioAndComposeLineAudioObject(replyText) {
  let fileName = `${new Date().getTime()}-output.mp3`;
  let filePath = `${FILE_SAVE_PATH}${fileName}`;

  let audioContent = await GoogleSttAndTts.textToSpeech(replyText);
  await GoogleSttAndTts.saveAudio(audioContent, filePath);
  let audioDuration = await GoogleSttAndTts.getAudioDurationInMilliSecond(filePath);

  return {
    type: 'audio',
    originalContentUrl: `${HOST_PATH}files/${fileName}`,
    duration: audioDuration,
  };
}

class LineController {
  index(req, res) {
    if (req.body && req.body.events) {
      for (let event of req.body.events) {
        let { userId, groupId, roomId } = event.source,
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
                inputText = await saveLineAudioAndConvertToText(message.id);
                console.log('Google 聲音辨識為：', inputText);

                let messages, replyText;
                messages = await getReturnMessages(inputText);
                if (messages) {
                  for (let index in messages) {
                    let message = messages[index];
                    if (message.type === 'text') {
                      console.log('回覆為：', message.text);
                      let lineAudioObject = await textConvertToAudioAndComposeLineAudioObject(message.text);
                      messages[index] = lineAudioObject;
                    }
                  }
                  resolve(messages);
                } else {
                  reject();
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
                if (sourceType === 'group') {
                  lineClient.pushMessage(groupId, message);
                } else if (sourceType === 'room') {
                  lineClient.pushMessage(roomId, message);
                } else if (sourceType === 'user') {
                  lineClient.pushMessage(userId, message);
                } else {
                  reject();
                }
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
