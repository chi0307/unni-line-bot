require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const menuData = require('./menuData.json');
let richMenuId;

const menuSize = [
  {},
  {
    width: 2400,
    height: 800,
    itemWidth: 800,
    itemHeight: 800,
  },
  {
    width: 2400,
    height: 800,
    itemWidth: 1200,
    itemHeight: 800,
  },
  {
    width: 2400,
    height: 800,
    itemWidth: 800,
    itemHeight: 800,
  },
  {
    width: 2400,
    height: 1600,
    itemWidth: 1200,
    itemHeight: 800,
  },
  {},
  {
    width: 2400,
    height: 1600,
    itemWidth: 800,
    itemHeight: 800,
  },
];

async function createMenu() {
  let count = menuData.areas.length * menuData.areas[0].length;
  let { width, height, itemWidth, itemHeight } = menuSize[count];
  let richmenu = {
    size: {
      width: width,
      height: height,
    },
    selected: false,
    name: menuData.name,
    chatBarText: menuData.chatBarText,
    areas: [],
  };
  for (let index in menuData.areas) {
    for (let index2 in menuData.areas[index]) {
      let area = menuData.areas[index][index2];
      richmenu.areas.push({
        bounds: {
          x: itemHeight * index2,
          y: itemWidth * index,
          width: itemWidth,
          height: itemHeight,
        },
        action: area,
      });
    }
  }

  await client.createRichMenu(richmenu).then((id) => {
    richMenuId = id;
    console.log('create menu success');
  });
}

async function uploadMenuImage() {
  if (!richMenuId) {
    throw 'no richMenuId';
  }
  await client.setRichMenuImage(richMenuId, fs.createReadStream('./menu.png')).then((result) => {
    console.log('upload menu image success');
  });
}

async function setDefaultMenu() {
  if (!richMenuId) {
    throw 'no richMenuId';
  }
  await client.setDefaultRichMenu(richMenuId).then((result) => {
    console.log('set default menu success');
  });
}

async function clearMenuList() {
  console.log('clear menu');
  client.getRichMenuList().then((richmenus) => {
    for (let richmenu of richmenus) {
      client.deleteRichMenu(richmenu.richMenuId);
    }
  });
}

async function init() {
  await clearMenuList();
  await createMenu();
  await uploadMenuImage();
  await setDefaultMenu();
}

init();
