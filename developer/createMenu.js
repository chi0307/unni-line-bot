require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const menuData = require('./menuData.json');
let richMenuId;

async function createMenu() {
  const width = 800;
  const height = 800;
  const richmenu = {
    size: {
      width: 2400,
      height: 1600,
    },
    selected: false,
    name: menuData.name,
    chatBarText: menuData.chatBarText,
    areas: [
      {
        bounds: {
          x: 0,
          y: 0,
          width: width,
          height: height,
        },
        action: menuData.areas[0][0],
      },
      {
        bounds: {
          x: 800,
          y: 0,
          width: width,
          height: height,
        },
        action: menuData.areas[0][1],
      },
      {
        bounds: {
          x: 1600,
          y: 0,
          width: width,
          height: height,
        },
        action: menuData.areas[0][2],
      },
      {
        bounds: {
          x: 0,
          y: 800,
          width: width,
          height: height,
        },
        action: menuData.areas[1][0],
      },
      {
        bounds: {
          x: 800,
          y: 800,
          width: width,
          height: height,
        },
        action: menuData.areas[1][1],
      },
      {
        bounds: {
          x: 1600,
          y: 800,
          width: width,
          height: height,
        },
        action: menuData.areas[1][2],
      },
    ],
  };

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
