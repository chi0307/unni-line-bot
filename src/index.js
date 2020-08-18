require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const line = require('@line/bot-sdk');
const linear16 = require('linear16');
const googleSpeech = require('@google-cloud/speech');
const googleTextToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const { getAudioDurationInSeconds } = require('get-audio-duration');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const hostPath = process.env.HOST_PATH + (/\/$/.test(process.env.HOST_PATH) ? '' : '/');
const fileSavePath = './temp/';

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const languageCode = 'zh-TW';
const speechClient = new googleSpeech.SpeechClient();
const textToSpeechClient = new googleTextToSpeech.TextToSpeechClient();

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

// 音檔轉換 m4a To linear16
function audioFormatFileExtension(inputPath, outputPath = inputPath.replace(/\.\w*$/, '.wav')) {
  return linear16(inputPath, outputPath);
}

// Google 轉換 speech To text
async function speechToText(filePath) {
  const file = fs.readFileSync(filePath);
  const audioBytes = file.toString('base64');

  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode,
    },
  };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join('\n');
  return transcription;
}

// Google 轉換 text To speech
async function textToSpeech(text) {
  const request = {
    input: { text },
    voice: { languageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  const [response] = await textToSpeechClient.synthesizeSpeech(request);
  return response.audioContent;
}

// 儲存音檔
async function saveAudio(audioContent, fileName = 'input.mp3') {
  if (!audioContent) {
    throw 'No AudioContent';
  }
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(fileName, audioContent, 'binary');
}

// get 音檔時間長度（毫秒）
function getAudioDurationInMilliSecond(filePath) {
  return getAudioDurationInSeconds(filePath).then((duration) => {
    return duration * 1000;
  });
}

// 下載音檔，音檔轉文字，回傳字串
async function saveLineAudioToText(audioId) {
  let filePath = `${fileSavePath}${audioId}.m4a`;

  await downloadContent(audioId, filePath);
  filePath = await audioFormatFileExtension(filePath);
  return speechToText(filePath);
}

// 文字轉音檔，回傳 line audio object
async function textToLineAudioObject(replyText) {
  let fileName = `${new Date().getTime()}-output.mp3`;
  let filePath = `${fileSavePath}${fileName}`;

  let audioContent = await textToSpeech(replyText);
  await saveAudio(audioContent, filePath);
  let audioDuration = await getAudioDurationInMilliSecond(filePath);

  return {
    type: 'audio',
    originalContentUrl: `${hostPath}temp/${fileName}`,
    duration: audioDuration,
  };
}

// 暫時性確認 輸入文字 回傳文字
async function inputAndReplyContent(inputText) {
  let obj = {
    哈囉你好嗎: '誠心感謝 珍重再見 期待再相逢',
  };
  return obj[inputText] ? obj[inputText] : inputText;
}

app.post('/', async (req, res) => {
  if (req.body && req.body.events) {
    req.body.events.forEach(async (event, index) => {
      if (event.type === 'message') {
        let message = event.message;
        if (event.source.type === 'user') {
          let userId = event.source.userId,
            replyToken = event.replyToken,
            inputText,
            replyText;
          switch (message.type) {
            case 'text':
              inputText = message.text;

              replyText = `Reply: ${inputText}`;

              lineClient.replyMessage(replyToken, {
                type: 'text',
                text: replyText,
              });
              break;
            case 'audio':
              let inputText = await saveLineAudioToText(message.id);

              console.log('Google 聲音辨識為：', inputText);
              lineClient.replyMessage(replyToken, {
                type: 'text',
                text: `Google 聲音識別為：${inputText}`,
              });
              replyText = await inputAndReplyContent(inputText);
              console.log('回覆為：', replyText);

              let lineAudioObject = await textToLineAudioObject(replyText);
              lineClient.pushMessage(userId, lineAudioObject);
              break;
            default:
              console.log('message', message);
              break;
          }
        }
      }
    });
    res.send();
  }
});

app.use('/temp', express.static(path.join(__dirname, 'temp')));

app.listen(3000, () => {
  console.log('Open http://localhost:3000');
});
