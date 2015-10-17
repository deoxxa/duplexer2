"use strong";

const duplexer2 = require("./");
const {Readable, Writable} = require("readable-stream");
const {test} = require("tape");
const through = require("through");

class FixtureReadable extends Readable {
  constructor(...args) {
    super(Object.assign({
      objectMode: true,
      read: () => {}
    }, ...args));
  }
}

class FixtureWritable extends Writable {
  constructor(...args) {
    super(Object.assign({
      objectMode: true,
      write: (data, enc, cb) => cb()
    }, ...args));
  }
}

test("duplexer2", t => {
  t.plan(11);

  duplexer2(
    new FixtureWritable({
      write(data, enc, cb) {
        t.strictEqual(
          data.toString(),
          "Hi",
          "should interact with the writable stream properly for writing"
        );
        cb();
      }
    }),
    new FixtureReadable()
  ).write("Hi");

  const duplexStream = duplexer2(new FixtureWritable(), new FixtureReadable())
  .once("data", data => {
    t.strictEqual(
      data.toString(),
      "H",
      "should interact with the readable stream properly for reading"
    );
  });

  duplexStream._readable.push("H");
  process.nextTick(() => {
    duplexStream.once("data", data => {
      t.strictEqual(
        data.toString(),
        "ello",
        "should read data multiple times"
      );
    });
    duplexStream._readable.push("ello");
  });

  duplexer2(new FixtureWritable().once("finish", () => {
    t.pass("should end the writable stream, causing it to finish");
  }), new FixtureReadable()).end();

  duplexer2(new FixtureWritable(), new FixtureReadable())
  .once("finish", () => t.pass("should finish when the writable stream finishes"))
  ._writable.end();

  duplexer2(new FixtureWritable(), new FixtureReadable())
  .once("end", () => t.pass("should end when the readable stream ends"))
  .resume() // required to let "end" fire without reading
  ._readable.push(null);

  const originalWritableErr = Error("testing");

  duplexer2(new FixtureWritable(), new FixtureReadable())
  .on("error", err => {
    t.strictEqual(
      err,
      originalWritableErr,
      "should bubble errors from the writable stream"
    );
  })
  ._writable.emit("error", originalWritableErr);

  const originalReadableErr = Error("testing");

  duplexer2(new FixtureWritable(), new FixtureReadable())
  .on("error", err => {
    t.strictEqual(
      err,
      originalReadableErr,
      "should bubble errors from the readable stream"
    );
  })
  ._readable.emit("error", originalReadableErr);

  const timeout = setTimeout(() => {
    t.pass("should not bubble errors from the streams when bubbleErrors is false");
  }, 25);

  const writable = new FixtureWritable();
  const readable = new FixtureReadable();

  duplexer2({bubbleErrors: false}, writable, readable)
  .on("error", () => {
    clearTimeout(timeout);
    t.fail("shouldn't bubble error");
  });

  writable
  .on("error", () => {}) // prevent uncaught error exception
  .emit("error", Error("testing"));

  readable
  .on("error", () => {}) // prevent uncaught error exception
  .emit("error", Error("testing"));

  const stream1 = through();

  duplexer2(null, new FixtureWritable(), stream1)
  .on("readable", function() {
    t.strictEqual(this.read().toString(), "well hello there", "should work with streams1");
  });

  stream1.push("well hello there");

  t.throws(
    () => duplexer2({bubbleErrors: 1}, new Writable(), new Readable()),
    /TypeError.*1 is not a Boolean value\./,
    "should throw a type error when it takes `bubbleError` option but it's not Boolean"
  );
});
