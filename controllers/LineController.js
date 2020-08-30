const SttAndTts = require('../services/SttAndTts');
const Line = require('../services/Line');
const Messages = require('../services/Messages');

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

                let messages = await Messages.getReturnMessages(inputText, userId);
                if (messages) {
                  resolve(messages);
                } else {
                  reject();
                }
                break;
              }
              case 'audio': {
                inputText = await SttAndTts.saveLineAudioAndConvertToText(message.id);
                console.log('Google 聲音辨識為：', inputText);

                let messages, replyText;
                messages = await Messages.getReturnMessages(inputText, userId);
                if (messages) {
                  for (let index in messages) {
                    let message = messages[index];
                    if (message.type === 'text') {
                      console.log('回覆為：', message.text);
                      let lineAudioObject = await SttAndTts.textConvertToAudioAndComposeLineAudioObject(message.text);
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
                Line.replyMessage(replyToken, message);
              } else {
                if (sourceType === 'group') {
                  Line.pushMessage(groupId, message);
                } else if (sourceType === 'room') {
                  Line.pushMessage(roomId, message);
                } else if (sourceType === 'user') {
                  Line.pushMessage(userId, message);
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
}

module.exports = new LineController();
