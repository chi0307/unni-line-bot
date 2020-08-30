const GooglePhotos = require('../services/GooglePhotos');

const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');

function randomList(list) {
  let index = Math.floor(Math.random() * list.length);
  return list[index];
}

class Messages {
  // 輸入文字，回傳 line messages object
  async getReturnMessages(inputText, userId) {
    let messages = [];
    if (/(貓|喵|污泥|烏泥)/.test(inputText)) {
      let images = await GooglePhotos.getImages();
      let image = randomList(images);
      messages.push({
        type: 'image',
        originalContentUrl: image,
        previewImageUrl: image,
      });
    }
    if (/(幹話|屁話|心情不好|不爽)/.test(inputText)) {
      let dryTalk = randomList(dryTalks);
      messages.push({
        type: 'text',
        text: dryTalk,
      });
    }
    if (/(情話|撩)/.test(inputText)) {
      let loveTalk = randomList(loveTalks);
      messages.push({
        type: 'text',
        text: loveTalk,
      });
    }

    return messages.length > 0 ? messages : null;
  }
}
module.exports = new Messages();
