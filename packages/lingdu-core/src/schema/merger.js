class SchemaMerger {
  mergePreferenceList(existingList, incomingList) {
    const map = new Map();

    existingList.forEach(p => {
      map.set(`${p.type}:${p.value}`, p);
    });

    incomingList.forEach(p => {
      const key = `${p.type}:${p.value}`;

      if (!map.has(key)) {
        map.set(key, {
          ...p,
          frequency: 1,
          confidence: 0.5,
          last_seen: new Date().toISOString()
        });
      } else {
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
