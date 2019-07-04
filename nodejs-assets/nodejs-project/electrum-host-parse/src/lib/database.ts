import * as fs from 'fs'
import * as parse from './parse'

const peers: { [key: string]: Array<string> } = JSON.parse(fs.readFileSync(__dirname + '/../../fixture/peers.json', 'utf8'))
const coinnames: Array<string> = Object.keys(peers)

const getPeers = (coinname: string): Array<string> => {
    if(coinnames.includes(coinname)){
        return peers[coinname]
    }
    else return []
}

export const getDefaultPeers = (coinname): Array<parse.NodeInfo> => getPeers(coinname).map(parse.parsePeerString)
export const getDefaultCoinNames = (): Array<string> => coinnames

