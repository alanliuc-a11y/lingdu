const SCHEMA_VERSION = '1.0.0';

const EMPTY_SCHEMA = {
  version: SCHEMA_VERSION,
  source: 'openclaw',
  identity: {
    name: ''
  },
  facts: [],
  preferences: []
};

module.exports = {
  SCHEMA_VERSION,
  EMPTY_SCHEMA
};
