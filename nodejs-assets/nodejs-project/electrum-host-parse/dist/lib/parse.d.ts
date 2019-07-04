export declare const protocol: {
    h: string;
    g: string;
    s: string;
    t: string;
    p: string;
};
export declare const port_default: {
    h: number;
    g: number;
    s: number;
    t: number;
    p: null;
};
export interface NodeInfo {
    host: string;
    ssl: number | null;
    tcp: number | null;
    pruning: number | null;
    http: number | null;
    https: number | null;
}
export declare const parser: (fields: string[]) => NodeInfo;
export declare const parsePeerString: (peerstring: string) => NodeInfo;
