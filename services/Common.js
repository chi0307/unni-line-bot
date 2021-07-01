const fs = require('fs');

const GooglePhotos = require('./GooglePhotos');

class Common {
  /**
   * 輸入陣列，亂數回傳其中一個元素
   * @param {Array} list
   * @returns
   */
  randomList(list) {
    let index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  /**
   * 刪除檔案
   * @param {*} filePath 本機的檔案路徑
   */
  deleteFile(filePath, callback = (err) => err && console.error(err)) {
    fs.unlink(filePath, callback);
  }

  /**
   * 從 google 相簿撈污泥的照片
   * @returns message
   */
  async getUnniImage() {
    let images = await GooglePhotos.getImages();
    let image = this.randomList(images);

    const message = {
      type: 'image',
      originalContentUrl: image,
      previewImageUrl: image,
    };

    return message;
  }
}

module.exports = new Common();
