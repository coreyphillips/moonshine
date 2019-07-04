"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const parse = require("../lib/parse");
describe('parse', () => {
    it('tcp only', () => {
        const o = parse.parsePeerString("electrum-mona.bitbank.cc t");
        assert(o.host === "electrum-mona.bitbank.cc", "host");
        assert(o.tcp === 50001, "tcp");
        assert(o.ssl === null, "ssl");
        assert(o.pruning === null, "pruning");
        assert(o.http === null, "http");
        assert(o.https === null, "https");
    });
    it('ssl only', () => {
        const o = parse.parsePeerString("electrum-mona.bitbank.cc s");
        assert(o.host === "electrum-mona.bitbank.cc", "host");
        assert(o.tcp === null, "tcp");
        assert(o.ssl === 50002, "ssl");
        assert(o.pruning === null, "pruning");
        assert(o.http === null, "http");
        assert(o.https === null, "https");
    });
    it('tcp and ssl both', () => {
        const o = parse.parsePeerString("electrum-mona.bitbank.cc s t");
        assert(o.host === "electrum-mona.bitbank.cc", "host");
        assert(o.tcp === 50001, "tcp");
        assert(o.ssl === 50002, "ssl");
        assert(o.pruning === null, "pruning");
        assert(o.http === null, "http");
        assert(o.https === null, "https");
    });
    it('full spec', () => {
        const o = parse.parsePeerString("electrum-mona.bitbank.cc s51002 t51001 p1000 h80 g443");
        assert(o.host === "electrum-mona.bitbank.cc", "host");
        assert(o.tcp === 51001, "tcp");
        assert(o.ssl === 51002, "ssl");
        assert(o.pruning === 1000, "pruning");
        assert(o.http === 80, "http");
        assert(o.https === 443, "https");
    });
    it('error', (done) => {
        try {
            parse.parsePeerString("electrum-mona.bitbank.cc");
            done(new Error());
        }
        catch (e) {
            done();
        }
    });
});
