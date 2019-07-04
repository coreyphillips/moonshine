export const protocol = {
    h:"http",
    g:"https",
    s:"ssl",
    t:"tcp",
    p:"pruning",
}
export const port_default = {
    h:8081,
    g:8082,
    s:50002,
    t:50001,
    p:null,
}

export interface NodeInfo{
    host: string
    ssl: number | null
    tcp: number | null
    pruning: number | null
    http: number | null
    https: number | null
}

export const parser = (fields: Array<string>): NodeInfo => {
    if(fields.length < 2){
        throw new Error('parse error')
    }
    const host: string = fields[0]
    const result: NodeInfo = fields.slice(1).reduce((r: NodeInfo, field: string)=> {
        const protocol_short: string = field.slice(0, 1) // 1 char
        const option_value: string = field.slice(1)
        const value: number = option_value !== '' ? parseInt(option_value) : port_default[protocol_short]
        r[protocol[protocol_short]] = value
        return r
    }, {host:host, ssl:null, tcp:null, pruning:null, http:null, https:null})
    return result
}

export const parsePeerString = (peerstring: string): NodeInfo => parser(peerstring.split(' '))

