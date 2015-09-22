"use strict";

const assert = require("assert");

const duplexer2 = require("./");
const {Readable, Writable} = require("readable-stream");

describe("duplexer2", () => {
  let writable;
  let readable;

  beforeEach(() => {
    writable = new Writable({objectMode: true});
    readable = new Readable({objectMode: true});

    writable._write = (data, enc, cb) => cb();
    readable._read = () => {};
  });

  it("should interact with the writable stream properly for writing", done => {
    writable._write = (data, enc, cb) => {
      assert.strictEqual(data.toString(), "well hello there");
      done();
      cb();
    };

    duplexer2(writable, readable).write("well hello there");
  });

  it("should interact with the readable stream properly for reading", done => {
    duplexer2(writable, readable)
    .on("data", data => {
      assert.strictEqual(data.toString(), "well hello there");
      done();
    });

    readable.push("well hello there");
  });

  it("should end the writable stream, causing it to finish", done => {
    writable.once("finish", done);
    duplexer2(writable, readable).end();
  });

  it("should finish when the writable stream finishes", done => {
    duplexer2(writable, readable).once("finish", done);
    writable.end();
  });

  it("should end when the readable stream ends", done => {
    duplexer2(writable, readable)
    .once("end", done)
    .resume(); // required to let "end" fire without reading

    readable.push(null);
  });

  it("should bubble errors from the writable stream when no behaviour is specified", done => {
    const originalErr = Error("testing");

    duplexer2(writable, readable)
    .on("error", err => {
      assert.strictEqual(err, originalErr);
      done();
    });

    writable.emit("error", originalErr);
  });

  it("should bubble errors from the readable stream when no behaviour is specified", done => {
    const originalErr = Error("testing");

    duplexer2(writable, readable)
    .on("error", err => {
      assert.strictEqual(err, originalErr);
      done();
    });

    readable.emit("error", originalErr);
  });

  it("should bubble errors from the writable stream when bubbleErrors is true", done => {
    const originalErr = Error("testing");

    duplexer2({bubbleErrors: true}, writable, readable)
    .on("error", err => {
      assert.strictEqual(err, originalErr);
      done();
    });

    writable.emit("error", originalErr);
  });

  it("should bubble errors from the readable stream when bubbleErrors is true", function(done) {
    const originalErr = Error("testing");

    duplexer2({bubbleErrors: true}, writable, readable)
    .on("error", function(err) {
      assert.strictEqual(err, originalErr);
      done();
    });

    readable.emit("error", originalErr);
  });

  it("should not bubble errors from the writable stream when bubbleErrors is false", done => {
    const timeout = setTimeout(done, 25);

    duplexer2({bubbleErrors: false}, writable, readable)
    .on("error", err => {
      clearTimeout(timeout);
      done(Error("shouldn't bubble error"));
    });

    writable
    .on("error", () => {}) // prevent uncaught error exception
    .emit("error", Error("testing"));
  });

  it("should not bubble errors from the readable stream when bubbleErrors is false", done => {
    const timeout = setTimeout(done, 25);

    duplexer2({bubbleErrors: false}, writable, readable)
    .on("error", err => {
      clearTimeout(timeout);
      done(Error("shouldn't bubble error"));
    });

    readable
    .on("error", () => {}) // prevent uncaught error exception
    .emit("error", Error("testing"));
  });

  it("should work with streams1", function(done) {
    const readable1 = new Readable();
    readable1.readable = true;
    readable1._read = () => {};

    duplexer2(writable, readable1)
    .on("readable", function() {
      assert.strictEqual(this.read().toString(), "well hello there");
      done();
    });

    // making sure we're on compat mode.
    readable1.on('end', function() {})
    readable1.push("well hello there");
  })
});
