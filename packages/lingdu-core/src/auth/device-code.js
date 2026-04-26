const { APIClient } = require('../api/client');

class DeviceCodeFlow {
  constructor(cloudUrl) {
    this.cloudUrl = cloudUrl || 'https://soulsync.work';
    this.pollingInterval = null;
  }

  async requestCode() {
    const api = new APIClient(this.cloudUrl);
    const result = await api.requestDeviceCode();
    if (result.status !== 200 || !result.body.device_code) {
      throw new Error('Failed to start device authorization.');
    }
    return result.body;
  }

  async waitForToken(deviceCode, expiresIn = 900) {
    const api = new APIClient(this.cloudUrl);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopPolling();
        reject(new Error('Authorization timeout'));
      }, expiresIn * 1000);

      this.pollingInterval = setInterval(async () => {
        try {
          const result = await api.pollDeviceCode(deviceCode);

          if (result.body.status === 'authorized' && result.body.token) {
            this.stopPolling();
            clearTimeout(timeout);
            resolve(result.body.token);
          } else if (result.body.status === 'expired') {
            this.stopPolling();
            clearTimeout(timeout);
            reject(new Error('Authorization expired'));
          } else if (result.body.status === 'not_found') {
            this.stopPolling();
            clearTimeout(timeout);
            reject(new Error('Device code not found'));
          }
        } catch (e) {
          this.stopPolling();
          clearTimeout(timeout);
          reject(e);
        }
      }, 3000);
    });
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

module.exports = { DeviceCodeFlow };
