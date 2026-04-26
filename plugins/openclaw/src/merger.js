class SchemaMerger {
  mergePreferenceList(existingList, incomingList) {
    const map = new Map();

    // 放入 existing
    existingList.forEach(p => {
      map.set(`${p.type}:${p.value}`, p);
    });

    // merge incoming
    incomingList.forEach(p => {
      const key = `${p.type}:${p.value}`;

      if (!map.has(key)) {
        // 新 preference
        map.set(key, {
          ...p,
          frequency: 1,
          confidence: 0.5,
          last_seen: new Date().toISOString()
        });
      } else {
        // 已存在，合并
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          frequency: existing.frequency + 1,
          confidence: existing.confidence + (1 - existing.confidence) * 0.2,
          last_seen: new Date().toISOString(),
          source: [...new Set([...existing.source, ...p.source])]
        });
      }
    });

    return Array.from(map.values());
  }
}

module.exports = SchemaMerger;
