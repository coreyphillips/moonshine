"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const database_1 = require("../lib/database");
describe('database', () => {
    it('simple', () => {
        const list = database_1.getDefaultCoinNames().map(name => database_1.getDefaultPeers(name));
        assert(list instanceof Array);
    });
    it('no register', () => {
        const list = database_1.getDefaultPeers("_____XXXXXX_____");
        assert(list instanceof Array);
        assert(list.length === 0);
    });
});
