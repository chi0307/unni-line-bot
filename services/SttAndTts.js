const fs = require('fs');
const util = require('util');
const linear16 = require('linear16');
const { getAudioDurationInSeconds } = require('get-audio-duration');

const GoogleStt = require('./GoogleStt');
const GoogleTts = require('./GoogleTts');
const Line = require('./Line');

// 音檔回傳 line 提供的位置
const HOST_PATH = process.env.HOST_PATH + (/\/$/.test(process.env.HOST_PATH) ? '' : '/');
// 音檔下載位置（位於專案中的相對位置）
const FILE_SAVE_PATH = './public/files/';

class SttAndTts {
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

  // 下載音檔，音檔轉文字，回傳字串
  async saveLineAudioAndConvertToText(audioId) {
    let m4aFilePath = `${FILE_SAVE_PATH}${new Date().getTime()}.m4a`;
    let wavFilePath = m4aFilePath.replace(/\.\w*$/, '.wav');

    await Line.downloadLineContent(audioId, m4aFilePath);
    let audioMilliSecond = await this.getAudioDurationInMilliSecond(m4aFilePath);
    await this.audioFormatFileExtension(m4aFilePath, wavFilePath);

    let inputText = await GoogleStt.speechToText(wavFilePath, audioMilliSecond);
    this.deleteFile(m4aFilePath);
    this.deleteFile(wavFilePath);
    return inputText;
  }

  // 文字轉音檔，回傳 line audio object
  async textConvertToAudioAndComposeLineAudioObject(replyText) {
    let fileName = `${new Date().getTime()}-output.mp3`;
    let filePath = `${FILE_SAVE_PATH}${fileName}`;

    let audioContent = await GoogleTts.textToSpeech(replyText);
    await this.saveAudio(audioContent, filePath);
    let audioDuration = await this.getAudioDurationInMilliSecond(filePath);

    return {
      type: 'audio',
      originalContentUrl: `${HOST_PATH}files/${fileName}`,
      duration: audioDuration,
    };
  }
}

module.exports = new SttAndTts();
