const { uuid } = require('uuidv4');
const dialogflow = require('@google-cloud/dialogflow');

const sessionClient = new dialogflow.SessionsClient();
const { DIALOGFLOW_PROJECT_ID } = process.env;

class GoogleDialogFlow {
  async message(text, sessionId = uuid()) {
    const sessionPath = sessionClient.projectAgentSessionPath(DIALOGFLOW_PROJECT_ID, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'zh-tw',
        },
      },
      queryParams: {
        source: 'line',
        timeZone: 'Asia/Taipei',
      },
    };

    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult;
  }
}

module.exports = new GoogleDialogFlow();
