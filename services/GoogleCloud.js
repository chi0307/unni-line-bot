const { google } = require('googleapis');

const Redis = require('./Redis');

const SCOPES = ['https://www.googleapis.com/auth/photoslibrary'];
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  ? process.env.GOOGLE_REDIRECT_URI
  : `${process.env.HOST_PATH}${/\/$/.test(process.env.HOST_PATH) ? '' : '/'}api/setAccessToken`;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

function authorize() {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    Redis.get('google_token').then((token) => {
      if (token) {
        token = JSON.parse(token);
        let origin_scope = SCOPES;
        let currently_scope = token.scope.split(' ');
        origin_scope = origin_scope.sort((a, b) => (a > b ? 1 : -1)).join(' ');
        currently_scope = currently_scope.sort((a, b) => (a > b ? 1 : -1)).join(' ');
        if (origin_scope === currently_scope) {
          oAuth2Client.setCredentials(token);
          resolve(oAuth2Client);
        } else {
          reject('modify scope');
        }
      } else {
        reject('no token');
      }
    });
  }).then(
    (oAuth2Client) => {
      return oAuth2Client;
    },
    (error) => {
      console.log(error);
      return null;
    }
  );
}

class GoogleCloud {
  getAccessUrl() {
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });
    return authUrl;
  }

  async setAccessToken({ code }) {
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    return new Promise((resolve, reject) => {
      oAuth2Client.getToken(code, async (err, token) => {
        if (err) {
          reject(err);
        } else {
          Redis.set('google_token', JSON.stringify(token, null, 2)).then((key) => {
            resolve();
          });
        }
      });
    }).then(
      () => {
        console.log('Token stored to Redis');
        return 'success';
      },
      (err) => {
        console.error(err);
        return 'failure';
      }
    );
  }

  async checkAccessToken() {
    let auth = await authorize();
    let url = await this.getAccessUrl();
    return auth ? null : url;
  }

  getAccessToken() {
    return Redis.get('google_token').then((token) => {
      token = JSON.parse(token);
      return token;
    });
  }

  async refreshAccessToken() {
    let token = await this.getAccessToken();
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    oAuth2Client.setCredentials({
      refresh_token: token.refresh_token,
    });
    token = await oAuth2Client.getAccessToken().then((result) => {
      return result.res.data;
    });

    if (token) {
      Redis.set('google_token', JSON.stringify(token, null, 2));
    }

    return token;
  }
}

module.exports = new GoogleCloud();
