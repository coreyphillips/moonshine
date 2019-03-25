import nodejs from "nodejs-mobile-react-native";
import "../../shim";

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
this.getAddressUtxo = {};
this.broadcastTransaction = {};
this.getBlockChunk = {};
this.getBlockHeader = {};
this.getHeader = {};
this.getAddressProof = {};
this.getVersion = {};
this.getNewBlockHeadersSubscribe = {};
this.connectToPeer = {};
this.createAddresses = {};

const bitcoin = require("rn-bitcoinjs-lib");

const start = async ({ id = Math.random(), coin = "", customPeers = []} = {}) => {
	//Spin up the nodejs thread
	//await nodejs.start("main.js");

	return new Promise(async (resolve) => {
		try {
			//Clear/Remove any previous keep-alive message.
			clearInterval(this.electrumKeepAlive);

			//Setup the listener for electrum messages
			this.connectToPeer[id] = (async (msg) => {
				try {
					msg = JSON.parse(msg);
					console.log(msg);
					if (msg.method === "connectToPeer") {
						nodejs.channel.removeListener("message", this.connectToPeer[id]);
						if (msg.error === false && msg.data !== "" ) {
							try {
								//Start Electrum's keep-alive function
								//It’s sent every minute as a keep-alive message.
								const versionResponse = await getVersion({id: Math.random(), coin});
								this.electrumKeepAlive = setInterval(async () => {
									getVersion({id: Math.random(), coin});
								}, 60000);
							} catch (e) {
								resolve({error: true, data: e})
							}
						}
						resolve(msg);
					}
				} catch (e) {
					resolve({error: true, data: e})
				}
			});
			//Add the listener for electrum messages
			await nodejs.channel.addListener(
				"message",
				this.connectToPeer[id],
				this
			);
			nodejs.channel.send(JSON.stringify({ id, method: "connectToPeer", coin, customPeers }));
		} catch (e) {
			console.log(e);
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const stop = () => {
	try {
		//Clear/Remove Electrum's keep-alive message.
		clearInterval(this.electrumKeepAlive);
		//Remove any selectedCoin
		this.coin = "";
		//Disconnect from peer
		disconnectFromPeer({ id: Math.random() });
	} catch (e) {
		console.log(e);
	}
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
					default:
						break;
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

const getAddressBalance = ({ address = "", id = Math.random() } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressBalance" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getAddressBalance", address, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashBalance = ({ address = "", id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashBalance" && msg.id === id) {
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

			const script = bitcoin.address.toOutputScript(address, network);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashBalance", scriptHash, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashesBalance = ({ addresses = [], id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesBalance[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashesBalance" && msg.id === id) {
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
			await Promise.all(addresses.map((address) => {
				try {
					const script = bitcoin.address.toOutputScript(address, network);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address });
				} catch (e) {
					console.log(e);
				}
			}));

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashesBalance", scriptHashes, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashHistory = ({ address = "", id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashHistory" && msg.id === id) {
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

			const script = bitcoin.address.toOutputScript(address, network);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashHistory", scriptHash, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashesHistory = ({ addresses = [], id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashesHistory" && msg.id === id) {
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
					const script = bitcoin.address.toOutputScript(address, network);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {
					console.log(e);
				}
			}));

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashesHistory", scriptHashes, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const listUnspentAddressScriptHash = ({ address = "", id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.listUnspentAddressScriptHash[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "listUnspentAddressScriptHash" && msg.id === id) {
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

			const script = bitcoin.address.toOutputScript(address, network);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");

			nodejs.channel.send(JSON.stringify({ method: "listUnspentAddressScriptHash", scriptHash, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const listUnspentAddressScriptHashes = ({ addresses = [], id = Math.random(), network } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.listUnspentAddressScriptHashes[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "listUnspentAddressScriptHashes" && msg.id === id) {
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
					const script = bitcoin.address.toOutputScript(address, network);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {}
			}));

			nodejs.channel.send(JSON.stringify({ method: "listUnspentAddressScriptHashes", scriptHashes, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashMempool = ({ address = "", id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashMempool[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashMempool" && msg.id === id) {
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

			const script = bitcoin.address.toOutputScript(address, network);
			let hash = bitcoin.crypto.sha256(script);
			const reversedHash = new Buffer(hash.reverse());
			const scriptHash = reversedHash.toString("hex");

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashMempool", scriptHash, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressScriptHashesMempool = ({ addresses = [], id = Math.random(), network }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressScriptHashesMempool[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressScriptHashesMempool" && msg.id === id) {
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
					const script = bitcoin.address.toOutputScript(address, network);
					let hash = bitcoin.crypto.sha256(script);
					const reversedHash = new Buffer(hash.reverse());
					const scriptHash = reversedHash.toString("hex");
					scriptHashes.push({ scriptHash, address, path });
				} catch (e) {console.log(e)}
			}));

			nodejs.channel.send(JSON.stringify({ method: "getAddressScriptHashesMempool", scriptHashes, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getMempool = ({ address = "", id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getMempool = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getMempool" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getMempool", address, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const listUnspentAddress = ({ address = "", id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.listUnspentAddress[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "listUnspentAddress" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "listUnspentAddress", address, id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getFeeEstimate = ({ blocksWillingToWait = 8, id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getFeeEstimate = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getFeeEstimate") {
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

			nodejs.channel.send(JSON.stringify({ id, method: "getFeeEstimate", blocksWillingToWait }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressHistory = ({ address = "", id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressHistory[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressHistory" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getAddressHistory", address, id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getTransactionHex = ({ txId = "", id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getTransactionHex[id] = ((msg) => {
				msg = JSON.parse(msg);
				if (msg.method === "getTransactionHex" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getTransactionHex", txId, id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getDonationAddress = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getDonationAddress[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getDonationAddress" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getDonationAddress", id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const disconnectFromPeer = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.disconnectFromPeer[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "disconnectFromPeer" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "disconnectFromPeer", id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getPeers = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getPeers[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getPeers" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getPeers", id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAvailablePeers = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAvailablePeers[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getAvailablePeers" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getAvailablePeers", id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getVersion = ({ id = Math.random(), coin = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getVersion[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getVersion" && msg.id === id) {
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
			nodejs.channel.send(JSON.stringify({ method: "getVersion", id, coin }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getNewBlockHeightSubscribe = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getNewBlockHeightSubscribe[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getNewBlockHeightSubscribe" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getNewBlockHeightSubscribe", id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

//Returns current block height
const getNewBlockHeadersSubscribe = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getNewBlockHeadersSubscribe[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getNewBlockHeadersSubscribe" && msg.id === id) {
					//resolve({ ...msg, message: "Successfully subscribed to receive new block heights." });
					resolve(msg);
					nodejs.channel.removeListener("message", this.getNewBlockHeadersSubscribe[id]);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.getNewBlockHeadersSubscribe[id],
				this
			);

			nodejs.channel.send(JSON.stringify({ method: "getNewBlockHeadersSubscribe", id }));
		} catch (e) {
			resolve({ error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getTransactionMerkle = ({ id = Math.random(), txHash = "", height = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getTransactionMerkle[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getTransactionMerkle" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getTransactionMerkle", id, txHash, height }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getTransaction = ({ id = Math.random(), txHash = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getTransaction[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getTransaction" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getTransaction", id, txHash }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};


const getAddressUtxo = ({ id = Math.random(), txHash = "", index = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressUtxo[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressUtxo" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getAddressUtxo", id, txHash, index }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const broadcastTransaction = ({ id = Math.random(), rawTx = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.broadcastTransaction[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "broadcastTransaction" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "broadcastTransaction", id, rawTx }));
		} catch (e) {
			resolve({ id, error: true, data: e });
		}
	});
};

const getBlockChunk = ({ id = Math.random(), index = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getBlockChunk[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getBlockChunk" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getBlockChunk", id, index }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getBlockHeader = ({ id = Math.random(), height = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getBlockHeader[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getBlockHeader" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getBlockHeader", id, height }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getHeader = ({ id = Math.random(), height = "" }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getHeader[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getHeader" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getHeader", id, height }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getBanner = ({ id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getBanner[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getBanner" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getBanner", id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const getAddressProof = ({ address = "", id = Math.random() }) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.getAddressProof[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "getAddressProof" && msg.id === id) {
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

			nodejs.channel.send(JSON.stringify({ method: "getAddressProof", address, id }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

const createAddresses = ({ id = Math.random(), root = "" , network, networkValue = 0, addressAmount = 0, addressIndex = 0, changeAddressAmount = 0, changeAddressIndex = 0 } = {}) => {
	return new Promise(async (resolve) => {
		try {
			//Add a new listener that self-removes once complete.
			this.createAddresses[id] = (msg => {
				msg = JSON.parse(msg);
				if (msg.method === "createAddresses" && msg.id === id) {
					nodejs.channel.removeListener("message", this.createAddresses[id]);
					resolve(msg);
				}
			});
			//Ensure the listener is setup and established.
			await nodejs.channel.addListener(
				"message",
				this.createAddresses[id],
				this
			);

			nodejs.channel.send(JSON.stringify({ method: "createAddresses", network, networkValue, id, addressAmount, addressIndex, changeAddressAmount, changeAddressIndex, root }));
		} catch (e) {
			resolve({ id, error: true, errorTitle: "", errorMsg: "", data: e });
		}
	});
};

module.exports = {
	addElectrumListener,
	removeElectrumListener,
	createAddresses,
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
	broadcastTransaction,
	getBlockChunk,
	getHeader,
	getBlockHeader,
	getBanner,
	getAddressProof,
	getVersion,
	start,
	stop
};