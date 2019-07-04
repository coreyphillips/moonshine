"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protocol = {
    h: "http",
    g: "https",
    s: "ssl",
    t: "tcp",
    p: "pruning",
};
exports.port_default = {
    h: 8081,
    g: 8082,
    s: 50002,
    t: 50001,
    p: null,
};
exports.parser = (fields) => {
    if (fields.length < 2) {
        throw new Error('parse error');
    }
    const host = fields[0];
    const result = fields.slice(1).reduce((r, field) => {
        const protocol_short = field.slice(0, 1); // 1 char
        const option_value = field.slice(1);
        const value = option_value !== '' ? parseInt(option_value) : exports.port_default[protocol_short];
        r[exports.protocol[protocol_short]] = value;
        return r;
    }, { host: host, ssl: null, tcp: null, pruning: null, http: null, https: null });
    return result;
};
exports.parsePeerString = (peerstring) => exports.parser(peerstring.split(' '));
