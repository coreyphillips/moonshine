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

const bitcoin = require("rn-bitcoinjs-lib");
const {
	networks
} = require("./networks");

const getFuncName = () => {
	return getFuncName.caller.name;
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

const disconnectFromPeer = ({ id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.disconnectFromPeer[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.disconnectFromPeer[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.disconnectFromPeer[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressBalance[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressBalance[id],
				this
			);
			
			nodejs.channel.send(JSON.stringify({ method, address, coin, id }));
		} catch (e) {
			resolve({ error: true, method, data: e });
		}
	});
};

const getAddressScriptHashBalance = ({ address = "", id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashBalance[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashBalance[id],
				this
			);
			
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

const getAddressScriptHashesBalance = ({ addresses = [], id = Math.random(), coin = "" } = {}) => {
	const method = getFuncName();
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashesBalance[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashesBalance[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashHistory[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashHistory[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashesHistory[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashesHistory[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.listUnspentAddressScriptHash[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.listUnspentAddressScriptHash[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.listUnspentAddressScriptHash[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.listUnspentAddressScriptHashes[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.listUnspentAddressScriptHashes[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.listUnspentAddressScriptHashes[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashMempool[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashMempool[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashMempool[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesMempool[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressScriptHashesMempool[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressScriptHashesMempool[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getMempool = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getMempool);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getMempool,
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.listUnspentAddress[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.listUnspentAddress[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.listUnspentAddress[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getFeeEstimate = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method) {
					nodejs.channel.removeListener("message", this.getFeeEstimate);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getFeeEstimate,
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressHistory[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressHistory[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getTransactionHex[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getTransactionHex[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getTransactionHex[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getDonationAddress[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getDonationAddress[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getDonationAddress[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getPeers[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getPeers[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getPeers[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAvailablePeers[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAvailablePeers[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAvailablePeers[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getVersion[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getVersion[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getVersion[id],
				this
			);
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
			//Add a new listener that self-removes once complete.
			this.getNewBlockHeightSubscribe[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					resolve({ ...msg, message: "Successfully subscribed to receive new block heights." });
					nodejs.channel.removeListener("message", this.getNewBlockHeightSubscribe[id]);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getNewBlockHeightSubscribe[id],
				this
			);
			
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
					//nodejs.channel.removeListener("message", this.getNewBlockHeadersSubscribe[id]);
					updateBlockHeight({ selectedCrypto: coin, blockHeight: msg.block_height });
					resolve(msg);
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
			//Add a new listener that self-removes once complete.
			this.getTransactionMerkle[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getTransactionMerkle[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getTransactionMerkle[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getTransaction[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getTransaction[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getTransaction[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getTransactions[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getTransactions[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getTransactions[id],
				this
			);
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
			//Add a new listener that self-removes once complete.
			this.getAddressUtxo[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressUtxo[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressUtxo[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.broadcastTransaction[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.broadcastTransaction[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.broadcastTransaction[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getBlockChunk[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getBlockChunk[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getBlockChunk[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getBlockHeader[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getBlockHeader[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getBlockHeader[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getHeader[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getHeader[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getHeader[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getBanner[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getBanner[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getBanner[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.pingServer[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.pingServer[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.pingServer[id],
				this
			);
			
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
			//Add a new listener that self-removes once complete.
			this.getAddressProof[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === method && msg.id === id) {
					nodejs.channel.removeListener("message", this.getAddressProof[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getAddressProof[id],
				this
			);
			
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
	stop
};