import * as assert from 'assert'
import { getDefaultCoinNames, getDefaultPeers, parsePeerString } from '..'

describe('module', () => {
    it('simple1', () => {
        const list = getDefaultCoinNames().map(name => getDefaultPeers(name))
        assert(list instanceof Array)
    })
    it('simple2', () => {
        const o = parsePeerString("electrum-mona.bitbank.cc t")
        assert(o.host === "electrum-mona.bitbank.cc", "host")
    })
})
