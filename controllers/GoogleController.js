const GoogleCloud = require('../services/GoogleCloud.js');

class GoogleController {
  async getAccessUrl(req, res) {
    let url = await GoogleCloud.getAccessUrl();
    res.send(url);
  }

  setAccessToken(req, res) {
    let { code } = req.query;
    GoogleCloud.setAccessToken({ code });
    res.send();
  }
}

module.exports = new GoogleController();
