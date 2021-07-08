const { format, addHours, endOfDay, getDay } = require('date-fns');
const { format: formatTZ, utcToZonedTime } = require('date-fns-tz');

const Common = require('./Common');
const Redis = require('./Redis');
const Mongo = require('./Mongo');
const GooglePhotos = require('./GooglePhotos');
const GoogleMaps = require('./GoogleMaps');
const Gasoline = require('./openData/Gasoline');
const Calendar = require('./openData/Calendar');

const calendarCityData = require('../data/calendarCityData.json');
const TIME_ZONE = 'Asia/Taipei';

class MessageApis {
  constructor() {
    this.getUnniImage = this.getUnniImage.bind(this);
    this.getGasolinePrices = this.getGasolinePrices.bind(this);
    this.getWeather = this.getWeather.bind(this);
    this.getNearbyFood = this.getNearbyFood.bind(this);
  }

  /**
   * 從 google 相簿撈污泥的照片
   * @returns {Array<object>} LineMessages
   */
  async getUnniImage() {
    const images = await GooglePhotos.getImages();
    const unniImageUrl = Common.randomList(images);

    return [
      {
        type: 'image',
        originalContentUrl: unniImageUrl,
        previewImageUrl: unniImageUrl,
      },
    ];
  }

  /**
   * 獲取汽柴油價格表
   * @returns {Array<object>} LineMessages
   */
  async getGasolinePrices() {
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

    return [message];
  }

  /**
   * 獲取天氣資料
   * @param {object} param0.parameters dialogflow 的其中一個參數，裡面包含 entities 資料
   * @returns {Array<object>} LineMessages
   */
  async getWeather({ parameters }) {
    const messages = [];
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
          contents: null,
        };

        if (weatherData.length > 1) {
          message.contents = {
            type: 'carousel',
            contents: [],
          };
        }

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
          weathers.forEach(({ startDateTime, endDateTime, weatherDescription, weatherDescriptionIcon }, length) => {
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
          });
          if (message.contents?.type === 'carousel') {
            message.contents.contents.push(content);
          } else {
            message.contents = content;
          }
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
    return messages;
  }

  /**
   * 進入到 google map 查詢附近餐廳並回傳
   * @param {string} param0.location e.g. '26.094722185035548,121.51962107680866'
   * @param {string} param0.userId 使用者 ID
   * @returns {Array<object>} LineMessages
   */
  async getNearbyFood({ location, userId }) {
    let places = await GoogleMaps.getNearbySearchPlaces(location);
    let place = Common.randomList(places);

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

    return [
      {
        type: 'text',
        text: `污泥覺得「${place.name}」好像還不錯吃`,
      },
      {
        type: 'location',
        title: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
    ];
  }
}

module.exports = new MessageApis();
