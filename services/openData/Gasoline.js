const axios = require('axios');
const convert = require('xml-js');
const { zonedTimeToUtc } = require('date-fns-tz');

class Gasoline {
  getPrice() {
    return axios
      .get('https://vipmember.tmtd.cpc.com.tw/opendata/ListPriceWebService.asmx/getCPCMainProdListPrice_XML')
      .then(({ data }) => {
        const resultJSON = JSON.parse(convert.xml2json(data));
        const needGasoline = {
          '92無鉛汽油': 'gasoline92',
          '95無鉛汽油': 'gasoline95',
          '98無鉛汽油': 'gasoline98',
          超級柴油: 'premiumDiesel',
        };
        const gasolineData = {};
        resultJSON.elements[0].elements.forEach((gasolineElement) => {
          let productName, productNumber, price, startDate;
          gasolineElement.elements.forEach((element) => {
            if (element.name === '產品編號') {
              productNumber = element.elements[0].text;
            } else if (element.name === '產品名稱') {
              productName = element.elements[0].text;
            } else if (element.name === '參考牌價') {
              price = element.elements[0].text;
            } else if (element.name === '牌價生效時間') {
              const { text } = element.elements[0];
              startDate = zonedTimeToUtc(
                `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)} 00:00:00`,
                'Asia/Taipei'
              );
            }
          });
          if (needGasoline[productName]) {
            gasolineData[needGasoline[productName]] = { productName, productNumber, price, startDate };
          }
        });

        return gasolineData;
      });
  }
}

module.exports = new Gasoline();
