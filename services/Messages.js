const { transformToLineMessage } = require('@chi0307/transform-chatbot-message');
const { format, addHours, endOfDay, getDay } = require('date-fns');
const { format: formatTZ, utcToZonedTime } = require('date-fns-tz');

const GooglePhotos = require('./GooglePhotos');
const GoogleMaps = require('./GoogleMaps');
const Mongo = require('./Mongo');
const GoogleDialogFlow = require('./GoogleDialogFlow');
const Redis = require('./Redis');
const Common = require('./Common');
const Calendar = require('./openData/Calendar');
const Gasoline = require('./openData/Gasoline');

const dryTalks = require('../data/dryTalks.json');
const loveTalks = require('../data/loveTalks.json');
const defaultFoods = require('../data/foods.json');
const messagesData = require('../data/messagesData.json');
const calendarCityData = require('../data/calendarCityData.json');

const TIME_ZONE = 'Asia/Taipei';

const unniEatReplyMessages = [
  '污泥想吃「$1」',
  '帶污泥去吃「$1」',
  '請污泥吃「$1」',
  '幫污泥外帶「$1」',
  '污泥：喵～～去吃「$1」',
];

function fixedExecution() {
  let isWait = false;
  return function () {
    if (!isWait) {
      isWait = true;
      setTimeout(async () => {
        const gasolineData = await Gasoline.getPrice();
        for (let key of ['gasoline92', 'gasoline95', 'gasoline98', 'premiumDiesel']) {
          const item = gasolineData[key];
          if (item.startDate <= new Date()) {
            await Redis.set(`gasoline/${key}`, JSON.stringify(item));
          }
        }
        isWait = false;
      }, 10 * 60 * 1000);
    }
  };
}
const execution = fixedExecution();
execution();

class Messages {
  // 輸入文字，回傳 line messages object
  async getReturnMessages({ inputText, userId, sessionId }) {
    execution();
    let messages = [];
    let dialogFlowResult = await GoogleDialogFlow.message(inputText, sessionId);
    const { fulfillmentMessages, parameters, intentDetectionConfidence } = dialogFlowResult;
    const ansId = fulfillmentMessages?.[0]?.payload?.fields?.ansId?.stringValue;
    if (ansId) {
      console.log(`問題：${inputText}\nansId：${ansId}\n信心指數：${intentDetectionConfidence}`);

      switch (ansId) {
        // 貓咪
        case '01': {
          const unniImage = await Common.getUnniImage();
          messages.push(unniImage);
          break;
        }
        // 天氣
        case '02': {
          const township = parameters?.fields?.township?.stringValue;
          let dateRangeName = parameters?.fields?.['date-range-name']?.stringValue;
          const searchWeather = parameters?.fields?.['search-weather']?.stringValue;

          const [cityName, townName] = township.split(',');
          const { cityId } = calendarCityData.find((cityItem) => cityItem.cityName === cityName) || {};

          if (cityName && cityId && townName) {
            await Calendar.getCityCalendar({ cityId, townName }).then(({ data }) => {
              const locationsName = data?.records?.locations?.[0]?.locationsName;
              const locationName = data?.records?.locations?.[0]?.location?.[0]?.locationName;
              const description = '天氣預報綜合描述';
              const weatherElement = data?.records?.locations?.[0]?.location?.[0]?.weatherElement?.[0]?.time || [];
              let weatherData = [];

              // 組成畫面需要的資料
              weatherElement.forEach((element) => {
                const date = format(new Date(element.startTime), 'MM/dd');
                const theDayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][getDay(new Date(element.startTime))];
                const startDateTime = format(new Date(element.startTime), 'MM/dd HH:mm');
                const endDateTime = format(new Date(element.endTime), 'MM/dd HH:mm');
                const originWeatherDescription = element.elementValue[0].value;
                const weatherDescription = originWeatherDescription
                  .replace(/^([^。]*。)([^。]*。)?([^。]*。)([^。]*。)([^。]*。)([^。]*。)$/, '$1$2\n$3$4\n$5\n$6')
                  .replace(/。\n/g, '\n')
                  .replace(/。$/, '');
                let weatherIndex = weatherData.findIndex((item) => item.date === date);

                if (weatherIndex < 0) {
                  weatherData.push({
                    title: `${locationsName}${locationName} ${date}(${theDayOfWeek})`,
                    locationsName,
                    locationName,
                    theDayOfWeek,
                    date,
                    weathers: [],
                  });
                  weatherIndex = weatherData.length - 1;
                }

                const startTime = startDateTime.split(' ')[1];
                weatherData[weatherIndex].weathers.push({
                  startDateTime,
                  endDateTime,
                  weatherDescription,
                  weatherDescriptionIcon: '06:00' <= startTime && startTime < '18:00' ? '☀️' : '🌙',
                  originWeatherDescription,
                });
              });

              if (dateRangeName === '今天') {
                weatherData = weatherData.slice(0, 1);
              } else if (dateRangeName === '明天') {
                weatherData = weatherData.slice(1, 2);
              } else if (dateRangeName === '後天') {
                weatherData = weatherData.slice(2, 3);
              } else if (dateRangeName === '今明天') {
                weatherData = weatherData.slice(0, 2);
              } else if (dateRangeName === '明後天') {
                weatherData = weatherData.slice(1, 3);
              } else if (dateRangeName === '今明後天') {
                weatherData = weatherData.slice(0, 3);
              } else if (/^週([一二三四五六日])$/.test(dateRangeName)) {
                const theDayOfWeek = dateRangeName.replace(/^週([一二三四五六日])$/, '$1');
                weatherData = [weatherData.find((weatherIndex) => weatherIndex.theDayOfWeek === theDayOfWeek)];
              } else if (dateRangeName === '平日') {
                const mondayIndex = weatherData.findIndex((weatherIndex) => weatherIndex.theDayOfWeek === '一');
                const saturdayIndex = weatherData.findIndex(
                  (weatherIndex, index) => index !== 0 && weatherIndex.theDayOfWeek === '六'
                );
                weatherData = weatherData.slice(mondayIndex, saturdayIndex);
              } else if (dateRangeName === '假日') {
                const saturdayIndex = weatherData.findIndex((weatherIndex) => weatherIndex.theDayOfWeek === '六');
                weatherData = weatherData.slice(saturdayIndex, saturdayIndex + 2);
              }

              const message = {
                type: 'flex',
                altText: `${locationsName}${locationName}${description}`,
                contents: {
                  type: 'carousel',
                  contents: [],
                },
              };

              weatherData.forEach(({ title, weathers }, length) => {
                const content = {
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
                      {
                        type: 'box',
                        layout: 'vertical',
                        contents: [],
                        margin: 'md',
                      },
                    ],
                  },
                };
                if (length === 0) {
                  content.body.contents[2] = {
                    ...content.body.contents[2],
                    flex: 1,
                    justifyContent: 'flex-end',
                  };
                }
                weathers.forEach(
                  ({ startDateTime, endDateTime, weatherDescription, weatherDescriptionIcon }, length) => {
                    content.body.contents[2].contents.push({
                      type: 'box',
                      layout: 'vertical',
                      margin: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: startDateTime,
                        },
                      ],
                    });
                    content.body.contents[2].contents.push({
                      type: 'box',
                      layout: 'horizontal',
                      margin: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: weatherDescriptionIcon,
                          flex: 1,
                          align: 'center',
                          gravity: 'center',
                        },
                        {
                          type: 'text',
                          text: weatherDescription,
                          size: 'xxs',
                          color: '#555555',
                          flex: 7,
                          align: 'end',
                          wrap: true,
                        },
                      ],
                    });

                    if (weathers.length - 1 === length) {
                      content.body.contents[2].contents.push({
                        type: 'box',
                        layout: 'vertical',
                        margin: 'md',
                        contents: [
                          {
                            type: 'text',
                            text: endDateTime,
                          },
                        ],
                      });
                    }
                  }
                );
                message.contents.contents.push(content);
              });

              if (searchWeather && !['這週', '平日'].includes(dateRangeName)) {
                let weatherDescriptionText = '';
                if (!dateRangeName) {
                  dateRangeName = '今天';
                  weatherData = weatherData.slice(0, 1);
                }

                weatherData.forEach(({ weathers, locationName, theDayOfWeek }, index, array) => {
                  weatherDescriptionText += array.length === 1 ? dateRangeName : `週${theDayOfWeek}`;
                  weatherDescriptionText += `${locationName}\n`;

                  weathers.forEach(({ startDateTime, originWeatherDescription }) => {
                    const startTime = startDateTime.split(' ')[1];
                    weatherDescriptionText += startTime < '06:00' ? '清晨' : startTime < '18:00' ? '白天' : '晚上';
                    if (searchWeather === '溫度') {
                      weatherDescriptionText += originWeatherDescription.replace(/^.*(溫度攝氏[^。]*)。.*$/, '$1');
                    } else if (
                      searchWeather === '降雨機率' &&
                      /降雨機率/.test(originWeatherDescription) &&
                      !/降雨機率 0%/.test(originWeatherDescription)
                    ) {
                      weatherDescriptionText += originWeatherDescription.replace(/^.*(降雨機率 [^。]*)。.*$/, '$1');
                    } else if (searchWeather === '降雨機率') {
                      weatherDescriptionText += '不會下雨';
                    } else if (searchWeather === '天氣') {
                      weatherDescriptionText += '天氣為' + originWeatherDescription.replace(/^([^。]*)。.*$/, '$1');
                    }

                    weatherDescriptionText += '\n';
                  });

                  weatherDescriptionText += '\n';
                });

                messages.push({
                  type: 'text',
                  text: weatherDescriptionText.replace(/(\n)*$/, ''),
                });
              }

              messages.push(message);
            });
          }
          break;
        }
        // 肚子餓
        case '03': {
          let foods = await this.getUserFoods(userId);
          let food = Common.randomList(foods);
          let replyText = Common.randomList(unniEatReplyMessages);
          messages.push({
            type: 'text',
            text: replyText.replace('$1', food),
          });
          break;
        }
        // 幹話
        case '04': {
          let dryTalk = Common.randomList(dryTalks);
          messages.push({
            type: 'text',
            text: dryTalk,
          });
          break;
        }
        // 情話
        case '05': {
          let loveTalk = Common.randomList(loveTalks);
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
        // 汽、柴油
        case '07': {
          const gasolineData = await Gasoline.getPrice();
          const currentGasolineData = [];
          const futureGasolineData = [];
          for (let key of ['gasoline92', 'gasoline95', 'gasoline98', 'premiumDiesel']) {
            const item = gasolineData[key];
            if (item.startDate <= new Date()) {
              await Redis.set(`gasoline/${key}`, JSON.stringify(item));
              currentGasolineData.push(item);
            } else {
              futureGasolineData.push(item);
              const currentItem = JSON.parse(await Redis.get(`gasoline/${key}`, item));
              currentGasolineData.push(currentItem);
            }
          }

          const message = {
            type: 'flex',
            altText: '汽、柴油公告牌價',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '汽、柴油公告牌價',
                    weight: 'bold',
                    size: 'lg',
                  },
                  {
                    type: 'separator',
                    margin: 'lg',
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [],
                  },
                ],
              },
            },
          };

          currentGasolineData.forEach((item) => {
            message.contents.body.contents[2].contents.push({
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: item.productName,
                  color: '#555555',
                  flex: 0,
                  size: 'xs',
                },
                {
                  type: 'text',
                  text: `${item.price} 元/公升`,
                  color: '#111111',
                  align: 'end',
                  size: 'xs',
                },
              ],
            });
          });

          if (futureGasolineData.length > 0) {
            const zoneTime = utcToZonedTime(futureGasolineData[0].startDate, TIME_ZONE);
            const startDate = formatTZ(zoneTime, 'MM/dd', {
              timeZone: TIME_ZONE,
            });
            const contents = [
              {
                type: 'text',
                text: `${startDate} 調整價格`,
                weight: 'bold',
                size: 'md',
              },
            ];
            futureGasolineData.forEach((item) => {
              contents.push({
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: item.productName,
                    color: '#555555',
                    flex: 0,
                    size: 'xs',
                  },
                  {
                    type: 'text',
                    text: `${item.price} 元/公升`,
                    color: '#111111',
                    align: 'end',
                    size: 'xs',
                  },
                ],
              });
            });

            message.contents.body.contents.push({
              type: 'separator',
              margin: 'lg',
            });
            message.contents.body.contents.push({
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  contents,
                },
              ],
            });
          }

          messages.push(message);
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
    let place = Common.randomList(places);
    let replyText = Common.randomList(unniEatReplyMessages);
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
