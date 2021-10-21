const Line = require('../services/Line');
const Messages = require('../services/Messages');
const MessageApis = require('../services/MessageApis');
const GoogleVision = require('../services/GoogleVision');

/**
 * 紀錄下一步驟要撈附近餐廳的 sessionId 清單
 */
const searchPlaceSessionIds = [];
/**
 * 鎖定圖片識別的 sessionId
 */
const imageIdentifyLockSessionIds = [];
/**
 * 處理移除鎖定的 sessionId
 * @param {Array<string>} list 輸入陣列的變數
 * @param {string} sessionId
 */
function deleteSesionId(list, sessionId) {
  if (list.includes(sessionId)) {
    const index = list.findIndex((id) => id === sessionId);
    list.splice(index, 1);
  }
}
/**
 * 訊息判斷與回傳
 * @param {string} param0.inputText 輸入訊息
 * @param {string} param0.userId
 * @param {string} param0.sessionId
 * @param {string} param0.sourceType user | group | room
 * @returns {Array} messages
 */
async function sendMessageAndReturn({ inputText, userId, sessionId, sourceType }) {
  const { ansId, messages } = await Messages.getReturnMessages({ inputText, userId, sessionId, sourceType });
  // ansId: 06 是查詢附近的餐廳
  if (ansId === '06') {
    searchPlaceSessionIds.push(sessionId);
  }
  return messages;
}
/**
 * 輸入 ansId 回傳
 * @param {string} param0.ansId
 * @param {string} param0.userId
 * @param {string} param0.sessionId
 * @returns {Array} messages
 */
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
          deleteSesionId(searchPlaceSessionIds, sessionId);
        }

        new Promise(async (resolve, reject) => {
          if (eventType === 'message') {
            const message = event.message;
            switch (message.type) {
              case 'text': {
                const inputText = message.text;
                const messages = await sendMessageAndReturn({ inputText, userId, sessionId, sourceType });
                return resolve(messages);
              }

              case 'image': {
                if (imageIdentifyLockSessionIds.includes(sessionId)) {
                  return reject();
                }
                imageIdentifyLockSessionIds.push(sessionId);
                setTimeout(() => {
                  deleteSesionId(imageIdentifyLockSessionIds, sessionId);
                }, 60000);

                const imageMessageId = message.id;
                const messages = await GoogleVision.imageIdentify(imageMessageId, sessionId);
                return resolve(messages);
              }

              case 'location': {
                if (searchPlaceSessionIds.includes(sessionId)) {
                  deleteSesionId(searchPlaceSessionIds, sessionId);
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
              const messages = await sendMessageAndReturn({ inputText: data, userId, sessionId, sourceType });
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
          .catch((err) => {
            if (err) {
              console.error(err);
            }
            console.log('Other Event');
            console.log(JSON.stringify(event, null, 2));
          });
      }
      res.send();
    }
  }
}

module.exports = new LineController();
