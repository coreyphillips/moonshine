const rn_bridge = require("rn-bridge");
const ElectrumClient = require("electrum-client");

this.coin = "bitcoin";
this.mainClient = false;
this.peer = {
};

const connectToPeer = async ({ id, customPeers = [], coin = "bitcoin" } = {}) => {
	try {
		this.coin = coin;

		//Attempt to connect to specified peer
		if (customPeers.length > 0) {
			const {port = "", host = "", protocol = "ssl"} = customPeers[0];
			this.mainClient = new ElectrumClient(port, host, protocol);
			const connectionResponse = await this.mainClient.connect();
			if (!connectionResponse.error) this.peer = { port: connectionResponse.data.port, host: connectionResponse.data.host, protocol: "ssl" };
			rn_bridge.channel.send(JSON.stringify({ id, error: connectionResponse.error, method: "connectToPeer", data: connectionResponse.data, customPeers }));
		} else {
			//Attempt to connect to random peer if none specified
			const connectionResponse = await connectToRandomPeer();
			rn_bridge.channel.send(JSON.stringify({ id, error: connectionResponse.error, method: "connectToPeer", data: connectionResponse.data, customPeers }));
		}
	} catch (e) {
		//return connectToPeer({ id, customPeers });
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method: "connectToPeer", data: e, customPeers }));
	}
};

const connectToRandomPeer = async () => {
	//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
	//Additional Peers can be located here in servers.json & servers_testnet.json for reference: https://github.com/spesmilo/electrum/tree/master/electrum
	let peers = require("electrum-host-parse").getDefaultPeers(this.coin).filter(v => v.ssl);
	const initialPeerLength = peers.length;
	//Attempt to connect to a random peer. If unable to connect initially iterate through available peers at random.
	for (let i = 0; i <= initialPeerLength; i++) {
		try {
			const randomIndex = peers.length * Math.random() | 0;
			const peer = peers[randomIndex];
			this.mainClient = new ElectrumClient(peer.ssl, peer.host, "ssl");
			const connectionResponse = await this.mainClient.connect();
			if (connectionResponse.error === false) {
				this.peer = { port: connectionResponse.data.port, host: connectionResponse.data.host, protocol: "ssl" };
				return {
					error: connectionResponse.error,
					method: "connectToRandomPeer",
					data: connectionResponse.data
				};
			} else {
				if (peers.length === 1) return { error: true, method: "connectToRandomPeer", data: connectionResponse.data};
				peers.splice(randomIndex, 1);
			}
		} catch (e) {}
	}
	return { error: true, method: "connectToRandomPeer", data: "Unable to connect to any peer."};
	/*
	const getRandomPeer = () => peers[peers.length * Math.random() | 0];
	const peer = getRandomPeer();
	console.log("begin connection:", JSON.stringify(peer));
	this.mainClient = new ElectrumClient(peer.ssl, peer.host, "ssl");
	try {
		return await this.mainClient.connect();
	} catch (e) {
		console.log("bad connection:", JSON.stringify(peer));
		console.log("trying again");
		return connectToRandomPeer(this.coin)
	}
	*/
};

/*
This is usually the first client’s message, plus it’s sent every minute as a keep-alive message.
Client sends its own version and version of the protocol it supports.
Server responds with its supported version of the protocol (higher number at server-side is usually compatible).
 */
const getVersion = async ({ id = "1", v1 = "3.2.3", v2 = "1.2", coin = "" }) => {
	/*
	//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
	//Other useful peers: BitcoinSegwitTestnet, Litecoin, LitecoinTestnet
	//Additional Peers can be located here for reference: https://github.com/spesmilo/electrum/blob/afa1a4d22a31d23d088c6670e1588eed32f7114d/lib/network.py#L57
	const peers = require("electrum-host-parse").getDefaultPeers("BitcoinSegwit").filter(v => v.ssl);
	const getRandomPeer = () => peers[peers.length * Math.random() | 0];
	const peer = getRandomPeer();
	console.log("begin connection:", JSON.stringify(peer));
	this.mainClient = new ElectrumClient(peer.ssl, peer.host, "ssl");
	*/

	let peerData = "";
	if (this.mainClient === false) peerData = await connectToRandomPeer(coin);
	if (coin && coin !== this.coin) peerData = await connectToRandomPeer(coin);
	//peerData = await connectToRandomPeer("BitcoinSegwitTestnet");
	//rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getVersion", data: "", peerData, coin }));
	try {
		const response = await this.mainClient.server_version();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getVersion", data: response, peerData, coin }));
	} catch (e) {
		console.log("bad connection:", JSON.stringify(e));
		console.log("trying again");
		return getVersion({ id, coin });
	}
};

const getBanner = async ({ id= "" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.server_banner();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method: "getBanner", data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method: "getBanner", data: e }));
	}
};

const getDonationAddress = async ({ id = "" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.serverDonation_address();
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
const getPeers = async ({ id = "", method = "getPeers" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.serverPeers_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: null }));
	}
};

const getAvailablePeers = async ({ id = "", method = "getAvailablePeers" }) => {
	try {
		//Peers can be found in /node_modules/electrum-host-parse/fixtures/peers.json.
		//Other useful peers: BitcoinSegwitTestnet, Litecoin, LitecoinTestnet
		//Additional Peers can be located here for reference:
		//(electrum/lib/network.py) https://github.com/spesmilo/electrum/blob/afa1a4d22a31d23d088c6670e1588eed32f7114d/lib/network.py#L57
		const peers = require("electrum-host-parse").getDefaultPeers(this.coin).filter(v => v.ssl);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: peers}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const disconnectFromPeer = async ({ id = "", method = "disconnectFromPeer" }) => {
	try {
		if (this.mainClient === false) {
			//No peer to disconnect from...
			rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: { message: "No peer to disconnect from." }}));
		} else {
			//Attempt to disconnect from peer...
			await this.mainClient.close();
			this.mainClient = false;
			this.coin = "bitcoin";
			rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: "Successfully disconnected from peer."}));
		}
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "Unable to disconnect from peer.", method, data: e }));
	}
};

/*
A request to send to the client notifications about new blocks height.
Responds with the current block height.
 */
const getNewBlockHeightSubscribe = async ({ id = "", method = "getNewBlockHeightSubscribe" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainNumblocks_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
A request to send to the client notifications about new blocks in form of parsed blockheaders.
 */
const getNewBlockHeadersSubscribe = async ({ id = "", method = "getNewBlockHeadersSubscribe" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainHeaders_subscribe();
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: null }));
	}
};

/*
A request to send to the client notifications when status (i.e., transaction history) of the given address changes.
Status is a hash of the transaction history.
If there isn’t any transaction for the address yet, the status is null.
 */
const getHashOfAddressChangesSubscribe = async ({ address = "", id = "", method = "getHashOfAddressChangesSubscribe" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_subscribe(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: null }));
	}
};

/*
For a given address a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressHistory = async ({ address = "", id = "", method = "getAddressHistory" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_getHistory(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
For a given scriptHash, a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashHistory = async ({ scriptHash = "", id = "", method = "getAddressScriptHashHistory" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);

		const response = await this.mainClient.blockchainScripthash_getHistory(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin: this.coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
 For a given scriptHash, a list of transactions and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashesHistory = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesHistory" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainScripthashes_getHistory(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin: this.coin }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
For a given scriptHash, a list of transactions, fees and their heights (and fees in newer versions) is returned.
 */
const getAddressScriptHashMempool = async ({ scriptHash = "", id = "", method = "getAddressScriptHashMempool" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);

		const response = await this.mainClient.blockchainScripthash_getMempool(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressScriptHashesMempool = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesMempool" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);

		const response = await this.mainClient.blockchainScripthashes_getMempool(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getMempool = async ({ address = "", id = "", method = "getMempool" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_getMempool(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressBalance = async ({ address = "", id = "", method = "getAddressBalance" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_getBalance(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressScriptHashBalance = async ({ scriptHash = "", id = "", method = "getAddressScriptHashBalance" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainScripthash_getBalance(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, scriptHash}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressScriptHashesBalance = async ({ scriptHashes = [], id = "", method = "getAddressScriptHashesBalance" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainScripthashes_getBalance(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressProof = async ({ address = "", id = "", method = "getAddressProof" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_getProof(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const listUnspentAddress = async ({ address = "", id = "", method = "listUnspentAddress" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainAddress_listunspent(address);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const listUnspentAddressScriptHash = async ({ scriptHash = "", id = "", method = "listUnspentAddressScriptHash" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainScripthash_listunspent(scriptHash);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const listUnspentAddressScriptHashes = async ({ scriptHashes = [], id = "", method = "listUnspentAddressScriptHashes" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainScripthashes_listunspent(scriptHashes);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getAddressUtxo = async ({ txHash = "", index = "", id = "", method = "getAddressUtxo" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainUtxo_getAddress(txHash, index);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getBlockHeader = async ({ height = "", id = "", method = "getBlockHeader" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainBlock_getHeader(height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

//Same as getBlockHeader, but used only on bitcoinTestnet for the moment. getBlockHeader wont work for bitcoinTestnet.
const getHeader = async ({ height = "", id = "", method = "getHeader" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainBlock_getBlockHeader(height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getBlockChunk = async ({ index = "", id = "", method = "getBlockChunk" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainBlock_getChunk(index);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
Submits raw transaction (serialized, hex-encoded) to the network.
Returns transaction id, or an error if the transaction is invalid for any reason.
 */
const broadcastTransaction = async ({ rawTx = "", id = "", method = "broadcastTransaction" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainTransaction_broadcast(rawTx);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

const getTransactionMerkle = async ({ txHash = "", height = "", id = "", method = "getTransactionMerkle" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainTransaction_getMerkle(txHash, height);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
Method for obtaining raw transaction (hex-encoded) for given txid.
If the transaction doesn’t exist, an error is returned.
 */

const getTransactionHex = async ({ txId = "", id = "", method = "getTransactionHex" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainTransaction_get(txId);
		//const decodedTx = await TxDecoder(response, bitcoin.networks.bitcoin);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e }));
	}
};

/*
Method for obtaining transaction data for given txid.
Reference: https://github.com/kyuupichan/electrumx/blob/master/docs/protocol-methods.rst
If the transaction doesn’t exist, an error is returned.
 */

const getTransaction = async ({ txHash = "", id = "", method = "getTransaction" } = {}) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainTransaction_get(txHash, true);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response }));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, method, data: e }));
	}
};

/*
Estimates the transaction fee per kilobyte that needs to be paid for a transaction to be included within a certain number of blocks.
If the node doesn’t have enough information to make an estimate, the value -1 will be returned.
Parameter: How many blocks the transaction may wait before being included.
 */
const getFeeEstimate = async ({ blocksWillingToWait = 4, id = "", method = "getFeeEstimate" }) => {
	try {
		if (this.mainClient === false) await connectToRandomPeer(this.coin);
		const response = await this.mainClient.blockchainEstimatefee(blocksWillingToWait);
		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: response, coin: this.coin}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, coin: this.coin }));
	}
};

const getAddress = (keyPair, network) => {
	//Get Native Bech32 (bc1) addresses
	//return bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address;
};

const createAddresses = async ({ id = "", method = "createAddresses", root = "", network, networkValue, addressAmount = 0, addressIndex = 0, changeAddressAmount = 0, changeAddressIndex = 0 } = {}) => {

	/*
	try {

		//const seed = bip39.mnemonicToSeed(mnemonic);
		//const root = bip32.fromSeed(seed, network);

		let addresses = [];
		let changeAddresses = [];

		//Generate Addresses
		if (Number(addressAmount !== 0)) {
			for (let i = addressIndex; i < addressAmount + addressIndex; i++) {
				const addressPath = `m/49'/${networkValue}'/0'/0/${i}`;
				const addressKeypair = root.derivePath(addressPath);
				const address = await getAddress(addressKeypair, network);
				//addresses.push({address});
				addresses.push({address, path: addressPath});
			}
		}

		//Generate Change Addresses
		if (Number(changeAddressAmount) !== 0) {
			for (let i = changeAddressIndex; i < changeAddressAmount + changeAddressIndex; i++) {
				const changeAddressPath = `m/49'/${networkValue}'/0'/1/${i}`;
				const changeAddressKeypair = root.derivePath(changeAddressPath);
				const address = getAddress(changeAddressKeypair, network);
				changeAddresses.push({address, path: changeAddressPath});
			}
		}


		rn_bridge.channel.send(JSON.stringify({ id, error: false, method, data: { addresses, changeAddresses }}));
	} catch (e) {
		console.log(e);
		rn_bridge.channel.send(JSON.stringify({ id, error: true, errorTitle: "", errorMsg: "", method, data: e, network, networkValue, addressAmount, changeAddressAmount, addressIndex, changeAddressIndex }));
	}
	*/
};

module.exports = {
	createAddresses,
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
	getFeeEstimate
};