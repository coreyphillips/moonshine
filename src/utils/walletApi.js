import bitcoinUnits from "bitcoin-units";
import * as electrum from "./electrum";
import "../../shim";

const moment = require("moment");
const {
	networks
} = require("./networks");
const {
	Constants: {
		currencies
	}
} = require("../../ProjectData.json");

//Get info from an address path ("m/49'/0'/0'/0/1")
const getInfoFromAddressPath = async (path = "") => {
	return new Promise(async (resolve) => {
		try {
			if (path === "") return { error: true, data: "No path specified" };
			let isChangeAddress = false;
			const lastIndex = path.lastIndexOf("/");
			const addressIndex = Number(path.substr(lastIndex + 1));
			const firstIndex = path.lastIndexOf("/", lastIndex - 1);
			const addressType = path.substr(firstIndex + 1, lastIndex - firstIndex - 1);
			if (Number(addressType) === 1) isChangeAddress = true;
			resolve({ error: false, isChangeAddress, addressIndex });
		} catch (e) {
			console.log(e);
			resolve({ error: true, isChangeAddress: false, addressIndex: 0 });
		}
	});
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
			} catch {}
		});
		return messages;
	} catch (e) {
		console.log(e);
	}
};

const coinCapExchangeRateHelper = async ({ selectedCrypto = "bitcoin", selectedCurrency = "usd" } = {}) => {
	let exchangeRate = 0;
	try {
		let coin = selectedCrypto.toLowerCase();
		coin = coin.replace("testnet", "");
		//Get coin rate in usd.
		const coinRateResponse = await fetch(`https://api.coincap.io/v2/rates/${coin}`);
		const jsonCoinRateResponse = await coinRateResponse.json();
		const coinRate = Number(jsonCoinRateResponse.data.rateUsd);
		//Get selected fiat rate in usd.
		const fiatId = currencies[selectedCurrency].id;
		const fiatRateResponse = await fetch(`https://api.coincap.io/v2/rates/${fiatId}`);
		const jsonFiatRateResponse = await fiatRateResponse.json();
		const fiatRate = Number(jsonFiatRateResponse.data.rateUsd);
		//Calculate Exchange Rate
		exchangeRate = (coinRate * (1 / fiatRate)).toFixed(2);

		if (exchangeRate === 0 || isNaN(exchangeRate)) return ({ error: true, data: "Invalid Exchange Rate Data." });
		return ({ error: false, data: exchangeRate });
	} catch (e) {
		return ({ error: true, data: "Invalid Exchange Rate Data." });
	}
};

const coinGeckoExchangeRateHelper = async ({ selectedCrypto = "bitcoin", selectedCurrency = "usd" } = {}) => {
	let exchangeRate = 0;
	try {
		let coin = selectedCrypto.toLowerCase();
		coin = coin.replace("testnet", "");

		const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${selectedCurrency}`);
		const jsonResponse = await response.json();
		exchangeRate = Number(jsonResponse[selectedCrypto][selectedCurrency]).toFixed(2);
		if (exchangeRate === 0 || isNaN(exchangeRate)) return ({ error: true, data: "Invalid Exchange Rate Data." });
		return ({ error: false, data: exchangeRate });
	} catch (e) {
		return ({ error: true, data: "Invalid Exchange Rate Data." });
	}
};

const electrumHistoryHelper = async ({ allAddresses = [], addresses = [], changeAddresses = [], selectedCrypto = "bitcoin" } = {}) => {
	try {
		const combinedAddresses = addresses.concat(changeAddresses);
		//Returns: {error: false, data: [{tx_hash: "", height: ""},{tx_hash: "", height: ""}]
		let addressHistory = await electrum.getAddressScriptHashesHistory({
			addresses: allAddresses,
			id: Math.random(),
			network: networks[selectedCrypto],
			coin: selectedCrypto
		});
		//Check that the transaction isn't pending in the mempool (Returns { error, data: { height, tx_hash } })
		let scriptHashMempoolResults = await electrum.getAddressScriptHashesMempool({
			addresses: allAddresses,
			id: Math.random(),
			network: networks[selectedCrypto],
			coin: selectedCrypto
		});

		if (addressHistory.error === true) addressHistory = { error: addressHistory.error, data: [] };
		if (scriptHashMempoolResults.error === true) scriptHashMempoolResults = {
			error: scriptHashMempoolResults.error,
			data: []
		};
		if (scriptHashMempoolResults.error === true && addressHistory.error === true) return ({
			error: true,
			data: "No transaction data found."
		});
		const allTransactions = addressHistory.data.concat(scriptHashMempoolResults.data);

		let decodedTransactions = [];
		try {
			const result = await electrum.getTransactions({
				id: Math.random(),
				txHashes: allTransactions,
				coin: selectedCrypto
			});
			if (!result.error) decodedTransactions = result.data;
		} catch {}
		let transactions = [];
		let lastUsedAddress = null;
		let lastUsedChangeAddress = null;
		await Promise.all(decodedTransactions.map(async (tx) => {
			try {
				let txHash = "";
				let height = 0;
				try {
					txHash = tx.txid;
				} catch {}
				try {
					height = tx.height;
				} catch {}

				if (txHash === "") return;

				const { error, isChangeAddress, addressIndex } = await getInfoFromAddressPath(tx.path);
				try {
					if (isChangeAddress && error === false && lastUsedChangeAddress <= addressIndex) lastUsedChangeAddress = addressIndex;
					if (!isChangeAddress && error === false && lastUsedAddress <= addressIndex) lastUsedAddress = addressIndex;
				} catch {}

				let decodedTransaction = { error: true, inputs: [], outputs: [], format: "" };
				try {
					decodedTransaction = await electrum.getTransaction({
						id: Math.random(),
						txHash,
						coin: selectedCrypto
					});
					if (decodedTransaction.error === false && decodedTransaction.data.hash !== undefined) {
						decodedTransaction = decodedTransaction.data;
					}
				} catch {}

				//Capture timestamp from decodedTransaction response.
				let timestamp = moment().unix();
				try {
					timestamp = decodedTransaction.blocktime;
				} catch {}

				//Get type and amount
				let type = "sent";
				let outputAmount = 0;
				let transactionOutputAmount = 0;
				let inputAmount = 0;
				let transactionInputAmount = 0;
				let receivedAmount = 0;
				let sentAmount = 0;
				let amount = 0;
				let fee = 0;
				let messages = []; //OP_RETURN Messages

				let inputAddressMatch = false;
				let outputAddressMatch = false;

				try {
					//Iterate over all inputs
					await Promise.all(decodedTransaction.vin.map(async (decodedInput) => {
						let isInputMatch = false;
						try {
							//Push any OP_RETURN messages to messages array
							try {
								const asm = decodedInput.scriptSig.asm;
								if (asm !== "" && asm.includes("OP_RETURN")) {
									const OpReturnMessages = decodeOpReturnMessage(asm);
									messages = messages.concat(OpReturnMessages);
								}
							} catch {}
							//This dictates the index to use for this input's previous output in order to calculate it's amount.
							const n = decodedInput.vout;
							//Get the txHex of the current inputs txid
							let inputDecodedTransaction = await electrum.getTransaction({
								id: Math.random(),
								txHash: decodedInput.txid,
								coin: selectedCrypto
							});
							if (inputDecodedTransaction.error) return;
							inputDecodedTransaction = inputDecodedTransaction.data;

							//Add up the previously specified output (inputDecodedTransaction.outputs) based on the index (n) of the decoded input and add it to inputAmount
							let nIndexIsUndefined = false;
							let vout;
							try {
								vout = inputDecodedTransaction.vout[n];
							} catch {
								nIndexIsUndefined = true;
							}
							try {
								if (!("value" in vout)) nIndexIsUndefined = true;
							} catch {
								nIndexIsUndefined = true;
							}

							if (nIndexIsUndefined) return;

							//Ensure that none of the input addresses came from this wallet.
							try {
								if (vout.scriptPubKey.addresses.includes(tx.address)) {
									isInputMatch = true;
									inputAddressMatch = true;
								}
							} catch {}
							if (!inputAddressMatch) {
								await Promise.all(combinedAddresses.map(({ address }) => {
									try {
										if (vout.scriptPubKey.addresses.includes(address)) {
											isInputMatch = true;
											inputAddressMatch = true;
										}
									} catch {}
								}));
							}
							
							try {
								if (isInputMatch) inputAmount = Number((inputAmount + Number(vout.value)).toFixed(8));
								transactionInputAmount = Number((transactionInputAmount + Number(vout.value)).toFixed(8));
							} catch {}
						} catch {}
					}));
					
					//Iterate over each output and add it's satoshi value to outputAmount
					await Promise.all(decodedTransaction.vout.map(async (output) => {
						try {
							let isOutputMatch = false;
							//Push any OP_RETURN messages to messages array
							try {
								const asm = output.scriptPubKey.asm;
								if (asm !== "" && asm.includes("OP_RETURN")) {
									const OpReturnMessages = decodeOpReturnMessage(asm);
									messages = messages.concat(OpReturnMessages);
								}
							} catch (e) {}
							//If an address from this wallet has already matched a previous input we have sent this transaction
							let nIndexIsUndefined = false;
							try {
								await Promise.all(combinedAddresses.map(({ address }) => {
									if (output.scriptPubKey.addresses.includes(address)) {
										isOutputMatch = true;
										outputAddressMatch = true;
									}
								}));
								
							} catch {
								nIndexIsUndefined = true;
							}
							if (nIndexIsUndefined) return;

							try {
								if (isOutputMatch) {
									outputAmount = Number((outputAmount + Number(output.value)).toFixed(8));
								}
								transactionOutputAmount = Number((transactionOutputAmount + Number(output.value)).toFixed(8));
							} catch {}
						} catch {}
					}));

				} catch {}
				try {
					inputAmount = bitcoinUnits(inputAmount, "BTC").to("satoshi").value();
					transactionInputAmount = bitcoinUnits(transactionInputAmount, "BTC").to("satoshi").value();
					receivedAmount = bitcoinUnits(receivedAmount, "BTC").to("satoshi").value();
					outputAmount = bitcoinUnits(outputAmount, "BTC").to("satoshi").value();
					transactionOutputAmount = bitcoinUnits(transactionOutputAmount, "BTC").to("satoshi").value();
					sentAmount = bitcoinUnits(sentAmount, "BTC").to("satoshi").value();
					fee = transactionInputAmount - transactionOutputAmount;
				} catch {}
				inputAmount = Number(inputAmount);
				transactionInputAmount = Number(transactionInputAmount);
				outputAmount = Number(outputAmount);
				transactionOutputAmount = Number(transactionOutputAmount);
				fee = Number(fee);
				type = inputAmount > outputAmount ? "sent" : "received";
				const totalAmount = Math.abs(inputAmount - outputAmount);
				if (type === "sent") {
					sentAmount = totalAmount; //What the total tx cost
					amount = totalAmount - fee; //What the receiver acquired
				} else {
					receivedAmount = totalAmount;
					amount = totalAmount;
				}
				
				if (inputAddressMatch && outputAddressMatch && transactionOutputAmount === outputAmount) {
					type = "sent";
					amount = 0;
					sentAmount = fee;
				}
				if (inputAddressMatch && outputAddressMatch && inputAmount-fee === outputAmount) {
					type = "sent";
					amount = 0;
					sentAmount = fee;
				}

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
					transactionInputAmount,
					transactionOutputAmount,
					fee,
					sentAmount,
					receivedAmount,
					messages
				};
				transactions.push(transaction);
			} catch {}
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
		const allUtxos = await electrum.listUnspentAddressScriptHashes({
			addresses: allAddresses,
			coin: selectedCrypto
		});

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

const fallbackBroadcastTransaction = async ({ rawTx = "", selectedCrypto = "bitcoin" } = {}) => {
	const { fetchData } = require("./helpers");
	try {
		let config = {
			method: "POST",
			headers: {
				"Content-Type": "text/plain"
			},
			body: rawTx
		};
		let response = "";
		switch (selectedCrypto) {
			case "bitcoin":
				response = await fetch(`https://blockstream.info/api/tx`, config);
				response = await response.text();
				if (response.includes("error")) response = "";
				break;
			case "bitcoinTestnet":
				response = await fetch(`https://blockstream.info/testnet/api/tx`, config);
				response = await response.text();
				if (response.includes("error")) response = "";
				break;
			case "litecoin":
				response = await fetch(`https://chain.so/api/v2/send_tx/ltc`, fetchData("POST", { tx_hex: rawTx }));
				response = await response.json();
				response = response.status === "success" ? response.data.txid : "";
				break;
			case "litecoinTestnet":
				response = await fetch(`https://chain.so/api/v2/send_tx/ltctest`, fetchData("POST", { tx_hex: rawTx }));
				response = await response.json();
				response = response.status === "success" ? response.data.txid : "";
				break;
		}
		if (response !== "") return { error: false, data: response };
		return { error: true, data: "" };
	} catch (e) {
		console.log(e);
		return ({ error: true, data: e });
	}
};

const walletHelpers = {
	utxos: {
		electrum: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
			const utxos = await electrumUtxoHelper({ addresses, changeAddresses, currentBlockHeight, selectedCrypto });
			if (utxos.error === false) {
				return ({ error: false, data: utxos.data });
			} else {
				return utxos;
			}
		},
		default: async ({ addresses = [], changeAddresses = [], currentBlockHeight = 0, service = "electrum", selectedCrypto = "bitcoin" } = {}) => {
			return await walletHelpers.utxos[service]({
				addresses,
				changeAddresses,
				currentBlockHeight,
				selectedCrypto
			});
		}
	},
	getBlockHeight: {
		electrum: async ({ selectedCrypto = "bitcoin" } = {}) => {
			try {
				const response = await electrum.getNewBlockHeadersSubscribe({
					id: Math.random(),
					coin: selectedCrypto
				});
				if (response.error === false) {
					let blockHeight = 0;
					try {
						blockHeight = response.data;
					} catch (e) {}
					//Ensure the block height is defined and its value is greater than 1.
					if (blockHeight !== undefined && blockHeight > 1) return { error: false, data: blockHeight };
				}
				return response ;
			} catch (e) {
				return { error: true, data: e };
			}
		},
		default: async ({ service = "electrum", selectedCrypto = "bitcoin" } = {}) => {
			return await walletHelpers.getBlockHeight[service]({ selectedCrypto });
		}
	},
	history: {
		electrum: async ({ allAddresses = [], addresses = [], changeAddresses = [], selectedCrypto = "bitcoin" } = {}) => {
			try {
				const transactions = await electrumHistoryHelper({
					allAddresses,
					addresses,
					changeAddresses,
					selectedCrypto
				});
				if (transactions.error === true) return { error: true, data: [] };
				return transactions;
			} catch (e) {
				return { error: true, data: e };
			}
		},
		default: async ({ allAddresses = [], addresses = [], changeAddresses = [], service = "electrum", selectedCrypto = "bitcoin" } = {}) => {
			return await walletHelpers.history[service]({ allAddresses, addresses, changeAddresses, selectedCrypto });
		}
	},
	pushtx: {
		electrum: async ({ rawTx = "", selectedCrypto = "bitcoin" } = {}) => {
			return await electrum.broadcastTransaction({ id: 1, rawTx, coin: selectedCrypto });

		},
		fallback: async ({ rawTx = "", selectedCrypto = "bitcoin" } = {}) => {
			return await fallbackBroadcastTransaction({ rawTx, selectedCrypto });
		},
		default: async ({ rawTx = "", service = "electrum", selectedCrypto = "bitcoin" } = {}) => {
			return await walletHelpers.pushtx[service]({ rawTx, selectedCrypto });
		}
	},
	exchangeRate: {
		coingecko: async ({ selectedCurrency = "usd", selectedCrypto = "bitcoin" } = {}) => {
			const exchangeRate = await coinGeckoExchangeRateHelper({ selectedCrypto, selectedCurrency });
			if (exchangeRate.error === false) {
				return ({ error: false, data: exchangeRate.data });
			} else {
				return ({ error: true, data: "Invalid Exchange Rate Data." });
			}
		},
		coincap: async ({ selectedCurrency = "usd", selectedCrypto = "bitcoin" } = {}) => {
			const exchangeRate = await coinCapExchangeRateHelper({ selectedCrypto, selectedCurrency });
			if (exchangeRate.error === false) {
				return ({ error: false, data: exchangeRate.data });
			} else {
				return ({ error: true, data: "Invalid Exchange Rate Data." });
			}
		},
		default: async ({ service = "coingecko", selectedCurrency = "usd", selectedCrypto = "bitcoin" } = {}) => {
			selectedCrypto = selectedCrypto.toLowerCase();
			selectedCrypto = selectedCrypto.replace("testnet", "");
			return await walletHelpers.exchangeRate[service]({ selectedCurrency, selectedCrypto });
		}
	},
	feeEstimate: {
		electrum: async ({ selectedCrypto = "bitcoin", blocksWillingToWait = 8 } = {}) => {
			return await electrum.getFeeEstimate({ coin: selectedCrypto, blocksWillingToWait });

		},
		default: async ({ service = "electrum", selectedCrypto = "bitcoin", blocksWillingToWait = 8 } = {}) => {
			return await walletHelpers.feeEstimate[service]({ selectedCrypto, blocksWillingToWait });
		}
	}
};

module.exports = {
	walletHelpers
};
