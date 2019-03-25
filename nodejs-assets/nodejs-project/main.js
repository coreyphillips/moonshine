// The main.js file will be overwritten in updates/reinstalls.
const rn_bridge = require("rn-bridge");
const {
	getVersion,
	getBanner,
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
	getFeeEstimate,
	listUnspentAddressScriptHash,
	listUnspentAddressScriptHashes,
	connectToPeer,
	createAddresses
} = require("./electrumUtils");

rn_bridge.channel.on("message", (msg) => {
	let id = "";
	let address = "";
	let blocksWillingToWait = 4;
	let txId = "";
	let txHash = "";
	let height = "";
	let index = "";
	let rawTx = "";
	let coin = "";
	let network = "";
	let networkValue = "";
	let addressAmount = 0;
	let addressIndex = 0;
	let changeAddressAmount = 0;
	let changeAddressIndex = 0;
	let root = "";
	let customPeers = [];
	let scriptHash = "";
	let scriptHashes = [];

	try {
		msg = JSON.parse(msg);
	} catch (e) {
		console.log(e);
	}
	try { id = msg.id } catch (e) {}

	switch(msg.method) {
		case "connectToPeer":
			try { customPeers = msg.customPeers || [] } catch (e) {}
			try { coin = msg.coin } catch (e) {}
			connectToPeer({ id, customPeers, coin });
			break;
		case "createAddresses":
			try { network = msg.network } catch (e) {}
			try { networkValue = msg.networkValue } catch (e) {}
			try { root = msg.root } catch (e) {}
			try { addressAmount = msg.addressAmount } catch (e) {}
			try { addressIndex = msg.addressIndex } catch (e) {}
			try { changeAddressAmount = msg.changeAddressAmount } catch (e) {}
			try { changeAddressIndex = msg.changeAddressIndex } catch (e) {}
			createAddresses({ id, network, networkValue, addressAmount, addressIndex, changeAddressAmount, changeAddressIndex, root });
			break;
		case "getAddressBalance":
			try { address = msg.address } catch (e) {}
			getAddressBalance({ address, id });
			break;
		case "getAddressScriptHashBalance":
			try { scriptHash = msg.scriptHash } catch (e) {}
			getAddressScriptHashBalance({ scriptHash, id });
			break;
		case "getAddressScriptHashesBalance":
			try { scriptHashes = msg.scriptHashes } catch (e) {}
			getAddressScriptHashesBalance({ scriptHashes, id });
			break;
		case "getAddressScriptHashHistory":
			try { scriptHash = msg.scriptHash } catch (e) {}
			getAddressScriptHashHistory({ scriptHash, id });
			break;
		case "getAddressScriptHashesHistory":
			try { scriptHashes = msg.scriptHashes } catch (e) {}
			getAddressScriptHashesHistory({ scriptHashes, id });
			break;
		case "getAddressScriptHashMempool":
			try { scriptHash = msg.scriptHash } catch (e) {}
			getAddressScriptHashMempool({ scriptHash, id });
			break;
		case "getAddressScriptHashesMempool":
			try { scriptHashes = msg.scriptHashes } catch (e) {}
			getAddressScriptHashesMempool({ scriptHashes, id });
			break;
		case "listUnspentAddressScriptHash":
			try { scriptHash = msg.scriptHash } catch (e) {}
			listUnspentAddressScriptHash({ scriptHash, id });
			break;
		case "listUnspentAddressScriptHashes":
			try { scriptHashes = msg.scriptHashes } catch (e) {}
			listUnspentAddressScriptHashes({ scriptHashes, id });
			break;
		case "getMempool":
			try { address = msg.address } catch (e) {}
			getMempool({ address, id });
			break;
		case "listUnspentAddress":
			try { address = msg.address } catch (e) {}
			listUnspentAddress({ address, id });
			break;
		case "getFeeEstimate":
			try { blocksWillingToWait = msg.blocksWillingToWait } catch (e) {}
			getFeeEstimate({ blocksWillingToWait, id });
			break;
		case "getAddressHistory":
			try { address = msg.address } catch (e) {}
			getAddressHistory({ address, id });
			break;
		case "getTransactionHex":
			try { txId = msg.txId } catch (e) {}
			getTransactionHex({ txId, id });
			break;
		case "getDonationAddress":
			getDonationAddress({ id });
			break;
		case "disconnectFromPeer":
			disconnectFromPeer({ id });
			break;
		case "getAvailablePeers":
			getAvailablePeers({ id });
			break;
		case "getPeers":
			getPeers({ id });
			break;
		case "getNewBlockHeightSubscribe":
			getNewBlockHeightSubscribe({ id });
			break;
		case "getNewBlockHeadersSubscribe":
			getNewBlockHeadersSubscribe({ id });
			break;
		case "getTransactionMerkle":
			try { txHash = msg.txHash } catch (e) {}
			try { height = msg.height } catch (e) {}
			getTransactionMerkle({ id, txHash, height });
			break;
		case "getTransaction":
			try { txHash = msg.txHash } catch (e) {}
			getTransaction({ id, txHash });
			break;
		case "getAddressUtxo":
			try { txHash = msg.txHash } catch (e) {}
			try { index = msg.index } catch (e) {}
			getAddressUtxo({ id, txHash, index });
			break;
		case "broadcastTransaction":
			try { rawTx = msg.rawTx } catch (e) {}
			broadcastTransaction({ id, rawTx });
			break;
		case "getBlockChunk":
			try { index = msg.index } catch (e) {}
			getBlockChunk({ id, index });
			break;
		case "getBlockHeader":
			try { height = msg.height } catch (e) {}
			getBlockHeader({ id, height });
			break;
		case "getHeader":
			try { height = msg.height } catch (e) {}
			getHeader({ id, height });
			break;
		case "getBanner":
			getBanner({ id });
			break;
		case "getAddressProof":
			try { address = msg.address } catch (e) {}
			getAddressProof({ id, address });
			break;
		case "getVersion":
			try { coin = msg.coin } catch (e) {}
			getVersion({ id, coin });
			break;
		default:
			break;
	}
});