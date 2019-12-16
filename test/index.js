/* eslint-disable no-console */
const path = require('path');
const parse = require('../src/index');

const sampleFile = require.resolve('../sample/index.js');

const result = parse(path.dirname(sampleFile));

console.dir(result, { depth: null });
