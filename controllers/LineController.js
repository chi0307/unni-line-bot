const SttAndTts = require('../services/SttAndTts');
const Line = require('../services/Line');
const Messages = require('../services/Messages');
let nextLocationIsReturnPlace = false;

class LineController {
  index(req, res) {
    if (req.body && req.body.events) {
      for (let event of req.body.events) {
        let { userId, groupId, roomId } = event.source,
          replyToken = event.replyToken,
          sourceType = event.source.type;

        if (nextLocationIsReturnPlace && event.message.type !== 'location') {
          nextLocationIsReturnPlace = false;
        }

        new Promise(async (resolve, reject) => {
          if (event.type === 'message') {
            let message = event.message;
            switch (message.type) {
              case 'text': {
                let inputText = message.text;
                let { ansId, messages } = await Messages.getReturnMessages(inputText, userId);
                // ansId: 06 是查詢附近的餐廳
                if (ansId === '06') {
                  nextLocationIsReturnPlace = true;
                }
                resolve(messages);
                break;
              }

              case 'location': {
                if (nextLocationIsReturnPlace) {
                  nextLocationIsReturnPlace = false;
                  let location = `${message.latitude},${message.longitude}`;
                  let messages = await Messages.getReturnPlace(location, userId);
                  resolve(messages);
                } else {
                  reject();
                }
              }

              default: {
                reject();
                break;
              }
            }
          } else if (event.type === 'postback') {
            let data = event.postback.data;
            if (/^richMenu=/.test(data)) {
              let menuName = data.replace(/^richMenu=/, '');
              Line.setRichMenuToUser(userId, menuName);
            } else {
              reject();
            }
          } else {
            reject();
          }
        })
          .then((messages) => {
            if (messages && messages.length > 0) {
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
                    return Promise.reject();
                  }
                }
              }
            } else {
              return Promise.reject();
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
