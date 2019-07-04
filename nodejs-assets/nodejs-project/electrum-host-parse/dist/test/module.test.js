"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const __1 = require("..");
describe('module', () => {
    it('simple1', () => {
        const list = __1.getDefaultCoinNames().map(name => __1.getDefaultPeers(name));
        assert(list instanceof Array);
    });
    it('simple2', () => {
        const o = __1.parsePeerString("electrum-mona.bitbank.cc t");
        assert(o.host === "electrum-mona.bitbank.cc", "host");
    });
});
