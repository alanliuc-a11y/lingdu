class MemoryGenerator {
  generate(schema, originalContent = '') {
    const block = this.buildLingDuBlock(schema);

    const cleaned = originalContent.replace(
      /## LingDu Sync[\s\S]*?(?=\n##|\n$|$)/g,
      ''
    );

    return cleaned.trim() + '\n\n' + block;
  }

  buildLingDuBlock(schema) {
    let content = '## LingDu Sync\n\n';

    if (schema.identity.name) {
      content += `用户名：${schema.identity.name}\n\n`;
    }

    if (schema.preferences.length > 0) {
      content += '偏好：\n';
      schema.preferences.forEach(pref => {
        content += `- ${pref.value}\n`;
      });
    }

    return content;
  }
}

module.exports = MemoryGenerator;
