const fs = require('fs');
const { google } = require('googleapis');

const token_path = process.env.TOKEN_PATH;

const SCOPES = ['https://www.googleapis.com/auth/photoslibrary'];
const redirect_uri = process.env.GOOGLE_REDIRECT_URI
  ? process.env.GOOGLE_REDIRECT_URI
  : `${process.env.HOST_PATH}${/\/$/.test(process.env.HOST_PATH) ? '' : '/'}api/setAccessToken`;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const client_id = process.env.GOOGLE_CLIENT_ID;

function authorize() {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    fs.readFile(token_path, async (err, string) => {
      if (err) {
        reject(err);
      } else {
        let token = JSON.parse(string);
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
      }
    });
  }).then(
    (oAuth2Client) => {
      return oAuth2Client;
    },
    (error) => {
      console.log('not token');
      return null;
    }
  );
}

class GoogleCloud {
  getAccessUrl() {
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });
    return authUrl;
  }

  async setAccessToken({ code }) {
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    return new Promise((resolve, reject) => {
      oAuth2Client.getToken(code, async (err, token) => {
        if (err) {
          reject(err);
        } else {
          fs.writeFile(token_path, JSON.stringify(token, null, 2), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    }).then(
      () => {
        console.log('Token stored to', token_path);
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
    if (auth) {
      return true;
    } else {
      return false;
    }
  }

  getAccessToken() {
    let token = fs.readFileSync(token_path);
    token = JSON.parse(token.toString());
    return token;
  }

  async refreshAccessToken() {
    let token = this.getAccessToken();
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    oAuth2Client.setCredentials({
      refresh_token: token.refresh_token,
    });
    token = await oAuth2Client.getAccessToken().then((result) => {
      return result.res.data;
    });

    if (token) {
      fs.writeFile(token_path, JSON.stringify(token, null, 2), (err) => {
        if (err) {
          console.error(err);
        }
      });
    }

    return token;
  }
}

module.exports = new GoogleCloud();
