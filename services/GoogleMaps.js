const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

class GoogleMaps {
  async getNearbySearchPlaces(location) {
    let getAllPlaces = (nextPlaceToken) => {
      let delayTime = nextPlaceToken ? 2000 : 0;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          axios
            .get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
              params: {
                location: location,
                radius: 500,
                type: 'restaurant',
                key: GOOGLE_API_KEY,
                opennow: true,
                language: 'zh-TW',
                pagetoken: nextPlaceToken,
              },
            })
            .then((result) => {
              resolve(result);
            })
            .catch(async (err) => {
              reject(err);
            });
        }, delayTime);
      })
        .then(async (result) => {
          let { status, results, next_page_token } = result.data;
          if (status === 'OK' && !next_page_token) {
            return results;
          } else if (status === 'OK') {
            let otherPlaces = await getAllPlaces(next_page_token);
            return [...results, ...otherPlaces];
          } else {
            return Promise.reject(result);
          }
        })
        .catch((err) => {
          console.error(err);
          return [];
        });
    };
    let places = await getAllPlaces();
    places = places.filter(
      (place) => place.rating >= 3 && !/(酒店)/.test(place.name) && !place.types.includes('lodging')
    );
    return places;
  }
}

module.exports = new GoogleMaps();
