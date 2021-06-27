const axios = require('axios');
const { OPEN_WEATHER_DATA_API_TOKEN } = process.env;

class Calendar {
  getCityCalendar({ cityId, townName }) {
    // https://opendata.cwb.gov.tw/dataset/forecast/F-D0047-093
    // https://opendata.cwb.gov.tw/dist/opendata-swagger.html?urls.primaryName=openAPI#/%E9%A0%90%E5%A0%B1/get_v1_rest_datastore_F_D0047_093

    const dateType = "yyyy-MM-dd'T'HH:mm:SS";

    return axios({
      method: 'get',
      url: 'https://opendata.cwb.gov.tw/api/v1/rest/datastore/F-D0047-093',
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        Authorization: OPEN_WEATHER_DATA_API_TOKEN,
        format: 'JSON',
        locationId: cityId,
        elementName: 'WeatherDescription',
        locationName: townName,
      },
    });
  }
}

module.exports = new Calendar();
