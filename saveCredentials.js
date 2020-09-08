require('dotenv').config();
const fs = require('fs');

let credentials = JSON.parse(process.env.CREDENTIALS);

fs.writeFile('credentials.json', JSON.stringify(credentials, null, 2) + '\n', (err) => {
  if (err) throw err;
  console.log('The file has been saved!');
});
