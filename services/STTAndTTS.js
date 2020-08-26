const fs = require('fs');
const util = require('util');
const linear16 = require('linear16');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const googleSpeech = require('@google-cloud/speech');
const googleTextToSpeech = require('@google-cloud/text-to-speech');

// Google text-to-speech speech-to-text 語言
const languageCode = 'zh-TW';
const speechClient = new googleSpeech.SpeechClient();
const textToSpeechClient = new googleTextToSpeech.TextToSpeechClient();

// 音檔回傳 line 提供的位置
const hostPath = process.env.HOST_PATH + (/\/$/.test(process.env.HOST_PATH) ? '' : '/');
// 音檔下載位置（位於專案中的相對位置）
const fileSavePath = './public/file/';
// { "輸入訊息": "回傳訊息" }
let replyMessageData = {};

class STTAndTTS {
  // 音檔轉換 m4a To linear16
  audioFormatFileExtension(inputPath, outputPath = inputPath.replace(/\.\w*$/, '.wav')) {
    return linear16(inputPath, outputPath);
  }

  // 儲存音檔
  async saveAudio(audioContent, fileName = 'input.mp3') {
    if (!audioContent) {
      throw 'No AudioContent';
    }
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(fileName, audioContent, 'binary');
  }

  // get 音檔時間長度（毫秒）
  getAudioDurationInMilliSecond(filePath) {
    return getAudioDurationInSeconds(filePath).then((duration) => {
      return duration * 1000;
    });
  }

  // 刪除音檔
  deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(err);
    });
  }

  // 下載音檔，音檔轉文字，回傳字串
  async saveLineAudioAndConvertToText(audioId) {
    let filePath = `${fileSavePath}${new Date().getTime()}.m4a`;

    await downloadContent(audioId, filePath);
    let audioMilliSecond = await getAudioDurationInMilliSecond(filePath);
    filePath = await audioFormatFileExtension(filePath);

    let inputText = await speechToText(filePath, audioMilliSecond);
    deleteFile(filePath);
    deleteFile(filePath.replace(/\.wav$/, '.m4a'));
    return inputText;
  }

  // 文字轉音檔，回傳 line audio object
  async textConvertToAudioAndComposeLineAudioObject(replyText) {
    let fileName = `${new Date().getTime()}-output.mp3`;
    let filePath = `${fileSavePath}${fileName}`;

    let audioContent = await textToSpeech(replyText);
    await saveAudio(audioContent, filePath);
    let audioDuration = await getAudioDurationInMilliSecond(filePath);

    return {
      type: 'audio',
      originalContentUrl: `${hostPath}file/${fileName}`,
      duration: audioDuration,
    };
  }

  // 輸入文字與回傳文字
  async inputAndReplyContent(inputText) {
    return replyMessageData[inputText] ? replyMessageData[inputText] : inputText;
  }

  // Google 轉換 speech To text（小於等於一分鐘的音檔）
  async lessOneMinuteSpeechToText(filePath) {
    const file = fs.readFileSync(filePath);
    const audioBytes = file.toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        enableSpeakerDiarization: true,
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode,
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results.map((result) => result.alternatives[0].transcript).join('\n');
    return transcription;
  }

  // Google 轉換 speech To text（大於一分鐘的音檔）
  async moreOneMinuteSpeechToText(filePath) {
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

    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();
    const transcription = response.results.map((result) => result.alternatives[0].transcript).join('\n');
    return transcription;
  }

  // Google 轉換 speech To text
  async speechToText(filePath, audioMilliSecond) {
    if (audioMilliSecond > 60 * 1000) {
      return this.moreOneMinuteSpeechToText(filePath);
    } else {
      return this.lessOneMinuteSpeechToText(filePath);
    }
  }

  // Google 轉換 text To speech
  async textToSpeech(text) {
    const request = {
      input: { text },
      voice: { languageCode, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    return response.audioContent;
  }
}

module.exports = new STTAndTTS();
