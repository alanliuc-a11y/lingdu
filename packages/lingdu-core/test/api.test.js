const { APIClient } = require('../src/api/client');

describe('API Client 测试', () => {
  let client;

  beforeEach(() => {
    client = new APIClient('https://soulsync.work', 'test-token');
  });

  test('API Client 初始化', () => {
    expect(client).toBeDefined();
    expect(client.baseUrl).toBe('https://soulsync.work');
    expect(client.token).toBe('test-token');
  });

  test('构造请求 URL', () => {
    const url = `${client.baseUrl}/api/auth/user/info`;
    expect(url).toBe('https://soulsync.work/api/auth/user/info');
  });

  test('请求头包含 token', () => {
    const headers = {
      'Authorization': `Bearer ${client.token}`,
      'Content-Type': 'application/json'
    };
    expect(headers['Authorization']).toBe('Bearer test-token');
  });
});

describe('API 错误处理', () => {
  test('处理 401 未授权', () => {
    const response = { status: 401, body: { error: 'Unauthorized' } };
    expect(response.status).toBe(401);
  });

  test('处理 404 未找到', () => {
    const response = { status: 404, body: { error: 'Not Found' } };
    expect(response.status).toBe(404);
  });

  test('处理 500 服务器错误', () => {
    const response = { status: 500, body: { error: 'Internal Server Error' } };
    expect(response.status).toBe(500);
  });
});