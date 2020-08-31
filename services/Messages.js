const GooglePhotos = require('../services/GooglePhotos');
const Mongo = require('../services/Mongo');

const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');
const defaultFoods = require('../data/foods.json');

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
    if (/(餐廳|餓|吃|午餐|晚餐|宵夜)/.test(inputText)) {
      let foods = await this.getUserFoods(userId);
      let food = randomList(foods);
      let replyTexts = [
        '污泥想吃「$1」',
        '帶污泥去吃「$1」',
        '請污泥吃「$1」',
        '幫污泥外帶「$1」',
        '污泥：喵～～「$1」',
      ];
      let replyText = randomList(replyTexts);
      messages.push({
        type: 'text',
        text: replyText.replace('$1', food),
      });
    }

    return messages;
  }

  async getUserFoods(userId) {
    let foods;
    let userFoods = await Mongo.search({ collection: 'foodList', filter: { userId: userId } });
    if (userFoods.length > 0) {
      foods = userFoods[0].foods;
    } else {
      foods = defaultFoods;
    }
    return foods;
  }
}
module.exports = new Messages();
