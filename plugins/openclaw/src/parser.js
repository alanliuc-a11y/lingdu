const { EMPTY_SCHEMA } = require('./schema');

class MemoryParser {
  parse(memoryContent) {
    const schema = JSON.parse(JSON.stringify(EMPTY_SCHEMA));

    schema.identity.name = this.extractName(memoryContent);
    schema.preferences = this.extractPreferences(memoryContent);

    return schema;
  }

  extractName(content) {
    const patterns = [
      /用户名[：:]\s*(\S+)/,
      /我是\s*(\S+)/,
      /My name is\s+(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const name = match[1];
        if (name.length <= 10 &&
            !name.includes('开发') &&
            !name.includes('用户')) {
          return name;
        }
      }
    }

    return '';
  }

  extractPreferences(content) {
    const typeMap = {
      '结构化': 'structured',
      'structured': 'structured',
      '简洁': 'concise',
      'concise': 'concise'
    };

    const found = new Map();

    for (const [keyword, normalized] of Object.entries(typeMap)) {
      if (content.includes(keyword)) {
        found.set(normalized, {
          type: 'communication_style',
          value: normalized,
          source: 'openclaw'
        });
      }
    }

    return Array.from(found.values());
  }
}

module.exports = MemoryParser;
