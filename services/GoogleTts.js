const googleTextToSpeech = require('@google-cloud/text-to-speech');

const languageCode = 'zh-TW';
const textToSpeechClient = new googleTextToSpeech.TextToSpeechClient();

class GoogleTts {
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

module.exports = new GoogleTts();
