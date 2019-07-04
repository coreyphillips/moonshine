"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const parse = require("./parse");
const peers = JSON.parse(fs.readFileSync(__dirname + '/../../fixture/peers.json', 'utf8'));
const coinnames = Object.keys(peers);
const getPeers = (coinname) => {
    if (coinnames.includes(coinname)) {
        return peers[coinname];
    }
    else
        return [];
};
exports.getDefaultPeers = (coinname) => getPeers(coinname).map(parse.parsePeerString);
exports.getDefaultCoinNames = () => coinnames;
