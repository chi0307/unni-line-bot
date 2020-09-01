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

    // 先篩除掉評分未滿 40 的，避免評分太少拉高分數
    places = places.filter((place) => place.user_ratings_total >= 40);

    let totalRating = 0,
      totalUserRatingsTotal = 0;
    places.forEach((place) => {
      totalRating += place.rating;
      totalUserRatingsTotal += place.user_ratings_total <= 300 ? place.user_ratings_total : 300;
    });

    let avgRating = totalRating / places.length >= 3 ? totalRating / places.length : 3;
    let avgUserRatingsTotal = totalUserRatingsTotal / places.length >= 50 ? totalUserRatingsTotal / places.length : 50;
    console.log(`location: ${location}   avgRating: ${avgRating}   avgUserRatingsTotal: ${avgUserRatingsTotal}`);

    places = places.filter(
      (place) =>
        place.rating >= avgRating &&
        place.user_ratings_total >= avgUserRatingsTotal &&
        !/(酒店|飯店)/.test(place.name) &&
        !place.types.includes('lodging')
    );
    return places;
  }
}

module.exports = new GoogleMaps();
