const vision = require('@google-cloud/vision');

const Line = require('./Line');
const Common = require('./Common');
const MessageApis = require('./MessageApis');
const GooglePhotos = require('./GooglePhotos');
const client = new vision.ImageAnnotatorClient();

class GoogleVision {
  async imageIdentify(imageMessageId) {
    let messages = [];
    const filePath = `./tmp/${imageMessageId}.jpg`;

    try {
      await Line.downloadLineContent(imageMessageId, filePath);
      messages = await this.detectingLandmarks(filePath);
      // 檢查確認不是地標後改偵測標籤
      if (messages.length === 0) {
        messages = await this.detectinglabels(filePath);
      }
    } catch (err) {}

    Common.deleteFile(filePath);
    return messages;
  }

  /**
   * 偵測地標
   * @param {*} filePath 本機的圖片路徑
   * @returns messages
   */
  async detectingLandmarks(filePath) {
    const messages = [];
    const [result] = await client.landmarkDetection(filePath);
    const [landmark] = result.landmarkAnnotations;
    if (landmark && landmark.score >= 0.5) {
      if (landmark.locations.length > 0) {
        messages.push({ type: 'text', text: '推測為：' });
        messages.push({
          type: 'location',
          title: landmark.description,
          address: landmark.description,
          latitude: landmark.locations[0].latLng.latitude,
          longitude: landmark.locations[0].latLng.longitude,
        });
      } else {
        messages.push({ type: 'text', text: `推測為：「${landmark.description}」` });
      }
    }

    return messages;
  }

  /**
   * 偵測標籤
   * @param {*} filePath 本機的圖片路徑
   * @returns messages
   */
  async detectinglabels(filePath) {
    let messages = [];

    const [result] = await client.labelDetection(filePath);
    const labels = result.labelAnnotations;
    const haveCat = labels.some((label) => label.description === 'Cat');
    if (haveCat) {
      messages = await MessageApis.getUnniImage();
    }

    return messages;
  }
}

module.exports = new GoogleVision();
