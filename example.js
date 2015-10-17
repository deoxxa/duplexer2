#!/usr/bin/env node --harmony_destructuring
"use strict";

const duplexer2 = require(".");
const {Readable, Writable} = require("stream");

const readable = new Readable({read() {/* no-op */}});
const writable = new Writable({
  write(data, enc, cb) {
    if (readable.push(data)) {
      cb();
      return;
    }
    readable.once("drain", cb);
  }
});

// simulate the readable thing closing after a bit
writable.once("finish", () => setTimeout(() => readable.push(null), 300));

const duplex = duplexer2({}, writable, readable)
.on("data", data => console.log("got data", data.toString()))
.on("finish", () => console.log("got finish event"))
.on("end", () => console.log("got end event"));

duplex.write("oh, hi there", () => console.log("finished writing"));
duplex.end(() => console.log("finished ending"));
