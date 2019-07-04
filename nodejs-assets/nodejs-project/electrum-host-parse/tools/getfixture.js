const fs = require("fs")
const data = fs.readFileSync("./electrumx/lib/coins.py", 'utf8').split('\n').filter(v => v !== '')
const tbl = {}
const blacklist = ["CoinError", "Coin", "AuxPowMixin", "BitcoinMixin", "BitcoinTestnetMixin"]
let point = null
let pushflag = false

data.forEach(d => {
    if(d.indexOf("class") !== -1 && d.indexOf(":") !== -1){
        point = d.replace("class ", "").split("(")[0]
        if(blacklist.includes(point)){
            return;
        }
        if(point.indexOf("util.subclasses") !== -1){
            return;
        }
        if(point.indexOf("lookup_coin_class") !== -1){
            return;
        }
        if(point.indexOf("Mixin") !== -1){
            return;
        }
        tbl[point] = []
    }else{
        if(tbl[point]){
            const str = d.replace("bytes.fromhex", "").replace(/    /g, "")
            if(str.indexOf("PEERS = [") !== -1){
                pushflag = true
            }
            if(pushflag){
                tbl[point].push((str))
            }
            if(pushflag){
                if(str.indexOf("]") !== -1){
                    pushflag = false 
                }else if(str.indexOf("PEERS = []") !== -1){
                    pushflag = false 
                }else{
                }
            }
        }
    }
})

Object.keys(tbl).map(k => {
    tbl[k] = tbl[k].join("")
    if(tbl[k] === "PEERS = []"){
        tbl[k] = ''
    }
    if(tbl[k].indexOf("PEERS = [") !== -1){
        const list = tbl[k].replace("PEERS = [", "").replace("]", "").replace(/'/g, "").split(",").filter(v => v !== '')
        tbl[k] = list.filter(v => {
            if(v.indexOf(".onion") !== -1){
                return false
            }else{
                return true
            }
        })
    }
    if(tbl[k] === ""){
        tbl[k] = []
    }
})

console.log(JSON.stringify(tbl, null, 2))




