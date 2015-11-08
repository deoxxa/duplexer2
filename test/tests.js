"use strict";

var assert = require("assert");
var stream = require("readable-stream");

var duplexer2 = require("../");

describe("duplexer2", function() {
  var writable, readable;

  beforeEach(function() {
    writable = new stream.Writable({objectMode: true});
    readable = new stream.Readable({objectMode: true});

    writable._write = function _write(input, encoding, done) {
      return done();
    };

    readable._read = function _read(n) {
    };
  });

  it("should interact with the writable stream properly for writing", function(done) {
    var duplex = duplexer2(writable, readable);

    writable._write = function _write(input, encoding, _done) {
      assert.strictEqual(input.toString(), "well hello there");

      return done();
    };

    duplex.write("well hello there");
  });

  it("should interact with the readable stream properly for reading", function(done) {
    var duplex = duplexer2(writable, readable);

    duplex.on("data", function(e) {
      assert.strictEqual(e.toString(), "well hello there");

      return done();
    });

    readable.push("well hello there");
  });

  it("should end the writable stream, causing it to finish", function(done) {
    var duplex = duplexer2(writable, readable);

    writable.once("finish", done);

    duplex.end();
  });

  it("should finish when the writable stream finishes", function(done) {
    var duplex = duplexer2(writable, readable);

    duplex.once("finish", done);

    writable.end();
  });

  it("should end when the readable stream ends", function(done) {
    var duplex = duplexer2(writable, readable);

    // required to let "end" fire without reading
    duplex.resume();
    duplex.once("end", done);

    readable.push(null);
  });

  it("should bubble errors from the writable stream when no behaviour is specified", function(done) {
    var duplex = duplexer2(writable, readable);

    var originalErr = Error("testing");

    duplex.on("error", function(err) {
      assert.strictEqual(err, originalErr);

      return done();
    });

    writable.emit("error", originalErr);
  });

  it("should bubble errors from the readable stream when no behaviour is specified", function(done) {
    var duplex = duplexer2(writable, readable);

    var originalErr = Error("testing");

    duplex.on("error", function(err) {
      assert.strictEqual(err, originalErr);

      return done();
    });

    readable.emit("error", originalErr);
  });

  it("should bubble errors from the writable stream when bubbleErrors is true", function(done) {
    var duplex = duplexer2({bubbleErrors: true}, writable, readable);

    var originalErr = Error("testing");

    duplex.on("error", function(err) {
      assert.strictEqual(err, originalErr);

      return done();
    });

    writable.emit("error", originalErr);
  });

  it("should bubble errors from the readable stream when bubbleErrors is true", function(done) {
    var duplex = duplexer2({bubbleErrors: true}, writable, readable);

    var originalErr = Error("testing");

    duplex.on("error", function(err) {
      assert.strictEqual(err, originalErr);

      return done();
    });

    readable.emit("error", originalErr);
  });

  it("should not bubble errors from the writable stream when bubbleErrors is false", function(done) {
    var duplex = duplexer2({bubbleErrors: false}, writable, readable);

    var timeout = setTimeout(done, 25);

    duplex.on("error", function(err) {
      clearTimeout(timeout);

      return done(Error("shouldn't bubble error"));
    });

    // prevent uncaught error exception
    writable.on("error", function() {});

    writable.emit("error", Error("testing"));
  });

  it("should not bubble errors from the readable stream when bubbleErrors is false", function(done) {
    var duplex = duplexer2({bubbleErrors: false}, writable, readable);

    var timeout = setTimeout(done, 25);

    duplex.on("error", function(err) {
      clearTimeout(timeout);

      return done(Error("shouldn't bubble error"));
    });

    // prevent uncaught error exception
    readable.on("error", function() {});

    readable.emit("error", Error("testing"));
  });

  it("should work with streams1", function(done) {
    var readable1 = new stream;
    readable1.readable = true;
    readable1._read = function() {}
    var duplex = duplexer2(writable, readable1);

    duplex.on("readable", function(e) {
      e = duplex.read()
      assert.strictEqual(e.toString(), "well hello there");

      return done();
    });

    // making sure we're on compat mode.
    readable1.on('end', function() {})

    readable1.push("well hello there");
  });

  it("should export the DuplexWrapper constructor", function() {
    assert.equal(typeof duplexer2.DuplexWrapper, "function");
  });

  it("should not force flowing-mode", function(done) {
    var writable = new stream.PassThrough();
    var readable = new stream.PassThrough();

    assert.equal(readable._readableState.flowing, null);

    var duplexStream = duplexer2(writable, readable);
    duplexStream.end("aaa");

    assert.equal(readable._readableState.flowing, null);

    var transformStream = new stream.Transform({
      transform: function(chunk, encoding, cb) {
        this.push(String(chunk).toUpperCase());
        cb();
      }
    });
    writable.pipe(transformStream).pipe(readable);

    assert.equal(readable._readableState.flowing, null);

    setTimeout(function() {
      assert.equal(readable._readableState.flowing, null);

      var src = "";
      duplexStream.on("data", function(buf) {
        src += String(buf);
      });
      duplexStream.on("end", function() {
        assert.equal(src, "AAA");

        done();
      });

      assert.equal(readable._readableState.flowing, null);
    });
  });
});
