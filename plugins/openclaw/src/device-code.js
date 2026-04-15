const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let pollingInterval = null;

function getCloudUrl() {
  const pluginDir = path.dirname(__filename);
  const configPath = path.join(pluginDir, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.cloud_url) return cfg.cloud_url;
    }
  } catch (e) {}
  return 'https://LingDu.work';
}

function makeRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const cloudUrl = getCloudUrl();
    const isHttps = cloudUrl.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(cloudUrl + urlPath);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function requestDeviceCode() {
  return makeRequest('POST', '/api/auth/device-code');
}

function pollForAuth(deviceCode) {
  return makeRequest('GET', `/api/auth/device/${deviceCode}/status`);
}

function startPolling(deviceCode, onSuccess, onError) {
  pollingInterval = setInterval(async () => {
    try {
      const result = await pollForAuth(deviceCode);
      
      if (result.body.status === 'authorized' && result.body.token) {
        stopPolling();
        onSuccess(result.body.token);
        return;
      }
      
      if (result.body.status === 'expired') {
        stopPolling();
        onError(new Error('Device code expired'));
        return;
      }
      
      if (result.body.status === 'not_found') {
        stopPolling();
        onError(new Error('Device code not found'));
        return;
      }
    } catch (e) {
      stopPolling();
      onError(e);
    }
  }, 3000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function savePendingAuth(deviceCode, authUrl) {
  const homeDir = os.homedir();
  const pendingDir = path.join(homeDir, '.LingDu');
  const pendingFile = path.join(pendingDir, '.pending_auth');
  
  try {
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    fs.writeFileSync(pendingFile, JSON.stringify({ deviceCode, authUrl, timestamp: Date.now() }));
    return true;
  } catch (e) {
    console.error('[LingDu] Error saving pending auth:', e);
    return false;
  }
}

function loadPendingAuth() {
  const homeDir = os.homedir();
  const pendingFile = path.join(homeDir, '.LingDu', '.pending_auth');
  
  try {
    if (fs.existsSync(pendingFile)) {
      const data = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
      if (Date.now() - data.timestamp < 900000) {
        return data;
      }
      fs.unlinkSync(pendingFile);
    }
  } catch (e) {}
  return null;
}

function clearPendingAuth() {
  const homeDir = os.homedir();
  const pendingFile = path.join(homeDir, '.LingDu', '.pending_auth');
  try {
    if (fs.existsSync(pendingFile)) {
      fs.unlinkSync(pendingFile);
    }
  } catch (e) {}
}

module.exports = {
  requestDeviceCode,
  startPolling,
  stopPolling,
  savePendingAuth,
  loadPendingAuth,
  clearPendingAuth
};