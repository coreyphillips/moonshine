const rn_bridge = require("rn-bridge");
const ElectrumClient = require("electrum-client");
const api = require("./api");

const disconnectFromPeer = async ({ id, coin }) => {
	const failure = (data = {}) => {
		rn_bridge.channel.send(JSON.stringify({ error: true, id, method: "disconnectFromPeer", data }));
	};
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) {
			//No peer to disconnect from...
			rn_bridge.channel.send(JSON.stringify({ error: false, data: { message: "No peer to disconnect from.", coin }, id, method: "disconnectFromPeer" }));
			return;
		}
		
		//Attempt to disconnect from peer...
		//await api.mainClient[api.coin].close();
		api.mainClient[api.coin] = false;
		api.coin = "";
		rn_bridge.channel.send(JSON.stringify({error: false, id, method: "disconnectFromPeer", coin}));
	} catch (e) {
		failure(e);
	}
};

const subscribeHeader = async ({ coin, id } = {}) => {
	try {
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		api.mainClient[coin].subscribe.on('blockchain.headers.subscribe', (data) => {
			rn_bridge.channel.send(JSON.stringify({id, error: false, method: "subscribeHeader", data, coin}));
		});
	} catch (e) {
		rn_bridge.channel.send(JSON.stringify({id, error: true, method: "subscribeHeader", data: e, coin}));
	}
};

const subscribeAddress = async ({ coin, id, address = "" } = {}) => {
	try {
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		
		await api.mainClient[coin].subscribe.on('blockchain.scripthash.subscribe', (data) => {
			rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "subscribeAddress", data }));
		});
		
		const response = await api.mainClient[coin].blockchainScripthash_subscribe(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "subscribeAddress", data: response}));
	} catch (e) {
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method: "subscribeAddress", data: e }));
	}
};

const unSubscribeAddress = async ({ id, coin, scriptHashes = [] } = {}) => {
	try {
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		let responses = [];
		await Promise.all(
			scriptHashes.map(async (scriptHash) => {
				try {
					const response = await api.mainClient[coin].blockchainScripthash_unsubscribe(scriptHash);
					responses.push(response);
				} catch (e) {}
			})
		);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "unSubscribeAddress", data: responses}));
	} catch (e) {
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method: "unSubscribeAddress", data: e, scriptHashes }));
	}
};

const connectToPeer = async ({ id, peers = [], customPeers = [], coin = "bitcoin" } = {}) => {
	try {
		api.coin = coin;
		let customPeersLength = 0;
		try {
			customPeersLength = customPeers.length
		} catch (e) {}
		//Attempt to connect to specified peer
		if (customPeersLength > 0) {
			const {port = "", host = "", protocol = "ssl"} = customPeers[0];
			api.mainClient[coin] = new ElectrumClient(port, host, protocol);
			const connectionResponse = await api.mainClient[coin].connect();
			if (!connectionResponse.error) api.peer[coin] = { port: connectionResponse.data.port, host: connectionResponse.data.host, protocol: "ssl" };
			rn_bridge.channel.send(JSON.stringify({ id, error: connectionResponse.error, method: "connectToPeer", data: connectionResponse.data, customPeers, coin }));
		} else {
			/*
			//If previously connected to a peer, return the previous peer data.
			if (api.mainClient[api.coin] !== false) {
				rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "connectToPeer", data: api.peer[api.coin], customPeers, coin }));
				return;
			}
			*/
			//Attempt to connect to random peer if none specified
			const connectionResponse = await connectToRandomPeer(coin, peers);
			if (connectionResponse.coin !== api.coin) return;
			rn_bridge.channel.send(JSON.stringify({ id, error: connectionResponse.error, method: "connectToPeer", data: connectionResponse.data, customPeers, coin }));
		}
	} catch (e) {
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method: "connectToPeer", data: e, customPeers, coin }));
	}
};

const connectToRandomPeer = async (coin, peers = []) => {
	//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
	//Additional Peers can be located here in servers.json & servers_testnet.json for reference: https://github.com/spesmilo/electrum/tree/master/electrum
	
	let hasPeers = false;
	try { hasPeers = (Array.isArray(peers) && peers.length) || (Array.isArray(api.peers[coin]) && api.peers[coin].length) } catch (e) {}
	if (hasPeers) {
		if (Array.isArray(peers) && peers.length) {
			//Update peer list
			api.peers[coin] = peers;
		} else {
			//Set the saved peer list
			peers = api.peers[coin];
		}
	} else {
		//Use the default peer list for a connection if no other peers were passed down and no saved peer list is present.
		peers = require("electrum-host-parse").getDefaultPeers(coin).filter(v => v.ssl);
	}
	const initialPeerLength = peers.length; //Acquire length of our default peers.
	//Attempt to connect to a random default peer. Continue to iterate through default peers at random if unable to connect.
	for (let i = 0; i <= initialPeerLength; i++) {
		try {
			const randomIndex = peers.length * Math.random() | 0;
			const peer = peers[randomIndex];
			if (hasPeers) {
				api.mainClient[coin] = new ElectrumClient(peer.port, peer.host, peer.protocol);
			} else {
				api.mainClient[coin] = new ElectrumClient(peer.ssl, peer.host, "ssl");
			}
			const connectionResponse = await api.mainClient[coin].connect();
			if (connectionResponse.error === false) {
				
				//Ensure the server is responsive beyond a successful connection response
				let pingResponse = false;
				try {
					pingResponse = await api.mainClient[coin].server_ping();
				} catch (e) {}
				
				if (connectionResponse.data && pingResponse === null) {
					api.peer[coin] = {
						port: connectionResponse.data.port,
						host: connectionResponse.data.host,
						protocol: "ssl"
					};
					return {
						error: connectionResponse.error,
						method: "connectToRandomPeer",
						data: connectionResponse.data,
						coin
					};
				} else {
					if (peers.length === 1) return {
						error: true,
						method: "connectToRandomPeer",
						data: connectionResponse.data,
						coin
					};
					peers.splice(randomIndex, 1);
				}
			} else {
				if (peers.length === 1) return {
					error: true,
					method: "connectToRandomPeer",
					data: connectionResponse.data,
					coin
				};
				peers.splice(randomIndex, 1);
			}
		} catch (e) {
		}
	}
	return { error: true, method: "connectToRandomPeer", data: "Unable to connect to any peer." };
};

/*
This is usually the first client’s message, plus it’s sent every minute as a keep-alive message.
Client sends its own version and version of the protocol it supports.
Server responds with its supported version of the protocol (higher number at server-side is usually compatible).
 */
const getVersion = async ({ id = "1", v1 = "3.2.3", v2 = "1.4", coin = "" } = {}) => {
	/*
	//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
	//Additional Peers can be located here for reference: https://github.com/spesmilo/electrum/blob/afa1a4d22a31d23d088c6670e1588eed32f7114d/lib/network.py#L57
	*/
	let peerData = "";
	if (api.mainClient[coin] === false) peerData = await connectToRandomPeer(coin, api.peers[coin]);
	if (coin !== api.coin) peerData = await connectToRandomPeer(coin, api.peers[api.coin]);
	try {
		const response = await api.mainClient[coin].server_version(v1, v2);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getVersion", data: response, peerData, coin }));
	} catch (e) {
		console.log("bad connection:", JSON.stringify(e));
		console.log("trying again");
		return getVersion({ id, coin });
	}
};

const getBanner = async ({ id = "", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].server_banner();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getBanner", data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method: "getBanner", data: e }));
	}
};

const pingServer = async ({ id = Math.random() } = {}) => {
	try {
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].server_ping();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "pingServer", data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method: "pingServer", data: e }));
	}
};

const getDonationAddress = async ({ id = "", coin = "" } = {}) => {
	try {
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].serverDonation_address();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getDonationAddress", data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method: "getDonationAddress", data: e }));
	}
};

/*
Client can this way ask for a list of other active servers.
Servers are connected to an IRC channel (#electrum at freenode.net) where they can see each other.
Each server announces its version, history pruning limit of every address (“p100”, “p10000” etc.–the number means how many transactions the server may keep for every single address) and supported protocols (“t” = tcp@50001, “h” = http@8081, “s” = tcp/tls@50002, “g” = https@8082; non-standard port would be announced this way: “t3300” for tcp on port 3300).
Note: At the time of writing there isn’t a true subscription implementation of this method, but servers only send one-time response. They don’t send notifications yet.
 */
const getPeers = async ({ id = "", method = "getPeers", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].serverPeers_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: null, coin }));
	}
};

const getAvailablePeers = async ({ id = "", method = "getAvailablePeers", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
		//Other useful peers: BitcoinSegwitTestnet, Litecoin, LitecoinTestnet
		//Additional Peers can be located here for reference:
		//(electrum/lib/network.py) https://github.com/spesmilo/electrum/blob/afa1a4d22a31d23d088c6670e1588eed32f7114d/lib/network.py#L57
		const peers = require("electrum-host-parse").getDefaultPeers(api.coin).filter(v => v.ssl);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: peers}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
A request to send to the client notifications about new blocks height.
Responds with the current block height.
 */
const getNewBlockHeightSubscribe = async ({ id = "", method = "getNewBlockHeightSubscribe", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainNumblocks_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
A request to send to the client notifications about new blocks in form of parsed blockheaders.
 */
const getNewBlockHeadersSubscribe = async ({ id = "", method = "getNewBlockHeadersSubscribe", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(coin, api.peers[api.coin]);
		const response = await api.mainClient[coin].blockchainHeaders_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method, data: null, coin }));
	}
};

/*
A request to send to the client notifications when status (i.e., transaction history) of the given address changes.
Status is a hash of the transaction history.
If there isn’t any transaction for the address yet, the status is null.
 */
const getHashOfAddressChangesSubscribe = async ({ address = "", id = "", method = "getHashOfAddressChangesSubscribe", coin = "" }) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_subscribe(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: null, coin }));
	}
};

/*
For a given address a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressHistory = async ({ address = "", id = "", method = "getAddressHistory", coin = {} } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_gethistory(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
For a given scriptHash, a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashHistory = async ({ scriptHash = "", id = "", method = "getAddressScriptHashHistory", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthash_getHistory(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
 For a given scriptHash, a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashesHistory = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesHistory", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthashes_getHistory(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: e, method, data: [], coin }));
	}
};

/*
For a given scriptHash, a list of transactions, fees and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashMempool = async ({ scriptHash = "", id = "", method = "getAddressScriptHashMempool", coin = {} }) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthash_getMempool(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: e, method, data: [], coin }));
	}
};

const getAddressScriptHashesMempool = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesMempool", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		
		const response = await api.mainClient[api.coin].blockchainScripthashes_getMempool(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getMempool = async ({ address = "", id = "", method = "getMempool", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_getMempool(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddressBalance = async ({ address = "", id = "", method = "getAddressBalance", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_getBalance(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddressScriptHashBalance = async ({ scriptHash = "", id = "", method = "getAddressScriptHashBalance", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthash_getBalance(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, scriptHash, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddressScriptHashesBalance = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesBalance", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthashes_getBalance(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddressProof = async ({ address = "", id = "", method = "getAddressProof", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_getProof(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const listUnspentAddress = async ({ address = "", id = "", method = "listUnspentAddress", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainAddress_listunspent(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const listUnspentAddressScriptHash = async ({ scriptHash = "", id = "", method = "listUnspentAddressScriptHash", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthash_listunspent(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const listUnspentAddressScriptHashes = async ({ scriptHashes = [], id = "", method = "listUnspentAddressScriptHashes", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainScripthashes_listunspent(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddressUtxo = async ({ txHash = "", index = "", id = "", method = "getAddressUtxo", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainUtxo_getAddress(txHash, index);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getBlockHeader = async ({ height = "", id = "", method = "getBlockHeader", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainBlock_getHeader(height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

//Same as getBlockHeader, but used only on bitcoinTestnet for the moment. getBlockHeader wont work for bitcoinTestnet.
const getHeader = async ({ height = "", id = "", method = "getHeader", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainBlock_getBlockHeader(height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getBlockChunk = async ({ index = "", id = "", method = "getBlockChunk", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainBlock_getChunk(index);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
Submits raw transaction (serialized, hex-encoded) to the network.
Returns transaction id, or an error if the transaction is invalid for any reason.
 */
const broadcastTransaction = async ({ rawTx = "", id = "", method = "broadcastTransaction", coin = "" } = {}) => {
	try {
		if (api.mainClient[coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[coin].blockchainTransaction_broadcast(rawTx);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method, data: e, coin }));
	}
};

const getTransactionMerkle = async ({ txHash = "", height = "", id = "", method = "getTransactionMerkle", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainTransaction_getMerkle(txHash, height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
Method for obtaining raw transaction (hex-encoded) for given txid.
If the transaction doesn’t exist, an error is returned.
 */

const getTransactionHex = async ({ txId = "", id = "", method = "getTransactionHex", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainTransaction_get(txId);
		//const decodedTx = await TxDecoder(response, bitcoin.networks.bitcoin);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

/*
Method for obtaining transaction data for given txid.
Reference: https://github.com/kyuupichan/electrumx/blob/master/docs/protocol-methods.rst
If the transaction doesn’t exist, an error is returned.
 */

const getTransaction = async ({ txHash = "", id = "", method = "getTransaction", coin = "" } = {}) => {
	const failure = () => {
		try {
			rn_bridge.channel.send(JSON.stringify({ id, error: true, method, data: {}, coin }));
		} catch (e) {
			console.log(e);
		}
	};
	try {
		if (coin != api.coin) failure();
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainTransaction_get(txHash, true);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method, data: e, coin }));
	}
};

const getTransactions = async ({ id = "", txHashes = [], coin = "", method = "getTransactions" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[api.coin] === false) await connectToRandomPeer(api.coin, api.peers[api.coin]);
		const response = await api.mainClient[api.coin].blockchainTransactions_get(txHashes, true);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "Error", errorMsg: e, method, data: [], coin }));
	}
};

/*
Estimates the transaction fee per kilobyte that needs to be paid for a transaction to be included within a certain number of blocks.
If the node doesn’t have enough information to make an estimate, the value -1 will be returned.
Parameter: How many blocks the transaction may wait before being included.
 */
const getFeeEstimate = async ({ blocksWillingToWait = 8, id = "", method = "getFeeEstimate", coin = "" } = {}) => {
	try {
		if (coin != api.coin) return;
		if (api.mainClient[coin] === false) await connectToRandomPeer(coin, api.peers[coin]);
		const response = await api.mainClient[coin].blockchainEstimatefee(blocksWillingToWait);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin }));
	}
};

const getAddress = (keyPair, network) => {
	//Get Native Bech32 (bc1) addresses
	//return bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address;
};

module.exports = {
	getAddressScriptHashHistory,
	getAddressScriptHashesHistory,
	getAddressScriptHashBalance,
	getAddressScriptHashesBalance,
	getAddressScriptHashMempool,
	getAddressScriptHashesMempool,
	listUnspentAddressScriptHash,
	listUnspentAddressScriptHashes,
	getVersion,
	getBanner,
	pingServer,
	getDonationAddress,
	getPeers,
	getAvailablePeers,
	disconnectFromPeer,
	connectToRandomPeer,
	connectToPeer,
	getNewBlockHeightSubscribe,
	getNewBlockHeadersSubscribe,
	getHashOfAddressChangesSubscribe,
	getAddressHistory,
	getMempool,
	getAddressBalance,
	getAddressProof,
	listUnspentAddress,
	getAddressUtxo,
	getBlockHeader,
	getHeader,
	getBlockChunk,
	broadcastTransaction,
	getTransactionMerkle,
	getTransactionHex,
	getTransaction,
	getTransactions,
	getFeeEstimate,
	subscribeHeader,
	subscribeAddress,
	unSubscribeAddress
};
