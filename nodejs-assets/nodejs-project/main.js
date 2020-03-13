// The main.js file will be overwritten in updates/reinstalls.
const rn_bridge = require("rn-bridge");
const {
	getVersion,
	getBanner,
	pingServer,
	getDonationAddress,
	getPeers,
	getAvailablePeers,
	disconnectFromPeer,
	getNewBlockHeightSubscribe,
	getNewBlockHeadersSubscribe,
	getHashOfAddressChangesSubscribe,
	getAddressHistory,
	getMempool,
	getAddressScriptHashMempool,
	getAddressScriptHashesMempool,
	getAddressBalance,
	getAddressScriptHashBalance,
	getAddressScriptHashesBalance,
	getAddressScriptHashHistory,
	getAddressScriptHashesHistory,
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
	listUnspentAddressScriptHash,
	listUnspentAddressScriptHashes,
	connectToPeer,
	subscribeHeader,
	subscribeAddress,
	unSubscribeAddress
} = require("./electrumUtils");

rn_bridge.channel.on("message", (msg) => {
	let id = "";
	let address = "";
	let blocksWillingToWait = 4;
	let txId = "";
	let txHash = "";
	let txHashes = [];
	let height = "";
	let index = "";
	let rawTx = "";
	let coin = "";
	let peers = [];
	let customPeers = [];
	let scriptHash = "";
	let scriptHashes = [];
	
	try {
		msg = JSON.parse(msg);
	} catch (e) {
		console.log(e);
	}
	try { id = msg.id; } catch (e) {}
	
	switch(msg.method) {
		case "connectToPeer":
			try { peers = msg.peers || []; } catch (e) {}
			try { customPeers = msg.customPeers || []; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			connectToPeer({ id, peers, customPeers, coin });
			break;
		case "disconnectFromPeer":
			try { coin = msg.coin; } catch (e) {}
			disconnectFromPeer({ coin, id });
			break;
		case "getAddressBalance":
			try { address = msg.address; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressBalance({ address, id, coin });
			break;
		case "getAddressScriptHashBalance":
			try { scriptHash = msg.scriptHash; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashBalance({ scriptHash, coin, id });
			break;
		case "getAddressScriptHashesBalance":
			try { scriptHashes = msg.scriptHashes; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashesBalance({ scriptHashes, coin, id });
			break;
		case "getAddressScriptHashHistory":
			try { scriptHash = msg.scriptHash; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashHistory({ scriptHash, coin, id });
			break;
		case "getAddressScriptHashesHistory":
			try { scriptHashes = msg.scriptHashes; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashesHistory({ scriptHashes, coin, id });
			break;
		case "getAddressScriptHashMempool":
			try { scriptHash = msg.scriptHash; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashMempool({ scriptHash, coin, id });
			break;
		case "getAddressScriptHashesMempool":
			try { scriptHashes = msg.scriptHashes; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressScriptHashesMempool({ scriptHashes, coin, id });
			break;
		case "listUnspentAddressScriptHash":
			try { scriptHash = msg.scriptHash; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			listUnspentAddressScriptHash({ scriptHash, coin, id });
			break;
		case "listUnspentAddressScriptHashes":
			try { scriptHashes = msg.scriptHashes; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			listUnspentAddressScriptHashes({ scriptHashes, coin, id });
			break;
		case "getMempool":
			try { address = msg.address; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getMempool({ address, coin, id });
			break;
		case "listUnspentAddress":
			try { address = msg.address; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			listUnspentAddress({ address, coin, id });
			break;
		case "getFeeEstimate":
			try { blocksWillingToWait = msg.blocksWillingToWait; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getFeeEstimate({ blocksWillingToWait, coin, id });
			break;
		case "getAddressHistory":
			try { address = msg.address; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressHistory({ address, coin, id });
			break;
		case "getTransactionHex":
			try { txId = msg.txId; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getTransactionHex({ txId, coin, id });
			break;
		case "getDonationAddress":
			getDonationAddress({ id });
			break;
		case "getAvailablePeers":
			try { coin = msg.coin; } catch (e) {}
			getAvailablePeers({ coin, id });
			break;
		case "getPeers":
			try { coin = msg.coin; } catch (e) {}
			getPeers({ coin, id });
			break;
		case "getNewBlockHeightSubscribe":
			try { coin = msg.coin; } catch (e) {}
			getNewBlockHeightSubscribe({ coin, id });
			break;
		case "getNewBlockHeadersSubscribe":
			try { coin = msg.coin; } catch (e) {}
			getNewBlockHeadersSubscribe({ coin, id });
			break;
		case "getTransactionMerkle":
			try { txHash = msg.txHash; } catch (e) {}
			try { height = msg.height; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getTransactionMerkle({ id, txHash, height, coin });
			break;
		case "getTransaction":
			try { txHash = msg.txHash; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getTransaction({ id, txHash, coin });
			break;
		case "getTransactions":
			try { txHashes = msg.txHashes; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getTransactions({ id, txHashes, coin });
			break;
		case "getAddressUtxo":
			try { txHash = msg.txHash; } catch (e) {}
			try { index = msg.index; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getAddressUtxo({ id, txHash, index, coin });
			break;
		case "broadcastTransaction":
			try { rawTx = msg.rawTx; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			broadcastTransaction({ id, rawTx, coin });
			break;
		case "getBlockChunk":
			try { index = msg.index; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getBlockChunk({ id, index, coin });
			break;
		case "getBlockHeader":
			try { height = msg.height; } catch (e) {}
			try { coin = msg.coin; } catch (e) {}
			getBlockHeader({ id, height, coin });
			break;
		case "getHeader":
			try { height = msg.height; } catch (e) {}
			getHeader({ id, height });
			break;
		case "getBanner":
			getBanner({ id });
			break;
			//pingServer
		case "pingServer":
			pingServer({ id });
			break;
		case "getAddressProof":
			try { address = msg.address; } catch (e) {}
			getAddressProof({ id, address });
			break;
		case "getVersion":
			try { coin = msg.coin; } catch (e) {}
			getVersion({ id, coin });
			break;
		case "subscribeHeader":
			try { coin = msg.coin; } catch (e) {}
			subscribeHeader({ id, coin });
			break;
		case "subscribeAddress":
			try { coin = msg.coin; } catch (e) {}
			try { address = msg.address; } catch (e) {}
			subscribeAddress({ id, coin, address });
			break;
		case "unSubscribeAddress":
			try { coin = msg.coin; } catch (e) {}
			try { scriptHashes = msg.scriptHashes; } catch (e) {}
			unSubscribeAddress({ id, coin, scriptHashes });
			break;
		default:
			break;
	}
});
