const parse = require('..')
const x = parse.getDefaultPeers("Monacoin").filter(v => v.ssl)
console.log(x)
