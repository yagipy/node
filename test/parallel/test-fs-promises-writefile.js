'use strict';

const common = require('../common');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const tmpdir = require('../common/tmpdir');
const assert = require('assert');
const tmpDir = tmpdir.path;
const { Readable } = require("stream");

tmpdir.refresh();

const dest = path.resolve(tmpDir, 'tmp.txt');
const otherDest = path.resolve(tmpDir, 'tmp-2.txt');
const buffer = Buffer.from('abc'.repeat(1000));
const buffer2 = Buffer.from('xyz'.repeat(1000));
const stream = Readable.from(["abc".repeat(1000)]);
const iterable = {
  [Symbol.iterator]:function* () {
    yield "a";
    yield "b";
    yield "c";
  }
};
const asyncIterable = {
  async* [Symbol.asyncIterator]() {
    yield "a";
    yield "b";
    yield "c";
  }
};

async function doWrite() {
  await fsPromises.writeFile(dest, buffer);
  const data = fs.readFileSync(dest);
  assert.deepStrictEqual(data, buffer);
}

async function doWriteWithCancel() {
  const controller = new AbortController();
  const { signal } = controller;
  process.nextTick(() => controller.abort());
  assert.rejects(fsPromises.writeFile(otherDest, buffer, { signal }), {
    name: 'AbortError'
  });
}

async function doAppend() {
  await fsPromises.appendFile(dest, buffer2, { flag: null });
  const data = fs.readFileSync(dest);
  const buf = Buffer.concat([buffer, buffer2]);
  assert.deepStrictEqual(buf, data);
}

async function doRead() {
  const data = await fsPromises.readFile(dest);
  const buf = fs.readFileSync(dest);
  assert.deepStrictEqual(buf, data);
}

async function doReadWithEncoding() {
  const data = await fsPromises.readFile(dest, 'utf-8');
  const syncData = fs.readFileSync(dest, 'utf-8');
  assert.strictEqual(typeof data, 'string');
  assert.deepStrictEqual(data, syncData);
}

async function doWriteStream() {
  await fsPromises.writeFile(dest, stream);
  let result = "";
  for await (const v of stream) result += v;
  const data = fs.readFileSync(dest);
  assert.deepStrictEqual(data, result);
}

async function doWriteIterable() {
  await fsPromises.writeFile(dest, iterable);
  let result = "";
  for await (const v of iterable) result += v;
  const data = fs.readFileSync(dest);
  assert.deepStrictEqual(data, result);
}

async function doWriteAsyncIterable() {
  await fsPromises.writeFile(dest, asyncIterable);
  let result = "";
  for await (const v of iterable) result += v;
  const data = fs.readFileSync(dest);
  assert.deepStrictEqual(data, result);
}

doWrite()
  .then(doWriteWithCancel)
  .then(doAppend)
  .then(doRead)
  .then(doReadWithEncoding)
  .then(doWriteStream)
  .then(doWriteIterable)
  .then(doWriteAsyncIterable)
  .then(common.mustCall());
