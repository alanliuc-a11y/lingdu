const fs = require('fs');
const path = require('path');
const os = require('os');
const WorkBuddyAdapter = require('../src/schema/workbuddy-adapter');

const TMP_DIR = path.join(os.tmpdir(), 'lingdu-test-workbuddy');

beforeEach(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

function createMemeryFile(dir, uid, name, version) {
  const content = `# User Memory Profile

> Last updated: 2025-01-01T00:00:00.000Z
> Version: ${version || 1}

## Basic Info

- **UID**: ${uid || 'test-uid-1234'}
- **Name**: ${name || 'TestUser'}

## Work Context

_(Your work context)_

---

<!-- RAW_JSON_START
{
  "uid": "${uid || 'test-uid-1234'}",
  "name": "${name || 'TestUser'}",
  "memoryBlock": ""
}
RAW_JSON_END -->
`;
  const filePath = path.join(dir, `${uid || 'test-uid-1234'}_memery.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('WorkBuddyAdapter', () => {
  test('read() parses existing memery file', () => {
    const filePath = createMemeryFile(TMP_DIR, 'abc-123', 'Alan', 3);
    const adapter = new WorkBuddyAdapter(filePath);
    const schema = adapter.read();

    expect(schema.uid).toBe('abc-123');
    expect(schema.name).toBe('Alan');
    expect(schema.version).toBe(3);
    expect(schema.preferences).toEqual([]);
    expect(schema.facts).toEqual([]);
  });

  test('read() returns empty schema when file missing', () => {
    const adapter = new WorkBuddyAdapter(path.join(TMP_DIR, 'nonexistent_memery.md'));
    const schema = adapter.read();

    expect(schema.uid).toBe('');
    expect(schema.name).toBe('');
    expect(schema.version).toBe(0);
  });

  test('write() creates memery file with incremented version', () => {
    const filePath = path.join(TMP_DIR, 'new-uid_memery.md');
    const adapter = new WorkBuddyAdapter(filePath);

    const schema = { uid: 'new-uid', name: 'Bob', version: 1 };
    adapter.write(schema);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('**UID**: new-uid');
    expect(content).toContain('**Name**: Bob');
    expect(content).toContain('Version: 2');
  });

  test('write() updates state file', () => {
    const filePath = path.join(TMP_DIR, 'state-uid_memery.md');
    const adapter = new WorkBuddyAdapter(filePath);

    const schema = { uid: 'state-uid', name: 'Charlie', version: 5 };
    adapter.write(schema);

    const stateFile = path.join(TMP_DIR, 'user-memery-state.json');
    expect(fs.existsSync(stateFile)).toBe(true);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    expect(state['state-uid'].current_version).toBe(6);
  });

  test('round-trip: write then read preserves data', () => {
    const filePath = path.join(TMP_DIR, 'round-uid_memery.md');
    const adapter = new WorkBuddyAdapter(filePath);

    const original = { uid: 'round-uid', name: 'Dana', version: 2 };
    adapter.write(original);

    const read = adapter.read();
    expect(read.uid).toBe('round-uid');
    expect(read.name).toBe('Dana');
    expect(read.version).toBe(3);
  });

  test('parse() extracts uid, name, version from content', () => {
    const adapter = new WorkBuddyAdapter('/dev/null');
    const content = `# User Memory Profile

> Last updated: 2025-06-01T12:00:00.000Z
> Version: 7

## Basic Info

- **UID**: my-uid-999
- **Name**: Eve

## Work Context

Some context here
`;

    const schema = adapter.parse(content);
    expect(schema.uid).toBe('my-uid-999');
    expect(schema.name).toBe('Eve');
    expect(schema.version).toBe(7);
  });
});
