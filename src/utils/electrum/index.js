import "../../../shim";

const ElectrumClient = require("electrum-client");
const bitcoin = require("bitcoinjs-lib");
const clients = require("./clients");
const {
	networks
} = require("../networks");

let electrumKeepAlive = () => null;
let electrumKeepAliveInterval = 60000;

let subscribedAddresses = [];

const pauseExecution = (duration = 500) => {
	return new Promise(async (resolve) => {
		try {
			const wait = () => resolve({error: false});
			await setTimeout(wait, duration);
		} catch (e) {
			console.log(e);
			resolve({error: true});
		}
	});
};

const getFuncName = () => getFuncName.caller.name;

const getDefaultPeers = (coin, protocol) => {
	return require("./peers.json")[coin].map(peer => {
		try {
			return { ...peer, protocol };
		} catch {}
	});
};

const getScriptHash = (address = "", network = networks["bitcoin"]) => {
	const script = bitcoin.address.toOutputScript(address, network);
	let hash = bitcoin.crypto.sha256(script);
	const reversedHash = new Buffer(hash.reverse());
	return reversedHash.toString("hex");
};

const getTimeout = ({ arr = undefined, timeout = 1000 } = {}) => {
	try {
		if (arr && Array.isArray(arr)) return arr.length * timeout;
		return timeout;
	} catch {
		return timeout;
	}
};

//peers = A list of peers acquired from default electrum servers using the getPeers method.
//customPeers = A list of peers added by the user to connect to by default in lieu of the default peer list.
const start = ({ id = Math.random(), coin = "", peers = [], customPeers = []} = {}) => {
	const method = "connectToPeer";
	return new Promise(async (resolve) => {
		try {
			if (!coin) resolve({error: true, data: {}});
			//Clear/Remove any previous keep-alive message.
			try {clearInterval(electrumKeepAlive);} catch {}
			clients.coin = coin;
			let customPeersLength = 0;
			try {customPeersLength = customPeers.length;} catch {}
			//Attempt to connect to specified peer
			let connectionResponse = { error: true, data: "" };
			if (customPeersLength > 0) {
				const { port = "", host = "", protocol = "ssl" } = customPeers[0];
				connectionResponse = await connectToPeer({ port, host, protocol, coin });
			} else {
				//Attempt to connect to random peer if none specified
				connectionResponse = await connectToRandomPeer(coin, peers);
			}
			resolve({
				id,
				error: connectionResponse.error,
				method: "connectToPeer",
				data: connectionResponse.data,
				customPeers,
				coin
			});
		} catch (e) {
			console.log(e);
			resolve({ error: true, method, data: e });
		}
	});
};

const batchAddresses = ({ coin = "bitcoinTestnet", scriptHashes = [] } = {}) => {
	return new Promise(async (resolve) => {
		const response = await promiseTimeout(getTimeout(scriptHashes), clients.mainClient[coin].blockchainScripthash_getHistoryBatch(scriptHashes));
		resolve(response);
	});
}

const connectToPeer = ({ port = 50002, host = "", protocol = "ssl", coin = "bitcoin" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			clients.coin = coin;
			let needToConnect = clients.mainClient[coin] === false;
			let connectionResponse = { error: false, data: clients.peer[coin] };
			if (!needToConnect) {
				//Ensure the server is still alive
				const pingResponse = await pingServer();
				if (pingResponse.error) {
					await disconnectFromPeer({ coin });
					needToConnect = true;
				}
			}
			if (needToConnect) {
				clients.mainClient[coin] = new ElectrumClient(port, host, protocol);
				connectionResponse = await promiseTimeout(1000, clients.mainClient[coin].connect());
				if (!connectionResponse.error) {
					try {
						//Clear/Remove Electrum's keep-alive message.
						clearInterval(electrumKeepAlive);
						//Start Electrum's keep-alive function. It’s sent every minute as a keep-alive message.
						electrumKeepAlive = setInterval(async () => {
							try {pingServer({ id: Math.random() });} catch {}
						}, electrumKeepAliveInterval);
					} catch (e) {}
					clients.peer[coin] = { port, host, protocol };
				}
			}
			await pauseExecution();
			resolve(connectionResponse);
		} catch (e) {resolve({ error: true, data: e, resolve });}
	});
};

const connectToRandomPeer = async (coin, peers = [], protocol = "ssl") => {
		//Peers can be found in peers.json.
		//Additional Peers can be located here in servers.json & servers_testnet.json for reference: https://github.com/spesmilo/electrum/tree/master/electrum
		let hasPeers = false;
		try {
			hasPeers = (Array.isArray(peers) && peers.length) || (Array.isArray(clients.peers[coin]) && clients.peers[coin].length);
		} catch {}
		if (hasPeers) {
			if (Array.isArray(peers) && peers.length) {
				//Update peer list
				clients.peers[coin] = peers;
			} else {
				//Set the saved peer list
				peers = clients.peers[coin];
			}
		} else {
			//Use the default peer list for a connection if no other peers were passed down and no saved peer list is present.
			peers = getDefaultPeers(coin, protocol);
		}
		const initialPeerLength = peers.length; //Acquire length of our default peers.
		//Attempt to connect to a random default peer. Continue to iterate through default peers at random if unable to connect.
		for (let i = 0; i <= initialPeerLength; i++) {
			try {
				const randomIndex = peers.length * Math.random() | 0;
				const peer = peers[randomIndex];
				let port = 50002;
				let host = "";
				if (hasPeers) {
					port = peer.port;
					host = peer.host;
					protocol = peer.protocol;
				} else {
					port = peer[peer.protocol];
					host = peer.host;
					protocol = peer.protocol;
				}
				const connectionResponse = await connectToPeer({ port, host, protocol, coin });
				if (connectionResponse.error === false && connectionResponse.data) {
					return {
						error: connectionResponse.error,
						method: "connectToRandomPeer",
						data: connectionResponse.data,
						coin
					};
				} else {
					//clients.mainClient[coin].close && clients.mainClient[coin].close();
					clients.mainClient[coin] = false;
					if (peers.length === 1) {
						return {
							error: true,
							method: "connectToRandomPeer",
							data: connectionResponse.data,
							coin
						};
					}
					peers.splice(randomIndex, 1);
				}
			} catch (e) {console.log(e);}
		}
		return { error: true, method: "connectToRandomPeer", data: "Unable to connect to any peer." };
};

const stop = async ({ coin = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Clear/Remove Electrum's keep-alive message.
			clearInterval(electrumKeepAlive);
			//Disconnect from peer
			const response = await disconnectFromPeer({ coin });
			resolve(response);
		} catch (e) {
			resolve({ error: true, data: e });
		}
	});
	
};

const promiseTimeout = (ms, promise) => {
	let id;
	let timeout = new Promise((resolve) => {
		id = setTimeout(() => {
			resolve({ error: true, data: "Timed Out." });
		}, ms);
	});
	
	return Promise.race([
		promise,
		timeout
	]).then((result) => {
		clearTimeout(id);
		try {if ("error" in result && "data" in result) return result;} catch {}
		return { error: false, data: result };
	});
};

const subscribeHeader = async ({ id = "subscribeHeader", coin = "", onReceive = () => null } = {}) => {
	try {
		if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
		clients.mainClient[coin].subscribe.on('blockchain.headers.subscribe', onReceive);
		if (__DEV__) console.log("Subscribed to headers.");
		return { id, error: false, method: "subscribeHeader", data: "Subscribed", coin };
	} catch (e) {
		return { id, error: true, method: "subscribeHeader", data: e, coin };
	}
};

const subscribeAddress = async ({ id = "wallet0bitcoin", address = "", coin = "bitcoin", onReceive = (data) => console.log(data) } = {}) => {
	try {
		if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
		//Ensure this address is not already subscribed
		if (subscribedAddresses.includes(address)) return { id, error: false, method: "subscribeAddress", data: "" };
		const res = await promiseTimeout(10000,  clients.mainClient[coin].subscribe.on('blockchain.scripthash.subscribe', onReceive));
		if (res.error) return { ...res, id, method: "subscribeAddress" };
		const response = await promiseTimeout(10000, clients.mainClient[coin].blockchainScripthash_subscribe(address));
		if (!response.error) subscribedAddresses.push(address);
		return { ...response, id, method: "subscribeAddress" };
	} catch (e) {
		return { id, error: true, method: "subscribeAddress", data: e };
	}
};

const unSubscribeAddress = async (scriptHashes = [], id = Math.random()) => {
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			let responses = [];
			await Promise.all(
				scriptHashes.map(async (scriptHash) => {
					try {
						const response = await clients.mainClient[coin].blockchainScripthash_unsubscribe(scriptHash);
						responses.push(response);
					} catch {}
				})
			);
			resolve({ id, error: false, method: "unSubscribeAddress", data: responses });
		} catch (e) {
			resolve({
				id,
				error: true,
				method: "unSubscribeAddress",
				data: e,
				scriptHashes
			});
		}
	});
};

const disconnectFromPeer = async ({ id = Math.random(), coin = "" } = {}) => {
	const failure = (data = {}) => {
		return { error: true, id, method: "disconnectFromPeer", data };
	};
	try {
		if (clients.mainClient[coin] === false) {
			//No peer to disconnect from peer...
			return {
				error: false,
				data: "No peer to disconnect from.",
				id,
				coin,
				method: "disconnectFromPeer"
			};
		}
		//Attempt to disconnect from peer...
		clients.mainClient[coin].close();
		clients.mainClient[coin] = false;
		clients.coin = "";
		await pauseExecution();
		return { error: false, id, method: "disconnectFromPeer", coin, data: "Disconnected..." };
	} catch (e) {
		failure(e);
	}
};

const getAddressBalance = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const response = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainAddress_getBalance(address));
			return { id, method, coin, ...response };
		} catch (e) {
			console.log(e);
			resolve({ error: true, method, data: e, coin });
		}
	});
};

const getAddressScriptHash = ({ address = "", coin = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const scriptHash = getScriptHash(address, networks[coin]);
			resolve({ error: false, data: scriptHash });
		} catch (e) {
			resolve({ error: true, data: e });
		}
	});
};

const getAddressScriptHashBalance = ({ scriptHash = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainScripthash_getBalance(scriptHash));
			resolve({ id, error, method, data, scriptHash, coin });
		} catch (e) {
			console.log(e);
			return { id, error: true, method, data: e, coin };
		}
	});
};

const getAddressScriptHashesBalance = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const timeout = getTimeout({ arr: addresses });
			const { error, data } = await promiseTimeout(timeout, clients.mainClient[coin].blockchainScripthashes_getBalance(addresses));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getAddressScriptHashHistory = async ({ scriptHash = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainScripthash_getHistory(scriptHash));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve ({ id, error: true, method, data: e, coin });
		}
	});
};

const getAddressScriptHashesHistory = ({ addresses = [], id = Math.random(), coin = ""} = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const timeout = getTimeout({ arr: addresses });
			const { error, data } = await promiseTimeout(timeout, clients.mainClient[coin].blockchainScripthashes_getHistory(addresses));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: [], coin });
		}
	});
};

const listUnspentAddressScriptHash = ({ scriptHash = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainScripthash_listunspent(scriptHash));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const listUnspentAddressScriptHashes = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const timeout = getTimeout({ arr: addresses });
			const { error, data } = await promiseTimeout(timeout, clients.mainClient[coin].blockchainScripthashes_listunspent(addresses));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getAddressScriptHashMempool = ({ scriptHash = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainScripthash_getMempool(scriptHash));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: [], coin });
		}
	});
};

const getAddressScriptHashesMempool = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const timeout = getTimeout({ arr: addresses });
			const { error, data } = await promiseTimeout(timeout, clients.mainClient[coin].blockchainScripthashes_getMempool(addresses));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getMempool = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainAddress_getMempool(address));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const listUnspentAddress = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainAddress_listunspent(address));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getFeeEstimate = ({ blocksWillingToWait = 8, id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainEstimatefee(blocksWillingToWait));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getAddressHistory = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainAddress_gethistory(address));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getTransactionHex = ({ txId = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainTransaction_get(txId));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getDonationAddress = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const response = await clients.mainClient[coin].serverDonation_address();
			resolve({ id, error: false, method, data: response });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getPeers = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const data = await clients.mainClient[coin].serverPeers_subscribe();
			resolve({ id, error: false, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: null, coin });
		}
	});
};

const getAvailablePeers = ({ id = Math.random(), coin, protocol = "ssl" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//Additional Peers can be located here for reference:
			//(electrum/lib/network.py) https://github.com/spesmilo/electrum/blob/afa1a4d22a31d23d088c6670e1588eed32f7114d/lib/network.py#L57
			const peers = getDefaultPeers(coin, protocol);
			resolve({ id, error: false, method, data: peers });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getVersion = ({ id = Math.random(), v1 = "3.2.3", v2 = "1.4", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		let peerData = "";
		if (clients.mainClient[coin] === false) peerData = await connectToRandomPeer(coin, clients.peers[coin]);
		if (coin !== coin) peerData = await connectToRandomPeer(coin, clients.peers[coin]);
		try {
			const response = await clients.mainClient[coin].server_version(v1, v2);
			resolve({ id, error: false, method, data: response, peerData, coin });
		} catch (e) {
			console.log("bad connection:", JSON.stringify(e));
			console.log("trying again");
			return await getVersion({ id, coin });
		}
	});
};

const getNewBlockHeightSubscribe = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainNumblocks_subscribe());
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

//Returns current block height
const getNewBlockHeadersSubscribe = ({ id = Math.random(), coin = "", updateBlockHeight = () => null } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//if (coin !== coin) await clients.mainClient[coin].connect();
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const response = await clients.mainClient[coin].blockchainHeaders_subscribe();
			let blockHeight = 0;
			try {
				if ("height" in response) {
					blockHeight = response.height;
				} else if ("block_height" in response) {
					blockHeight = response.block_height;
				} else {
					return resolve({ error: true, data: blockHeight });
				}
			} catch (e) {}
			let error = true;
			if (blockHeight !== 0) {
				updateBlockHeight({ selectedCrypto: coin, blockHeight });
				error = false;
			}
			resolve({ id, error, method, data: blockHeight, coin });
		} catch (e) {resolve({ error: true, method, data: e });}
	});
};

const getTransactionMerkle = ({ id = Math.random(), txHash = "", height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainTransaction_getMerkle(txHash, height));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getTransaction = ({ id = Math.random(), txHash = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainTransaction_get(txHash, true));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getTransactions = ({ id = Math.random(), txHashes = [], coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const timeout = getTimeout({ arr: txHashes });
			const { error, data } = await promiseTimeout(timeout, clients.mainClient[coin].blockchainTransactions_get(txHashes, true));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: [], coin });
		}
	});
};


const getAddressUtxo = ({ id = Math.random(), txHash = "", index = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainUtxo_getAddress(txHash, index));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const broadcastTransaction = ({ id = Math.random(), rawTx = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(5000, clients.mainClient[coin].blockchainTransaction_broadcast(rawTx));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getBlockChunk = ({ id = Math.random(), index = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainBlock_getChunk(index));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getBlockHeader = ({ id = Math.random(), height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainBlock_getHeader(height));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getHeader = ({ id = Math.random(), height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainBlock_getBlockHeader(height));
			return { id, error, method, data, coin };
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

const getBanner = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const response = await clients.mainClient[coin].server_banner();
			resolve({ id, error: false, method, data: response });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e });
		}
	});
};

const pingServer = ({ id = Math.random() } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[clients.coin] === false) await connectToRandomPeer(clients.coin, clients.peers[clients.coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[clients.coin].server_ping());
			resolve({ id, error, method, data });
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getAddressProof = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			if (clients.mainClient[coin] === false) await connectToRandomPeer(coin, clients.peers[coin]);
			const { error, data } = await promiseTimeout(getTimeout(), clients.mainClient[coin].blockchainAddress_getProof(address));
			resolve({ id, error, method, data, coin });
		} catch (e) {
			console.log(e);
			resolve({ id, error: true, method, data: e, coin });
		}
	});
};

module.exports = {
	getAddressBalance,
	getAddressScriptHashHistory,
	getAddressScriptHashesHistory,
	getAddressScriptHash,
	getAddressScriptHashBalance,
	getAddressScriptHashesBalance,
	getAddressScriptHashMempool,
	getAddressScriptHashesMempool,
	listUnspentAddressScriptHash,
	listUnspentAddressScriptHashes,
	getMempool,
	listUnspentAddress,
	getFeeEstimate,
	getAddressHistory,
	getTransactionHex,
	getDonationAddress,
	disconnectFromPeer,
	getPeers,
	getAvailablePeers,
	getNewBlockHeightSubscribe,
	getNewBlockHeadersSubscribe,
	getTransactionMerkle,
	getAddressUtxo,
	getTransaction,
	getTransactions,
	broadcastTransaction,
	getBlockChunk,
	getHeader,
	getBlockHeader,
	getBanner,
	pingServer,
	getAddressProof,
	getVersion,
	start,
	stop,
	subscribeHeader,
	subscribeAddress,
	unSubscribeAddress,
	batchAddresses
};
