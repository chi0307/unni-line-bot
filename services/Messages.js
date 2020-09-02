const GooglePhotos = require('../services/GooglePhotos');
const GoogleMaps = require('../services/GoogleMaps');
const Mongo = require('../services/Mongo');
const { format, addHours } = require('date-fns');

const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');
const defaultFoods = require('../data/foods.json');

const intent = {
  cat: (text) => /(貓|喵|污泥|烏泥)/.test(text),
  eat: (text) => /(餐廳|餓|吃|午餐|晚餐|宵夜)/.test(text),
  dryTalk: (text) => /(幹話|屁話|心情不好|不爽)/.test(text),
  loveTalk: (text) => /(情話|撩)/.test(text),
  nearby: (text) => /(附近|旁邊)/.test(text),
};
const unniEatReplyMessages = [
  '污泥想吃「$1」',
  '帶污泥去吃「$1」',
  '請污泥吃「$1」',
  '幫污泥外帶「$1」',
  '污泥：喵～～去吃「$1」',
];

function randomList(list) {
  let index = Math.floor(Math.random() * list.length);
  return list[index];
}

class Messages {
  // 輸入文字，回傳 line messages object
  async getReturnMessages(inputText, userId) {
    let messages = [];
    if (intent.cat(inputText)) {
      let images = await GooglePhotos.getImages();
      let image = randomList(images);
      messages.push({
        type: 'image',
        originalContentUrl: image,
        previewImageUrl: image,
      });
    }
    if (intent.dryTalk(inputText)) {
      let dryTalk = randomList(dryTalks);
      messages.push({
        type: 'text',
        text: dryTalk,
      });
    }
    if (intent.loveTalk(inputText)) {
      let loveTalk = randomList(loveTalks);
      messages.push({
        type: 'text',
        text: loveTalk,
      });
    }
    if (intent.eat(inputText)) {
      let foods = await this.getUserFoods(userId);
      let food = randomList(foods);
      let replyText = randomList(unniEatReplyMessages);
      messages.push({
        type: 'text',
        text: replyText.replace('$1', food),
      });
    }
    if (intent.nearby(inputText) && intent.eat(inputText)) {
      messages = [
        {
          type: 'text',
          text: '請點擊下方按鈕回傳當前座標',
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'location',
                  label: '當前座標',
                },
              },
            ],
          },
        },
      ];
    }

    return messages;
  }

  async getReturnPlace(location, userId) {
    let places = await GoogleMaps.getNearbySearchPlaces(location);
    let place = randomList(places);
    let replyText = randomList(unniEatReplyMessages);
    console.log(
      `location: ${location}   name: ${place.name}   rating: ${place.rating}   userRatingsTotal: ${place.user_ratings_total}`
    );
    Mongo.insertOne({
      collection: 'placeLog',
      doc: {
        userId,
        time: format(addHours(new Date(), 8), 'yyyy-MM-dd HH:mm:ss'),
        location,
        name: place.name,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        place,
      },
    });
    let messages = [
      {
        type: 'text',
        text: replyText.replace('$1', place.name),
      },
      {
        type: 'location',
        title: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
    ];
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
