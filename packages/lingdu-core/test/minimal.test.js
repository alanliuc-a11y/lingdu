const MemoryParser = require('../src/schema/parser');
const MemoryGenerator = require('../src/schema/generator');

describe('最小验证', () => {
  test('闭环跑通', () => {
    const input = `用户名：Alan
喜欢结构化回答`;

    const parser = new MemoryParser();
    const generator = new MemoryGenerator();

    const schema = parser.parse(input);

    expect(schema.identity.name).toBe('Alan');
    expect(schema.preferences).toHaveLength(1);
    expect(schema.preferences[0]).toMatchObject({
      type: 'communication_style',
      value: 'structured',
      source: 'openclaw'
    });

    const output = generator.generate(schema);

    expect(output).toContain('Alan');
    expect(output).toContain('structured');

    console.log('=== 输入 ===');
    console.log(input);
    console.log('\n=== Schema ===');
    console.log(JSON.stringify(schema, null, 2));
    console.log('\n=== 输出 ===');
    console.log(output);
  });

  test('不覆盖原文件', () => {
    const original = `# 我的记忆

一些重要内容

## LingDu Sync
旧数据
`;

    const schema = {
      version: '1.0.0',
      source: 'openclaw',
      identity: { name: 'Alan' },
      preferences: [{
        type: 'communication_style',
        value: 'structured',
        source: 'openclaw'
      }],
      facts: []
    };

    const generator = new MemoryGenerator();
    const output = generator.generate(schema, original);

    expect(output).toContain('我的记忆');
    expect(output).toContain('一些重要内容');

    const matches = output.match(/## LingDu Sync/g);
    expect(matches).toHaveLength(1);

    expect(output).toContain('Alan');
    expect(output).toContain('structured');
  });
});
