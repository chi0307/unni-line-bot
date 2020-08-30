const fs = require('fs');
const googleSpeech = require('@google-cloud/speech');

const languageCode = 'zh-TW';
const speechClient = new googleSpeech.SpeechClient();

class GoogleStt {
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
}

module.exports = new GoogleStt();
