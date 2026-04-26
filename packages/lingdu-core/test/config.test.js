const { ConfigManager } = require('../src/config/manager');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('ConfigManager 测试', () => {
  let tempDir;
  let configMgr;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `lingdu-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    configMgr = new ConfigManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('创建配置目录', () => {
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  test('保存和加载配置', () => {
    const config = {
      token: 'test-token',
      device_id: 'test-device',
      cloud_url: 'https://soulsync.work'
    };

    configMgr.save(config);
    const loaded = configMgr.load();

    expect(loaded.token).toBe('test-token');
    expect(loaded.device_id).toBe('test-device');
    expect(loaded.cloud_url).toBe('https://soulsync.work');
  });

  test('配置文件不存在时返回 null', () => {
    const loaded = configMgr.load();
    expect(loaded).toBeNull();
  });

  test('清除配置', () => {
    const config = { 
      token: 'test-token', 
      device_id: 'test-device',
      cloud_url: 'https://soulsync.work'
    };
    configMgr.save(config);
    
    configMgr.clear();
    const loaded = configMgr.load();
    
    // clear() 删除 token、email、device_id、device_name
    expect(loaded.token).toBeUndefined();
    expect(loaded.device_id).toBeUndefined();
    // cloud_url 应该保留
    expect(loaded.cloud_url).toBe('https://soulsync.work');
  });
});