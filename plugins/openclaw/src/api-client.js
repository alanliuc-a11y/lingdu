const https = require('https');
const http = require('http');
const { URL } = require('url');

class APIClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl || 'https://LingDu.work';
    this.token = token;
  }

  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const urlStr = this.baseUrl + path;
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async getProfiles() {
    try {
      console.log('[LingDu] API getProfiles called');
      const result = await this.request('GET', '/api/profiles');
      console.log(`[LingDu] API raw response:`, JSON.stringify(result).substring(0, 300));
      return result;
    } catch (e) {
      console.error('[LingDu] API getProfiles error:', e.message);
      return { status: 500, body: null };
    }
  }

  async updateProfiles(content, version = 0) {
    return this.request('PUT', '/api/profiles', { content, version });
  }

  async getUserInfo() {
    return this.request('GET', '/api/auth/user/info');
  }

  async registerDevice(deviceId, deviceName, deviceType) {
    return this.request('POST', '/api/devices', {
      device_id: deviceId,
      device_name: deviceName,
      device_type: deviceType
    });
  }

  async deleteDevice(deviceId) {
    return this.request('DELETE', `/api/devices/${deviceId}`);
  }
}

module.exports = { APIClient };