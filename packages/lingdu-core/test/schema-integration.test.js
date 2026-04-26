const MemoryParser = require('../src/schema/parser');
const MemoryGenerator = require('../src/schema/generator');
const SchemaMerger = require('../src/schema/merger');

describe('Schema 完整流程测试', () => {
  test('Parser → Merger → Generator 闭环', () => {
    const parser = new MemoryParser();
    const merger = new SchemaMerger();
    const generator = new MemoryGenerator();

    // 第一次解析
    const input1 = `用户名：Alan
喜欢结构化回答`;
    const schema1 = parser.parse(input1);

    // 初始化 frequency 和 confidence
    schema1.preferences = schema1.preferences.map(p => ({
      ...p,
      frequency: 1,
      confidence: 0.5,
      last_seen: new Date().toISOString()
    }));

    // 第二次解析（相同偏好）
    const input2 = `用户名：Alan
喜欢结构化回答`;
    const schema2 = parser.parse(input2);

    // 合并
    const merged = {
      ...schema1,
      preferences: merger.mergePreferenceList(
        schema1.preferences,
        schema2.preferences
      )
    };

    // 验证合并结果
    expect(merged.preferences).toHaveLength(1);
    expect(merged.preferences[0].frequency).toBe(2);
    expect(merged.preferences[0].confidence).toBeCloseTo(0.6, 1);

    // 生成输出
    const output = generator.generate(merged);
    expect(output).toContain('Alan');
    expect(output).toContain('structured');
  });

  test('多个偏好合并', () => {
    const parser = new MemoryParser();
    const merger = new SchemaMerger();

    const input1 = `用户名：Alan
喜欢结构化回答
喜欢简洁`;

    const input2 = `用户名：Alan
喜欢结构化回答`;

    const schema1 = parser.parse(input1);
    const schema2 = parser.parse(input2);

    // 初始化 frequency 和 confidence
    schema1.preferences = schema1.preferences.map(p => ({
      ...p,
      frequency: 1,
      confidence: 0.5,
      last_seen: new Date().toISOString()
    }));

    const merged = merger.mergePreferenceList(
      schema1.preferences,
      schema2.preferences
    );

    // 应该有 2 个偏好
    expect(merged.length).toBe(2);

    // structured 应该有 frequency=2
    const structured = merged.find(p => p.value === 'structured');
    expect(structured.frequency).toBe(2);

    // concise 应该有 frequency=1
    const concise = merged.find(p => p.value === 'concise');
    expect(concise.frequency).toBe(1);
  });

  test('Source 去重合并', () => {
    const merger = new SchemaMerger();

    const existing = [
      { 
        type: 'communication_style',
        value: 'structured',
        frequency: 1,
        confidence: 0.5,
        last_seen: new Date().toISOString(),
        source: ['openclaw']
      }
    ];

    const incoming = [
      { 
        type: 'communication_style',
        value: 'structured',
        source: ['claude']
      }
    ];

    const merged = merger.mergePreferenceList(existing, incoming);

    expect(merged).toHaveLength(1);
    expect(merged[0].source).toEqual(['openclaw', 'claude']);
    expect(merged[0].frequency).toBe(2);
  });
});