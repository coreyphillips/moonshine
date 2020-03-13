import nodejs from "nodejs-mobile-react-native";
import "../../shim";

this.electrumKeepAlive = () => null;
this.getAddressBalance = {};
this.getAddressScriptHashBalance = {};
this.getAddressScriptHashesBalance = {};
this.getAddressScriptHashHistory = {};
this.getAddressScriptHashesHistory = {};
this.getAddressScriptHashMempool = {};
this.getAddressScriptHashesMempool = {};
this.listUnspentAddressScriptHash = {};
this.listUnspentAddressScriptHashes = {};
this.getMempool = {};
this.pingServer = {};
this.getBanner = {};
this.listUnspentAddress = {};
this.getFeeEstimate = {};
this.getAddressHistory = {};
this.getTransactionHex = {};
this.getDonationAddress = {};
this.disconnectFromPeer = {};
this.getAvailablePeers = {};
this.getPeers = {};
this.getNewBlockHeightSubscribe = {};
this.getTransactionMerkle = {};
this.getTransaction = {};
this.getTransactions = {};
this.getAddressUtxo = {};
this.broadcastTransaction = {};
this.getBlockChunk = {};
this.getBlockHeader = {};
this.getHeader = {};
this.getAddressProof = {};
this.getVersion = {};
this.getNewBlockHeadersSubscribe = {};
this.connectToPeer = {};
this.subscribeHeader = {};
this.subscribeAddress = {};
this.subscribedAddresses = [];
this.notifiedAddresses = [];
const bitcoin = require("bitcoinjs-lib");
const {
	networks
} = require("./networks");

const getFuncName = () => {
	return getFuncName.caller.name;
};

const setupListener = async ({ id = "", method = "", resolve = () => null }) => {
	try {
		//Add a new listener that self-removes once complete.
		this[method][id] = ((msg) => {
			msg = JSON.parse(msg);
			if (msg.method === method && msg.id === id) {
				nodejs.channel.removeListener("message", this[method][id]);
				resolve(msg);
			}
		});
		//Ensure the listener is setup and established.
		await nodejs.channel.addListener(
			"message",
			this[method][id],
			this
		);
	} catch (e) {}
};

//peers = A list of peers acquired from default electrum servers using the getPeers method.
//customPeers = A list of peers added by the user to connect to by default in lieu of the default peer list.
const start = async ({ id = Math.random(), coin = "", peers = [], customPeers = []} = {}) => {
	const method = "connectToPeer";
	//Spin up the nodejs thread
	//await nodejs.start("main.js");
	
	return new Promise(async (resolve) => {
		try {
			if (!coin) resolve({error: true, data: {}});
			//Clear/Remove any previous keep-alive message.
			try {
				clearInterval(this.electrumKeepAlive);
			} catch (e) {}
			
			//Setup the listener for electrum messages
			this.connectToPeer[id] = (async (msg) => {
				try {
					msg = JSON.parse(msg);
					if (msg.method === method && msg.id === id) {
						nodejs.channel.removeListener("message", this.connectToPeer[id]);
						if (msg.error === false && msg.data !== "" ) {
							try {
								//Start Electrum's keep-alive function
								//It’s sent every minute as a keep-alive message.
								this.electrumKeepAlive = setInterval(async () => {
									try {
										pingServer({id: Math.random()});
									} catch (e) {}
								}, 60000);
								resolve(msg);
							} catch (e) {
								resolve({error: true, data: e});
							}
						}
						resolve(msg);
					}
				} catch (e) {
					resolve({error: true, data: e});
				}
			});
			//Add the listener for electrum messages
			await nodejs.channel.addListener(
				"message",
				this.connectToPeer[id],
				this
			);
			nodejs.channel.send(JSON.stringify({ id, method, coin, peers, customPeers }));
		} catch (e) {
			console.log(e);
			resolve({ error: true, method, data: e });
		}
	});
};

const stop = async ({ coin = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Clear/Remove Electrum's keep-alive message.
			clearInterval(this.electrumKeepAlive);
			//Disconnect from peer
			const response = await disconnectFromPeer({ coin });
			resolve(response);
		} catch (e) {
			console.log(e);
			resolve({ error: true, data: e });
		}
	});
	
};

const setupSubscribeHeader = async ({ id = "", method = "", onReceive = () => null } = {}) => {
	try {
		//Remove any previous listener
		await nodejs.channel.removeListener("message", this[method][id]);
		
		this[method][id] = ((msg) => {
			msg = JSON.parse(msg);
			if (msg.method === method && msg.id === id && Array.isArray(msg.data)) {
				onReceive(msg);
			}
		});
		//Ensure the listener is setup and established.
		await nodejs.channel.addListener(
			"message",
			this[method][id],
			this
		);
	} catch (e) {console.log(e);}
};

const subscribeHeader = async ({ id = "subscribeHeader", coin = "", onReceive = () => null } = {}) => {
	try {
		await setupSubscribeHeader({id, method: "subscribeHeader", onReceive});
		nodejs.channel.send(JSON.stringify({method: "subscribeHeader", coin, id}));
		if (__DEV__) console.log("Subscribed to headers.");
	} catch (e) {
		console.log(e);
	}
};

const setupSubscribeAddress = async ({ address = "", id = "", method = "", onReceive = () => null } = {}) => {
	try {
		//Remove any previous listener
		//await nodejs.channel.removeListener("message", this[method][id]);
		
		this[method][id] = ((msg) => {
			msg = JSON.parse(msg);
			if (msg.method === method && msg.id === id && Array.isArray(msg.data) && this.notifiedAddresses.includes(address) === false) {
				if (this.notifiedAddresses.includes(address)) return;
				this.notifiedAddresses.push(address);
				onReceive(msg);
			}
		});
		//Ensure the listener is setup and established.
		await nodejs.channel.addListener(
			"message",
			this[method][id],
			this
		);
	} catch (e) {console.log(e);}
};

const subscribeAddress = async ({ id = "wallet0bitcoin", address = "", coin = "bitcoin", onReceive = (data) => console.log(data) } = {}) => {
	try {
		//Ensure this address is not already subscribed
		if (this.subscribedAddresses.includes(address)) return;
		this.subscribedAddresses.push(address);
		await setupSubscribeAddress({ address, id, method: "subscribeAddress", onReceive });
		nodejs.channel.send(JSON.stringify({id, address, coin, method: "subscribeAddress"}));
		if (__DEV__) console.log(`Subscribed to scriptHash: ${address}`);
	} catch (e) {
		console.log(e);
	}
};

const unSubscribeAddress = async (scriptHashes = []) => {
	try {
		/* TODO: Get blockchain.scripthash.unsubscribe working.
		await setupSubscribe({ id, method: "unSubscribeAddress", onReceive });
		nodejs.channel.send(JSON.stringify({id, scriptHashes, coin, method: "unSubscribeAddress"}));
		*/
		return new Promise(async (resolve) => {
			try {
				await Promise.all(
					scriptHashes.map(async (scriptHash) => {
						try {
							//Remove any previous listener
							nodejs.channel.removeListener("message", this["subscribeAddress"][scriptHash], this);
						} catch (e) {console.log(e);}
					})
				);
				if (__DEV__) console.log(`Unsubscribed.`);
				resolve({ error: false, data: "Unsubscribed from address." });
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	} catch (e) {
		console.log(e);
	}
};

const disconnectFromPeer = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			nodejs.channel.send(JSON.stringify({ method, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const addElectrumListener = () => {
	try {
		//Setup the listener for electrum messages
		this.listenerRef = ((msg) => {
			try {
				msg = JSON.parse(msg);
				switch (msg.method) {
					case "getAddressBalance":
						//Execute anything you need for the given function...
						break;
					default:
						return;
				}
			} catch (e) {
				JSON.stringify(e);
			}
		});
		//Add the listener for electrum messages
		nodejs.channel.addListener(
			"message",
			this.listenerRef,
			this
		);
	} catch (e) {
		console.log(e);
	}
};

const removeElectrumListener = () => {
	try {
		if (this.listenerRef) {
			nodejs.channel.removeListener("message", this.listenerRef);
		}
	} catch (e) {
		console.log(e);
	}
};

const getAddressBalance = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHash = ({ address = "", coin = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const script = bitcoin.address.toOutputScript(address, networks[coin]);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");
			resolve({ error: false, data: scriptHash });
		} catch (e) {
			resolve({ error: true, data: e });
		}
	});
};

const getAddressScriptHashBalance = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			const result = await getAddressScriptHash({ address, coin });
			if (result.error) return resolve({ error: true, method, data: result.data });
			const scriptHash = result.data;
			nodejs.channel.send(JSON.stringify({ method, scriptHash, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashesBalance = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			let scriptHashes = [];
			await Promise.all(addresses.map(({ address, path }) => {
				try {
					const script = bitcoin.address.toOutputScript(address, networks[coin]);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {
					console.log(e);
				}
			}));
			
			nodejs.channel.send(JSON.stringify({ method, scriptHashes, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashHistory = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			const script = bitcoin.address.toOutputScript(address, networks[coin]);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");
			
			nodejs.channel.send(JSON.stringify({ method, scriptHash, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashesHistory = ({ addresses = [], id = Math.random(), coin = ""} = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			let scriptHashes = [];
			await Promise.all(addresses.map(({ address, path }) => {
				try {
					const script = bitcoin.address.toOutputScript(address, networks[coin]);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {
					console.log(e);
				}
			}));
			
			nodejs.channel.send(JSON.stringify({ method, scriptHashes, id, coin }));
		} catch (e) {
			resolve({ error: true, method, data: e, coin });
		}
	});
};

const listUnspentAddressScriptHash = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			const script = bitcoin.address.toOutputScript(address, networks[coin]);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");
			
			nodejs.channel.send(JSON.stringify({ method, scriptHash, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const listUnspentAddressScriptHashes = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			const scriptHashes = [];
			await Promise.all(addresses.map(({ address = "", path = "" } = {}) => {
				try {
					if (!address || !path) return;
					const script = bitcoin.address.toOutputScript(address, networks[coin]);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {}
			}));
			
			nodejs.channel.send(JSON.stringify({ method, scriptHashes, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashMempool = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			const script = bitcoin.address.toOutputScript(address, networks[coin]);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");
			
			nodejs.channel.send(JSON.stringify({ method, scriptHash, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashesMempool = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			const scriptHashes = [];
			await Promise.all(addresses.map(({ address, path }) => {
				try {
					const script = bitcoin.address.toOutputScript(address, networks[coin]);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {}
			}));
			
			nodejs.channel.send(JSON.stringify({ method, scriptHashes, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getMempool = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const listUnspentAddress = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getFeeEstimate = ({ blocksWillingToWait = 8, id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ id, method, blocksWillingToWait, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getAddressHistory = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getTransactionHex = ({ txId = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, txId, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getDonationAddress = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method: "getDonationAddress", coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getPeers = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getAvailablePeers = ({ id = Math.random(), coin } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getVersion = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			nodejs.channel.send(JSON.stringify({ method, id, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getNewBlockHeightSubscribe = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

//Returns current block height
const getNewBlockHeadersSubscribe = ({ id = Math.random(), coin = "", updateBlockHeight = () => null } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getNewBlockHeadersSubscribe[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method) {
					let blockHeight = 0;
					try {
						if (msg.data.height) {
							blockHeight = msg.data.height;
						} else if (msg.data.block_height) {
							blockHeight = msg.data.block_height;
						} else {
							resolve({ error: true, data: blockHeight });
						}
					} catch (e) {}
					nodejs.channel.removeListener("message", this.getNewBlockHeadersSubscribe[id]);
					if (blockHeight !== 0) updateBlockHeight({ selectedCrypto: coin, blockHeight });
					resolve({ error: msg.error, data: blockHeight });
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getNewBlockHeadersSubscribe[id],
				this
			);
			nodejs.channel.send(JSON.stringify({ method, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getTransactionMerkle = ({ id = Math.random(), txHash = "", height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, txHash, height, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getTransaction = ({ id = Math.random(), txHash = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, txHash, coin }));
		} catch (e) {
			resolve({ id, method, error: true, data: e });
		}
	});
};

const getTransactions = ({ id = Math.random(), txHashes = [], coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			nodejs.channel.send(JSON.stringify({ method, id, txHashes, coin }));
		} catch (e) {
			resolve({ id, method, error: true, data: e });
		}
	});
};


const getAddressUtxo = ({ id = Math.random(), txHash = "", index = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, txHash, index, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const broadcastTransaction = ({ id = Math.random(), rawTx = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, rawTx, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getBlockChunk = ({ id = Math.random(), index = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, index, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getBlockHeader = ({ id = Math.random(), height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, height, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getHeader = ({ id = Math.random(), height = "", coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, height, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getBanner = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id, coin }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const pingServer = ({ id = Math.random() } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

const getAddressProof = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			await setupListener({ id, method, resolve });
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ id, error: true, method, data: e });
		}
	});
};

module.exports = {
	addElectrumListener,
	removeElectrumListener,
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
	unSubscribeAddress
};
