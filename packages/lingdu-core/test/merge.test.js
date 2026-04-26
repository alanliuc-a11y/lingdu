const SchemaMerger = require('../src/schema/merger');

describe('Schema 演化', () => {
  test('连续 merge 5次', () => {
    const merger = new SchemaMerger();
    let cloudSchema = { preferences: [] };

    for (let i = 0; i < 5; i++) {
      const incoming = {
        preferences: [{
          type: 'communication_style',
          value: 'structured',
          source: ['openclaw']
        }]
      };

      cloudSchema.preferences = merger.mergePreferenceList(
        cloudSchema.preferences,
        incoming.preferences
      );

      const p = cloudSchema.preferences[0];
      console.log(`第${i+1}次: frequency=${p.frequency}, confidence=${p.confidence.toFixed(2)}`);
    }

    expect(cloudSchema.preferences[0].frequency).toBe(5);
    expect(cloudSchema.preferences[0].confidence).toBeCloseTo(0.79, 1);
  });

  test('不同 preference 不合并', () => {
    const merger = new SchemaMerger();
    const existing = [{ type: 'style', value: 'structured', frequency: 3, confidence: 0.68, last_seen: '...', source: ['a'] }];
    const incoming = [{ type: 'style', value: 'concise', source: ['a'] }];

    const result = merger.mergePreferenceList(existing, incoming);

    expect(result).toHaveLength(2);
  });

  test('source 去重合并', () => {
    const merger = new SchemaMerger();
    const existing = [{ type: 'style', value: 'structured', frequency: 2, confidence: 0.6, last_seen: '...', source: ['openclaw'] }];
    const incoming = [{ type: 'style', value: 'structured', source: ['claude'] }];

    const result = merger.mergePreferenceList(existing, incoming);

    expect(result[0].source).toEqual(['openclaw', 'claude']);
    expect(result[0].frequency).toBe(3);
  });
});
