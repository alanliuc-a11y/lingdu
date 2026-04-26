#!/usr/bin/env node

const { program } = require('commander');
const cli = require('../src/index');

cli(program);
program.parse(process.argv);
