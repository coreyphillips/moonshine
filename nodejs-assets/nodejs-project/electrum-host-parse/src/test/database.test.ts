import * as assert from 'assert'
import {getDefaultPeers, getDefaultCoinNames} from '../lib/database'

describe('database', () => {
    it('simple', () => {
        const list = getDefaultCoinNames().map(name => getDefaultPeers(name))
        assert(list instanceof Array)
    })
    it('no register', () => {
        const list = getDefaultPeers("_____XXXXXX_____")
        assert(list instanceof Array)
        assert(list.length === 0)
    })
})
