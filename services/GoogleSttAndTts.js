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

class GoogleSttAndTts {
  // 音檔轉換 m4a To linear16
  audioFormatFileExtension(inputPath, outputPath) {
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

module.exports = new GoogleSttAndTts();
