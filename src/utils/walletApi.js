import bitcoinUnits from "bitcoin-units";
import * as electrum from "./electrum";
import "../../shim";

const bitcoin = require("rn-bitcoinjs-lib");
const moment = require("moment");
const {
	networks
} = require("./networks");

//Get info from an address path ("m/49'/0'/0'/0/1")
const getInfoFromAddressPath = async (path = "") => {
	try {
		if (path === "") return { error: true, data: "No path specified" };
		let isChangeAddress = false;
		const lastIndex = path.lastIndexOf("/");
		const addressIndex = Number(path.substr(lastIndex + 1));
		const firstIndex = path.lastIndexOf("/", lastIndex-1);
		const addressType = path.substr(firstIndex+1, lastIndex-firstIndex-1);
		if (Number(addressType) === 1) isChangeAddress = true;
		return { error: false, isChangeAddress, addressIndex };
	} catch (e) {
		console.log(e);
		return { error: true, isChangeAddress: false, addressIndex: 0 };
	}
};

//Returns an array of messages from an OP_RETURN message
const decodeOpReturnMessage = (opReturn = "") => {
	try {
		//Remove OP_RETURN from the string & trim the string.
		if (opReturn.includes("OP_RETURN")) {
			opReturn = opReturn.replace("OP_RETURN", "");
			opReturn = opReturn.trim();
		}

		const regex = /[0-9A-Fa-f]{6}/g;
		let messages = [];
		//Separate the string into an array based upon a space and insert each message into an array to be returned
		const data = opReturn.split(" ");
		data.forEach((message) => {
			try {
				//Ensure the message is in fact a hex
				if (regex.test(message)) {
					message = new Buffer(message, "hex");
					message = message.toString();
					messages.push(message);
				}
			} catch (e) {}
		});
		return messages;
	} catch (e) {
		console.log(e);
	}
};

const coinCapExchangeRateHelper = async ({ selectedCrypto = "bitcoin" } = {}) => {
	let exchangeRate = 0;
	try {
		let coin = selectedCrypto.toLowerCase();
		coin = coin.replace("testnet", "");

		const response = await fetch(`https://api.coincap.io/v2/rates/${coin}`);
		const jsonResponse = await response.json();
		exchangeRate = Number(jsonResponse.data.rateUsd).toFixed(2);
		if (exchangeRate === 0) resolve({ error: true, data: "Invalid Exchange Rate Data." });
		return({ error: false, data: exchangeRate });
	} catch (e) {
		return({ error: true, data: "Invalid Exchange Rate Data." });
	}
};

const bitupperExchangeRateHelper = async ({ selectedCrypto = "bitcoin" } = {}) => {
	let exchangeRate = 0;
	try {
		let coin = selectedCrypto.toLowerCase();
		coin = coin.replace("testnet", "");

		const response = await fetch(`https://bitupper.com/api/v0/bitcoin/${coin}`);
		const jsonResponse = await response.json();
		exchangeRate = Number(jsonResponse.last_price_in_usd).toFixed(2);
		if (exchangeRate === 0) resolve({ error: true, data: "Invalid Exchange Rate Data." });
		return({ error: false, data: exchangeRate });
	} catch (e) {
		return({ error: true, data: "Invalid Exchange Rate Data." });
	}
};

const electrumHistoryHelper = async ({ allAddresses = [], addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
	try {
		//Returns: {error: false, data: [{tx_hash: "", height: ""},{tx_hash: "", height: ""}]
		const addressHistory = await electrum.getAddressScriptHashesHistory({ addresses: allAddresses, id: Math.random(), network: networks[selectedCrypto] });
		//Check that the transaction isn't pending in the mempool (Returns { error, data: { height, tx_hash } })
		const scriptHashMempoolResults = await electrum.getAddressScriptHashesMempool({ addresses: allAddresses, id: Math.random(), network: networks[selectedCrypto] });
		/*
		 Should Return:
		 {
		 fee: 259
		 height: 0
		 tx_hash: "4e6d074a1cb783772c0a6c07bcb375c2d82420a840019db72e5d6528f6abf1a6"
		 }
		 */
		if (scriptHashMempoolResults.error === true && addressHistory.error === true) return ({error: true, data: "No transaction data found."});
		const allTransactions = addressHistory.data.concat(scriptHashMempoolResults.data);
		//Remove any duplicate transactions
		//allTransactions = allTransactions.reduce((x, y) => x.findIndex(e=>e.hash===y.hash)<0 ? [...x, y]: x, []);

		//Consolidate addresses into a single array to reduce unnecessary iterations.
		/*
		let combinedAddresses = addresses.concat(changeAddresses);
		combinedAddresses = await Promise.all(allAddresses.map((addr) => addr.address));
		console.log("Logging All Addresses");
		console.log(allAddresses);
		console.log(combinedAddresses);
		*/

		let transactions = [];
		let lastUsedAddress = null;
		let lastUsedChangeAddress = null;
		await Promise.all(allTransactions.map(async (tx) => {
			try {
				let txHash = "";
				let height = 0;
				try {
					txHash = tx.tx_hash;
				} catch (e) {console.log(e);}
				try {
					height = tx.height;
				} catch (e) {console.log(e);}

				if (txHash === "") return;

				try {
					const {error, isChangeAddress, addressIndex} = await getInfoFromAddressPath(tx.path);
					if (isChangeAddress && error === false && lastUsedChangeAddress < addressIndex) lastUsedChangeAddress = addressIndex;
					if (!isChangeAddress && error === false && lastUsedAddress < addressIndex) lastUsedAddress = addressIndex;
				} catch (e) {console.log(e);}

				let decodedTransaction = { error: true, inputs: [], outputs: [], format: "" };
				try {
					decodedTransaction = await electrum.getTransaction({ id: Math.random(), txHash });
					if (decodedTransaction.error === false && decodedTransaction.data.hash !==undefined) {
						decodedTransaction = decodedTransaction.data;
					}
				} catch (e) {console.log(e);}

				//Capture timestamp from decodedTransaction response.
				let timestamp = moment().unix();
				try {
					timestamp = decodedTransaction.blocktime;
				} catch (e) {console.log(e);}

				//Get type and amount
				let type = "sent";
				let outputAmount = 0;
				let inputAmount = 0;
				let receivedAmount = 0;
				let sentAmount = 0;
				let amount = 0;
				let fee = 0;
				let messages = []; //OP_RETURN Messages

				let inputAddressMatch = false;

				try {
					//Iterate over all inputs
					await Promise.all(decodedTransaction.vin.map(async (decodedInput) => {
						try {
							//Store an OP_RETURN messages as messages
							try {
								const asm = decodedInput.scriptSig.asm;
								if (asm !== "" && asm.includes("OP_RETURN")) {
									const OpReturnMessages = decodeOpReturnMessage(asm);
									messages = messages.concat(OpReturnMessages);
								}
							} catch (e) {
								console.log(e);
							}
							//This dictates the index to use for this input's previous output in order to calculate it's amount.
							const n = decodedInput.vout;
							//Get the txHex of the current inputs txid
							let inputDecodedTransaction = await electrum.getTransaction({
								id: Math.random(),
								txHash: decodedInput.txid
							});
							inputDecodedTransaction = inputDecodedTransaction.data;

							//TODO Convert inputAmount from BTC to satoshi before wrapping up.
							//Add up the previously specified output (inputDecodedTransaction.outputs) based on the index (n) of the decoded input and add it to inputAmount
							let nIndexIsUndefined = false;
							try {
								inputAmount = Number((inputAmount + Number(inputDecodedTransaction.vout[n].value)).toFixed(8));
							} catch (e) {
								//console.log(e);
								nIndexIsUndefined = true;
							}

							if (nIndexIsUndefined) return;

							//Ensure that none of the input addresses came from this wallet.
							//inputAddressMatch = true means that they have come from this wallet.
							try {
								if (inputDecodedTransaction.vout[n].scriptPubKey.addresses.includes(tx.address)) inputAddressMatch = true;
							} catch (e) {
								//console.log(e);
							}
							/*
							inputAddressMatch = await Promise.all(allAddresses.filter(address => inputDecodedTransaction.vout[n].scriptPubKey.addresses.includes(address)));
							console.log("Logging InputAddressMatch");
							console.log(inputAddressMatch);
							inputAddressMatch = inputAddressMatch.length > 0;
							*/
							await Promise.all(changeAddresses.map((changeAddress) => {
								try {
									if (inputDecodedTransaction.vout[n].scriptPubKey.addresses.includes(changeAddress.address)) inputAddressMatch = true;
								} catch (e) {
									//console.log(e);
								}
							}));
							await Promise.all(addresses.map((addressStash) => {
								try {
									if (inputDecodedTransaction.vout[n].scriptPubKey.addresses.includes(addressStash.address)) inputAddressMatch = true;
								} catch (e) {
									//console.log(e);
								}
							}));
						} catch (e) {
							console.log(e);
						}
					}));

					//Iterate over each output and add it's satoshi value to outputAmount
					await Promise.all(decodedTransaction.vout.map(async (output) => {
						try {
							//Store OP_RETURN messages as messages
							try {
								const asm = output.scriptPubKey.asm;
								if (asm !== "" && asm.includes("OP_RETURN")) {
									const OpReturnMessages = decodeOpReturnMessage(asm);
									messages = messages.concat(OpReturnMessages);
								}
							} catch (e) {
								console.log(e);
							}
							//If an address from this wallet has already matched a previous input we have sent this transaction
							//If this address is explicitly listed as an output address this is a receive type transaction.
							let match = false;
							let nIndexIsUndefined = false;
							try {
								if (output.scriptPubKey.addresses.includes(tx.address)) {
									match = true;
									if (inputAddressMatch === false) type = "received";
								}
							} catch (e) {
								//console.log(e);
								nIndexIsUndefined = true;
							}
							if (nIndexIsUndefined) return;

							/*
							if (match === false) {
								let isMatch = await Promise.all(allAddresses.filter((address) => output.scriptPubKey.addresses.includes(address.address)));
								match = isMatch.length > 0;
							}
							*/

							if (match === false) {
								await Promise.all(addresses.map((address) => {
									try {
										if (output.scriptPubKey.addresses.includes(address.address)) match = true;
									} catch (e) {
										//console.log(e);
									}
								}));
							}
							//If the address above wasn't a match try iterating over the change addresses.
							if (match === false) {
								//Iterate over each change address. Add the value of every address that is not a changeAddress
								await Promise.all(changeAddresses.map((changeAddress) => {
									try {
										if (output.scriptPubKey.addresses.includes(changeAddress.address)) match = true;
									} catch (e) {
										//console.log(e);
									}
								}));
							}

							try {
								if (match) receivedAmount = Number((receivedAmount + output.value).toFixed(8));
							} catch (e) {
								//console.log(e);
							}

							try {
								outputAmount = Number((outputAmount + Number(output.value)).toFixed(8));
							} catch (e) {
								//console.log(e);
							}
						} catch (e) {
							//console.log(e);
						}
					}));

				} catch (e) {
					//console.log(e);
				}

				try {

					if (type === "sent") sentAmount =  Number(((inputAmount - receivedAmount) - fee).toFixed(8));

					inputAmount = bitcoinUnits(inputAmount, "BTC").to("satoshi").value();
					receivedAmount = bitcoinUnits(receivedAmount, "BTC").to("satoshi").value();
					outputAmount = bitcoinUnits(outputAmount, "BTC").to("satoshi").value();
					sentAmount = bitcoinUnits(sentAmount, "BTC").to("satoshi").value();
				} catch (e) {console.log(e);}

				fee = inputAmount - outputAmount;
				amount = type === "sent" ? sentAmount : receivedAmount;

				const transaction = {
					address: tx.address,
					path: tx.path,
					timestamp: height <= 0 ? moment().unix() : timestamp,
					hash: decodedTransaction.txid,
					data: "",
					type, //sent or received
					block: height <= 0 ? 0 : height,
					amount,
					inputAmount,
					outputAmount,
					fee,
					sentAmount,
					receivedAmount,
					messages
				};
				transactions.push(transaction);
			} catch (e) {
				console.log(e);
			}
		}));
		return { error: false, data: transactions, lastUsedAddress, lastUsedChangeAddress };
	} catch (e) {
		console.log(e);
		return({ error: true, data: "No transaction data found." });
	}
};

const electrumUtxoHelper = async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
	try {
		let utxos = [];
		let balance = 0;
		const allAddresses = addresses.concat(changeAddresses);
		const allUtxos = await electrum.listUnspentAddressScriptHashes({ id: Math.random(), addresses: allAddresses, network: networks[selectedCrypto] });

		//if (allUtxos.error === true) return({ error: true, data: allUtxos });

		await Promise.all(allUtxos.error === false && allUtxos.data.map((utxo) => {
			balance = balance+Number(utxo.value);
			const data = {
				address: utxo.address, //Required
				path: utxo.path, //Required
				value: utxo.value, //Required
				confirmations: currentBlockHeight - Number(utxo.height), //Required
				blockHeight: utxo.height,
				txid: utxo.tx_hash, //Required (Same as tx_hash_big_endian)
				vout: utxo.tx_pos, //Required (Same as tx_output_n)
				//script: utxo.script,
				//script_hex: utxo.script_hex,
				//script_type: utxo.script_type,
				tx_hash: utxo.tx_hash,
				tx_hash_big_endian: utxo.tx_hash,
				tx_output_n: utxo.tx_pos
			};
			utxos.push(data);
		}));

		return({ error: false, data: { utxos, balance } });
	} catch (e) {
		return({ error: true, data: e });
	}
};

const walletHelpers = {
	utxos: {
		bitcoin: {
			electrum: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
				const utxos = await electrumUtxoHelper({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
				if (utxos.error === false) {
					return ({error: false, data: utxos.data});
				} else {
					return utxos;
				}
			},
			default: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, service = "electrum", selectedCrypto = "bitcoin"} = {}) => {
				return await walletHelpers.utxos.bitcoin[service]({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
			}
		},
		bitcoinTestnet: {
			electrum: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0 } = {}) => {
				const utxos = await electrumUtxoHelper({ addresses, changeAddresses, currentBlockHeight, selectedCrypto: "bitcoinTestnet" });
				if (utxos.error === false) {
					return ({error: false, data: utxos.data});
				} else {
					return utxos;
				}
			},
			default: async ({ addresses = [], changeAddresses = [], service = "electrum", currentBlockHeight = 0, selectedCrypto = "bitcoinTestnet"} = {}) => {
				return await walletHelpers.utxos.bitcoinTestnet[service]({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
			}
		},
		litecoin: {
			electrum: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "litecoin" } = {}) => {
				const utxos = await electrumUtxoHelper({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
				if (utxos.error === false) {
					return ({error: false, data: utxos.data});
				} else {
					return utxos;
				}
			},
			default: async ({ addresses = [], changeAddresses = [], service = "electrum"} = {}) => {
				return await walletHelpers.utxos.litecoin[service]({ addresses, changeAddresses });
			}
		},
		litecoinTestnet: {
			electrum: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "litecoinTestnet" } = {}) => {
				const utxos = await electrumUtxoHelper({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
				if (utxos.error === false) {
					return ({error: false, data: utxos.data});
				} else {
					return utxos;
				}
			},
			default: async ({ addresses = [], changeAddresses = [], service = "electrum" } = {}) => {
				return await walletHelpers.utxos.litecoinTestnet[service]({ addresses, changeAddresses });
			}
		}
	},
	getBlockHeight: {
		bitcoin: {
			electrum: async () => {
				try {
					const response = await electrum.getNewBlockHeadersSubscribe({ id: 1 });
					if (response.error === false) {
						let blockHeight = 0;
						try {
							blockHeight = response.data.block_height;
						} catch (e) {}
						try {
							if (blockHeight === 0 || blockHeight === undefined) blockHeight = response.data.height;
						} catch (e) {}
						//Ensure the block height is defined and its value is greater than 1.
						if (blockHeight !== undefined && blockHeight > 1) return { error: false, data: blockHeight }
					}
					return { error: true, data: "Unable to acquire block height." }
				} catch (e) {
					//console.log(e);
					return { error: true, data: e }
				}
			},
			default: async (service = "electrum") => {
				return await walletHelpers.getBlockHeight.bitcoin[service]();
			}
		},
		bitcoinTestnet: {
			electrum: async () => {
				try {
					const response = await electrum.getNewBlockHeadersSubscribe({ id: 1 });
					if (response.error === false) {
						let blockHeight = 0;
						try {
							blockHeight = response.data.block_height;
						} catch (e) {
							try {
								blockHeight = response.data.height;
							} catch (e) {}
						}
						//Ensure the block height is defined and its value is greater than 1.
						if (blockHeight !== undefined && blockHeight > 1) return { error: false, data: blockHeight };
					}
					return { error: true, data: "Unable to acquire block height." }
				} catch (e) {
					//console.log(e);
					return { error: true, data: e }
				}
			},
			default: async (service = "electrum") => {
				return await walletHelpers.getBlockHeight.bitcoinTestnet[service]();
			}
		},
		litecoin: {
			electrum: async () => {
				try {
					const response = await electrum.getNewBlockHeadersSubscribe({ id: 1 });
					if (response.error === false) {
						const blockHeight = response.data.block_height;
						//Ensure the block height is defined and its value is greater than 1.
						if (blockHeight !== undefined && blockHeight > 1) return { error: false, data: blockHeight };
					}
					return { error: true, data: "Unable to acquire block height." }
				} catch (e) {
					//console.log(e);
					return { error: true, data: e }
				}
			},
			default: async (service = "electrum") => {
				return await walletHelpers.getBlockHeight.litecoin[service]();
			}
		},
		litecoinTestnet: {
			electrum: async () => {
				try {
					const response = await electrum.getNewBlockHeadersSubscribe({ id: 1 });
					if (response.error === false) {
						const blockHeight = response.data.block_height;
						//Ensure the block height is defined and its value is greater than 1.
						if (blockHeight !== undefined && blockHeight > 1) return { error: false, data: blockHeight };
					}
					return { error: true, data: "Unable to acquire block height." }
				} catch (e) {
					//console.log(e);
					return { error: true, data: e }
				}
			},
			default: async (service = "electrum") => {
				return await walletHelpers.getBlockHeight.litecoinTestnet[service]();
			}
		}
	},
	history: {
		bitcoin: {
			electrum: async ({ allAddresses = [], addresses = [], changeAddresses = [], currentBlockHeight = 0 , selectedCrypto = "bitcoin" } = {}) => {
				try {
					const transactions = await electrumHistoryHelper({
						allAddresses,
						addresses,
						changeAddresses,
						selectedCrypto,
						currentBlockHeight
					});
					if (transactions.error === true) return { error: true, data: [] };
					return transactions;
				} catch (e) {
					return { error: true, data: e };
				}
			},
			default: async ({ allAddresses = [], address = "", addresses = [], changeAddresses = [], service = "electrum", currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
				return await walletHelpers.history.bitcoin[service]({ allAddresses, address, addresses, changeAddresses, selectedCrypto, currentBlockHeight });
			}
		},
		bitcoinTestnet: {
			electrum: async ({ allAddresses = [], selectedCrypto = "bitcoinTestnet", addresses = [], changeAddresses = [], currentBlockHeight = 0 } = {}) => {
				try {
					const transactions = await electrumHistoryHelper({
						allAddresses,
						addresses,
						changeAddresses,
						selectedCrypto,
						currentBlockHeight
					});
					if (transactions.error === true) return { error: true, data: [] };
					return transactions;
				} catch (e) {
					return { error: true, data: e };
				}
			},
			default: async ({ allAddresses = [], address = "", addresses = [], changeAddresses = [], service = "electrum", selectedCrypto = "bitcoinTestnet", currentBlockHeight = 0 } = {}) => {
				return await walletHelpers.history.bitcoinTestnet[service]({ allAddresses, address, addresses, changeAddresses, selectedCrypto, currentBlockHeight });
			}
		},
		litecoin: {
			electrum: async ({ allAddresses = [], selectedCrypto = "litecoin", addresses = [], changeAddresses = [], currentBlockHeight = 0 } = {}) => {
				try {
					const transactions = await electrumHistoryHelper({
						allAddresses,
						addresses,
						changeAddresses,
						selectedCrypto,
						currentBlockHeight
					});
					if (transactions.error === true) return { error: true, data: [] };
					return transactions;
				} catch (e) {
					return { error: true, data: e };
				}
			},
			default: async ({ allAddresses = [], address = "", addresses = [], changeAddresses = [],  service = "electrum", selectedCrypto = "litecoin" }) => {
				return await walletHelpers.history.litecoin[service]({ allAddresses, address, addresses, changeAddresses, selectedCrypto });
			}
		},
		litecoinTestnet: {
			electrum: async ({ allAddresses = [], selectedCrypto = "litecoinTestnet", addresses = [], changeAddresses = [], currentBlockHeight = 0 } = {}) => {
				try {
					const transactions = await electrumHistoryHelper({
						allAddresses,
						addresses,
						changeAddresses,
						selectedCrypto,
						currentBlockHeight
					});
					if (transactions.error === true) return { error: true, data: [] };
					return transactions;
				} catch (e) {
					return { error: true, data: e };
				}
			},
			default: async ({ allAddresses = [], address = "", addresses = [], changeAddresses = [],  service = "electrum", selectedCrypto = "litecoinTestnet" }) => {
				return await walletHelpers.history.litecoinTestnet[service]({ allAddresses, address, addresses, changeAddresses, selectedCrypto });
			}
		}
	},
	pushtx: {
		bitcoin: {
			electrum: async(rawTx) => {
				return await electrum.broadcastTransaction({ id: 1, rawTx });

			},
			default: async (tx = "", service = "electrum") => {
				return await walletHelpers.pushtx.bitcoin[service](tx);
			}
		},
		bitcoinTestnet: {
			electrum: async(rawTx) => {
				return await electrum.broadcastTransaction({ id: 1, rawTx });

			},
			default: async (tx = "", service = "electrum") => {
				return await walletHelpers.pushtx.bitcoinTestnet[service](tx);
			}
		},
		litecoin: {
			electrum: async(rawTx) => {
				return await electrum.broadcastTransaction({ id: 1, rawTx });

			},
			default: async (tx = "", service = "electrum") => {
				return await walletHelpers.pushtx.litecoin[service](tx);
			}
		},
		litecoinTestnet: {
			electrum: async(rawTx) => {
				return await electrum.broadcastTransaction({ id: 1, rawTx });
			},
			default: async (tx = "", service = "electrum") => {
				return await walletHelpers.pushtx.litecoinTestnet[service](tx);
			}
		}
	},
	exchangeRate: {
		bitcoin: {
			coincap: async () => {
				const exchangeRate = await coinCapExchangeRateHelper({ selectedCrypto: "bitcoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			bitupper: async () => {
				const exchangeRate = await bitupperExchangeRateHelper({ selectedCrypto: "bitcoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			default: async (service = "coincap") => {
				return await walletHelpers.exchangeRate.bitcoin[service]();
			}
		},
		bitcoinTestnet: {
			coincap: async () => {
				const exchangeRate = await coinCapExchangeRateHelper({ selectedCrypto: "bitcoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			bitupper: async () => {
				const exchangeRate = await bitupperExchangeRateHelper({ selectedCrypto: "bitcoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			default: async (service = "coincap") => {
				return await walletHelpers.exchangeRate.bitcoin[service]();
			}
		},
		litecoin: {
			coincap: async () => {
				const exchangeRate = await coinCapExchangeRateHelper({ selectedCrypto: "litecoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			bitupper: async () => {
				const exchangeRate = await bitupperExchangeRateHelper({ selectedCrypto: "litecoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			default: async (service = "coincap") => {
				return await walletHelpers.exchangeRate.litecoin[service]();
			}
		},
		litecoinTestnet: {
			coincap: async () => {
				const exchangeRate = await coinCapExchangeRateHelper({ selectedCrypto: "litecoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			bitupper: async () => {
				const exchangeRate = await bitupperExchangeRateHelper({ selectedCrypto: "litecoin" });
				if (exchangeRate.error === false) {
					return ({error: false, data: exchangeRate.data});
				} else {
					return ({ error: true, data: "Invalid Exchange Rate Data." });
				}
			},
			default: async (rawtx, service = "coincap") => {
				return await walletHelpers.exchangeRate.litecoinTestnet[service]();
			}
		}
	}
};

module.exports = {
	walletHelpers
};