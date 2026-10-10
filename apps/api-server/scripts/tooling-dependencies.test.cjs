const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { createRequire } = require('node:module');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

const toolingRequire = createRequire(require.resolve('@istanbuljs/load-nyc-config'));

test('coverage tooling resolves YAML 4 without the vulnerable sprintf-js dependency', () => {
  assert.equal(toolingRequire('js-yaml/package.json').version, '4.3.2');
  const lock = JSON.parse(readFileSync(resolve(__dirname, '../../../package-lock.json'), 'utf8'));
  assert.equal(Object.keys(lock.packages).some((path) => path.endsWith('/node_modules/sprintf-js') || path === 'node_modules/sprintf-js'), false);
  assert.throws(() => toolingRequire.resolve('sprintf-js'), { code: 'MODULE_NOT_FOUND' });
});

test('coverage YAML preserves supported scalars, lists, aliases, and extended configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'irvite-tooling-config-'));
  try {
    await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true }));
    await writeFile(join(directory, 'base.yml'), 'all: true\ncheck-coverage: true\nlines: 80\nreporter: [text, json]\n');
    await writeFile(join(directory, '.nycrc.yml'), 'extends: ./base.yml\ninclude: &sourcePaths\n  - "src/**/*.ts"\nexclude: ["**/*.spec.ts"]\nextension: .ts\nrequire: ts-node/register\nreport-dir: coverage-local\nbranches: 75\nnotes: "%.1000000000f"\nsource-paths: *sourcePaths\n');
    const config = await loadNycConfig({ cwd: directory });
    assert.equal(config.cwd, directory);
    assert.equal(config.all, true);
    assert.equal(config.checkCoverage, true);
    assert.equal(config.lines, 80);
    assert.equal(config.branches, 75);
    assert.deepEqual(config.reporter, ['text', 'json']);
    assert.deepEqual(config.include, ['src/**/*.ts']);
    assert.deepEqual(config.sourcePaths, config.include);
    assert.deepEqual(config.exclude, ['**/*.spec.ts']);
    assert.deepEqual(config.extension, ['.ts']);
    assert.deepEqual(config.require, ['ts-node/register']);
    assert.equal(config.reportDir, 'coverage-local');
    // YAML text stays data: it must never be interpreted as a printf format.
    assert.equal(config.notes, '%.1000000000f');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('coverage YAML rejects invalid syntax and executable JavaScript tags', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'irvite-tooling-invalid-'));
  try {
    await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true }));
    const configPath = join(directory, '.nycrc.yml');
    await writeFile(configPath, 'include: [unterminated\n');
    await assert.rejects(loadNycConfig({ cwd: directory }), { name: 'YAMLException' });
    await writeFile(configPath, 'value: !!js/function "function () { return 1; }"\n');
    await assert.rejects(loadNycConfig({ cwd: directory }), { name: 'YAMLException' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
