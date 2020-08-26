let express = require('express');
let router = express.Router();
const LineController = require('../controllers/LineController');
const GoogleController = require('../controllers/GoogleController');

router.post('/line', function (req, res, next) {
  LineController.index(req, res, next);
});

router.get('/setAccessToken', function (req, res, next) {
  GoogleController.setAccessToken(req, res, next);
});

router.get('/getAccessUrl', function (req, res, next) {
  GoogleController.getAccessUrl(req, res, next);
});

module.exports = router;
