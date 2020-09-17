const axios = require('axios');

const GoogleCloud = require('./GoogleCloud');

class GooglePhotos {
  // get google photos 相片
  async getImages() {
    let images = [];
    let token = await GoogleCloud.getAccessToken();

    let nextImageToken,
      repeatGetImage = true,
      errorCount = 0;
    while (repeatGetImage) {
      await axios
        .get('https://photoslibrary.googleapis.com/v1/mediaItems', {
          headers: { Authorization: `Bearer ${token.access_token}` },
          params: {
            pageSize: 100,
            pageToken: nextImageToken,
          },
        })
        .then((result) => {
          let { mediaItems, nextPageToken } = result.data;
          console.log(`google photos get images ${mediaItems.length} success!!`);
          if (mediaItems) {
            images = [...images, ...mediaItems];
          }
          if (nextPageToken) {
            nextImageToken = nextPageToken;
          } else {
            repeatGetImage = false;
          }
        })
        .catch(async (err) => {
          if (err.response.status === 401) {
            token = await GoogleCloud.refreshAccessToken();
          } else {
            console.error(`google photos get error: ${err}`);
          }
          errorCount++;
          if (errorCount >= 10) {
            repeatGetImage = false;
          }
        });
    }

    images = images.map((image) => image.baseUrl);
    return images;
  }
}
module.exports = new GooglePhotos();
