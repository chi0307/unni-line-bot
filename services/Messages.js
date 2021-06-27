const { transformToLineMessage } = require('@chi0307/transform-chatbot-message');
const { format, addHours, endOfDay } = require('date-fns');
const GooglePhotos = require('../services/GooglePhotos');
const GoogleMaps = require('../services/GoogleMaps');
const Mongo = require('../services/Mongo');
const GoogleDialogFlow = require('../services/GoogleDialogFlow');
const Calendar = require('./openData/Calendar');

const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');
const defaultFoods = require('../data/foods.json');
const messagesData = require('../data/messagesData.json');
const calendarCityData = require('../data/calendarCityData.json');

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
    let dialogFlowResult = await GoogleDialogFlow.message(inputText, userId);
    const { fulfillmentMessages, parameters, intentDetectionConfidence } = dialogFlowResult;
    const ansId = fulfillmentMessages?.[0]?.payload?.fields?.ansId?.stringValue;
    if (ansId) {
      console.log(`問題：${inputText}\nansId：${ansId}\n信心指數：${intentDetectionConfidence}`);

      switch (ansId) {
        // 貓咪
        case '01': {
          let images = await GooglePhotos.getImages();
          let image = randomList(images);

          messages.push({
            type: 'image',
            originalContentUrl: image,
            previewImageUrl: image,
          });
          break;
        }
        // 天氣
        case '02': {
          const township = parameters?.fields?.township?.stringValue;
          const [cityName, townName] = township.split(',');
          const { cityId } = calendarCityData.find((cityItem) => cityItem.cityName === cityName) || {};
          if (cityName && cityId && townName) {
            await Calendar.getCityCalendar({ cityId, townName }).then(({ data }) => {
              const locationsName = data?.records?.locations?.[0]?.locationsName;
              const locationName = data?.records?.locations?.[0]?.location?.[0]?.locationName;
              const description = '天氣預報綜合描述';
              const weatherElement = data?.records?.locations?.[0]?.location?.[0]?.weatherElement?.[0]?.time || [];
              const weatherData = [];

              weatherElement.forEach((element) => {
                const date = format(new Date(element.startTime), 'MM/dd');
                const time = format(new Date(element.startTime), 'HH:mm');
                const weatherDescription = element.elementValue[0].value.replace(
                  /^([^。]*。)([^。]*。)?([^。]*。)([^。]*。)([^。]*。)([^。]*。)$/,
                  '$1$2\n$3$4\n$5\n$6'
                );
                const weatherIndex = weatherData.findIndex((item) => item.date === date);

                if (weatherIndex >= 0) {
                  weatherData[weatherIndex].weathers.push({
                    time,
                    weatherDescription,
                  });
                } else {
                  weatherData.push({
                    title: `${locationsName}${locationName} ${date}`,
                    date,
                    weathers: [
                      {
                        time,
                        weatherDescription,
                      },
                    ],
                  });
                }
              });

              const message = {
                type: 'flex',
                altText: `${locationsName}${locationName}${description}`,
                contents: {
                  type: 'carousel',
                  contents: [],
                },
              };

              weatherData.forEach(({ title, weathers }) => {
                message.contents.contents.push({
                  type: 'bubble',
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                          {
                            type: 'text',
                            text: title,
                            size: 'lg',
                          },
                        ],
                      },
                      {
                        type: 'separator',
                        margin: 'md',
                      },
                      ...weathers.map(({ time, weatherDescription }) => {
                        return {
                          type: 'box',
                          layout: 'vertical',
                          contents: [
                            {
                              type: 'box',
                              layout: 'horizontal',
                              contents: [
                                {
                                  type: 'text',
                                  text: time,
                                  size: 'sm',
                                  flex: 0,
                                  color: '#111111',
                                },
                                {
                                  type: 'text',
                                  text: weatherDescription,
                                  size: 'xxs',
                                  color: '#555555',
                                  align: 'end',
                                  wrap: true,
                                },
                              ],
                            },
                          ],
                          margin: 'md',
                        };
                      }),
                    ],
                  },
                });
              });

              messages.push(message);
            });
          }
          break;
        }
        // 肚子餓
        case '03': {
          let foods = await this.getUserFoods(userId);
          let food = randomList(foods);
          let replyText = randomList(unniEatReplyMessages);
          messages.push({
            type: 'text',
            text: replyText.replace('$1', food),
          });
          break;
        }
        // 幹話
        case '04': {
          let dryTalk = randomList(dryTalks);
          messages.push({
            type: 'text',
            text: dryTalk,
          });
          break;
        }
        // 情話
        case '05': {
          let loveTalk = randomList(loveTalks);
          messages.push({
            type: 'text',
            text: loveTalk,
          });
          break;
        }
        // 附近的餐廳
        case '06': {
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
          break;
        }
        default: {
          break;
        }
      }
    } else if (
      fulfillmentMessages?.[0]?.platform === 'PLATFORM_UNSPECIFIED' &&
      fulfillmentMessages?.[0]?.message === 'text'
    ) {
      const ansId = fulfillmentMessages[0].text.text[0];
      messages = messagesData.find((messageItem) => messageItem.ansId === ansId).messages;
    }

    return { ansId, messages };
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
    if (userFoods?.length > 0) {
      foods = userFoods[0].foods;
    } else {
      foods = defaultFoods;
    }
    return foods;
  }
}
module.exports = new Messages();
