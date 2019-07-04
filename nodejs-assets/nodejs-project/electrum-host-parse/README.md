# node-electrum-host-parse

[![NPM](https://nodei.co/npm/electrum-host-parse.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/electrum-host-parse)  
[![Build Status](https://secure.travis-ci.org/you21979/node-electrum-host-parse.png?branch=master)](https://travis-ci.org/you21979/node-electrum-host-parse)
[![Coverage Status](https://coveralls.io/repos/github/you21979/node-electrum-host-parse/badge.svg?branch=master)](https://coveralls.io/github/you21979/node-electrum-host-parse?branch=master)

electrum peer string parser

## spec

* http://docs.electrum.org/en/latest/protocol.html#server-peers-subscribe

## install

```
npm i electrum-host-parse
```

## usage

* jscode

```
const parse = require('electrum-host-parse')
const hostobject = parse.parsePeerString("electrum-mona.bitbank.cc s50002 t50001")
console.log(hostobject)
```

* typescript

```
import * as parse from 'electrum-host-parse'
const hostobject = parse.parsePeerString("electrum-mona.bitbank.cc s50002 t50001")
console.log(hostobject)
```

* result

```
{ host: 'electrum-mona.bitbank.cc',
  ssl: 50002,
  tcp: 50001,
  pruning: null,
  http: null,
  https: null }
```

