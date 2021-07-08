const SttAndTts = require('../services/SttAndTts');
const Line = require('../services/Line');
const Messages = require('../services/Messages');
const MessageApis = require('../services/MessageApis');
const GoogleVision = require('../services/GoogleVision');

/**
 * 紀錄下一步驟要撈附近餐廳的 sessionId 清單
 */
const searchPlaceSessionIds = [];
/**
 * 將 sessionId 從準備撈附近餐廳清單中移除
 * @param {*} sessionId
 */
function deleteSearchPlaceSessionId(sessionId) {
  if (searchPlaceSessionIds.includes(sessionId)) {
    searchPlaceSessionIds.splice(
      searchPlaceSessionIds.find((id) => id === sessionId),
      1
    );
  }
}
async function sendMessageAndReturn({ inputText, userId, sessionId }) {
  const { ansId, messages } = await Messages.getReturnMessages({ inputText, userId, sessionId });
  // ansId: 06 是查詢附近的餐廳
  if (ansId === '06') {
    searchPlaceSessionIds.push(sessionId);
  }
  return messages;
}
async function sendAnsIdAndReturn({ ansId, userId, sessionId }) {
  // ansId: 06 是查詢附近的餐廳
  if (ansId === '06') {
    searchPlaceSessionIds.push(sessionId);
  }
  const messages = await Messages.ansIdReturnMessages({ ansId, userId });
  return messages;
}

class LineController {
  index(req, res) {
    if (req.body && req.body.events) {
      for (let event of req.body.events) {
        const { userId, groupId, roomId, type: sourceType } = event.source,
          { replyToken, type: eventType } = event;
        const sessionId = groupId || roomId || userId;

        if (eventType !== 'message' || event.message.type !== 'location') {
          deleteSearchPlaceSessionId(sessionId);
        }

        new Promise(async (resolve, reject) => {
          if (eventType === 'message') {
            const message = event.message;
            switch (message.type) {
              case 'text': {
                const inputText = message.text;
                const messages = await sendMessageAndReturn({ inputText, userId, sessionId });
                return resolve(messages);
              }

              case 'image': {
                const imageMessageId = message.id;
                const messages = await GoogleVision.imageIdentify(imageMessageId);
                return resolve(messages);
              }

              case 'location': {
                if (searchPlaceSessionIds.includes(sessionId)) {
                  deleteSearchPlaceSessionId(sessionId);
                  const location = `${message.latitude},${message.longitude}`;
                  const messages = await MessageApis.getNearbyFood({ location, userId });
                  return resolve(messages);
                }
              }
            }
          } else if (eventType === 'postback') {
            const data = event.postback.data;
            if (/^richMenu=/.test(data)) {
              const menuName = data.replace(/^richMenu=/, '');
              Line.setRichMenuToUser(userId, menuName);
            } else if (/^ansId=/.test(data)) {
              const ansId = data.replace(/^ansId=/, '');
              const messages = await sendAnsIdAndReturn({ ansId, userId, sessionId });
              return resolve(messages);
            } else {
              const messages = await sendMessageAndReturn({ inputText: data, userId, sessionId });
              return resolve(messages);
            }
          } else if (eventType === 'follow') {
            const ansId = '00';
            const messages = await sendAnsIdAndReturn({ ansId, userId, sessionId });
            return resolve(messages);
          }
          reject();
        })
          .then((messages) => {
            if (messages && messages.length > 0) {
              Line.replyMessages(replyToken, messages);
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
