const fs = require('fs');

class Common {
  constructor() {
    this.randomList = this.randomList.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.cloneObject = this.cloneObject.bind(this);
  }

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
   * 深層拷貝 Object、Array
   * @param {*} obj
   * @returns
   */
  cloneObject(obj) {
    if (typeof obj === 'object') {
      return JSON.parse(JSON.stringify(obj));
    } else {
      return obj;
    }
  }
}

module.exports = new Common();
