const { transformToLineMessages } = require('@chi0307/transform-chatbot-message');

const Mongo = require('./Mongo');
const GoogleDialogFlow = require('./GoogleDialogFlow');
const Redis = require('./Redis');
const Common = require('./Common');
const MessageApis = require('./MessageApis');
const Gasoline = require('./openData/Gasoline');

function fixedExecution() {
  let isWait = false;
  return function () {
    if (!isWait) {
      isWait = true;
      setTimeout(async () => {
        const gasolineData = await Gasoline.getPrice();
        for (let key of ['gasoline92', 'gasoline95', 'gasoline98', 'premiumDiesel']) {
          const item = gasolineData[key];
          if (item.startDate <= new Date()) {
            await Redis.set(`gasoline/${key}`, JSON.stringify(item));
          }
        }
        isWait = false;
      }, 20 * 60 * 1000);
    }
  };
}
const execution = fixedExecution();
execution();

class Messages {
  constructor() {
    this.getReturnMessages = this.getReturnMessages.bind(this);
    this.ansIdReturnMessages = this.ansIdReturnMessages.bind(this);
    this.getAnswerPackage = this.getAnswerPackage.bind(this);
  }

  /**
   * 輸入文字，回傳 LineMessages
   * @param {string} param0.inputText 訊息，會傳到 dialogflow 進行辨識
   * @param {string} param0.userId 使用者 ID
   * @param {string} param0.sessionId 給 dialogflow 用的 ID
   * @returns {object} { ansId, LineMessages }
   */
  async getReturnMessages({ inputText, userId, sessionId }) {
    execution();
    const dialogFlowResult = await GoogleDialogFlow.message(inputText, sessionId);
    const { fulfillmentMessages, parameters, intentDetectionConfidence } = dialogFlowResult;
    let ansId = fulfillmentMessages?.[0]?.payload?.fields?.ansId?.stringValue;

    if (ansId) {
      console.log(`問題：${inputText}\nansId：${ansId}\n信心指數：${intentDetectionConfidence}`);
    } else if (
      fulfillmentMessages?.[0]?.platform === 'PLATFORM_UNSPECIFIED' &&
      fulfillmentMessages?.[0]?.message === 'text'
    ) {
      // 流程未結束，會回傳進一步去確認問題
      ansId = fulfillmentMessages[0].text.text[0];
    }

    const messages = await this.ansIdReturnMessages({ ansId, userId }, { parameters });
    return { ansId, messages };
  }

  /**
   * 傳入 ansId 回傳 LineMessages
   * @param {string} param0.ansId 答案包 ID
   * @param {object} param0.userId 使用者 ID
   * @param {object} params 傳遞給 api 執行的參數，其中也包含 dialogflow 給的資料 parameters
   * @returns {Array<object>} LineMessages
   */
  async ansIdReturnMessages({ ansId, userId }, params = {}) {
    if (!ansId) {
      return [];
    }

    let {
      type,
      messages: commonMessages = [],
      apiName,
      randomMessages,
      replaces = [],
      lineMessages,
    } = (await this.getAnswerPackage(ansId)) || {};

    if (type === 'random') {
      commonMessages = Common.randomList(randomMessages);
    } else if (type === 'api') {
      lineMessages = await MessageApis[apiName](params);
    }
    for (let { index, target, actions } of replaces) {
      if (commonMessages[index].type === 'text') {
        const action = Common.randomList(actions);
        commonMessages[index].text = commonMessages[index].text.replace(target, action);
      }
    }

    return lineMessages || transformToLineMessages(commonMessages);
  }

  /**
   * 到 MongoDB 撈答案包出來
   * @param {string} ansId
   * @returns {object}
   */
  async getAnswerPackage(ansId) {
    const answerPackages = await Mongo.search({ collection: 'answerPakage', filter: { ansId } });
    return answerPackages[0];
  }
}
module.exports = new Messages();
