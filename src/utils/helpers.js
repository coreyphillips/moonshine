import {
	Linking,
	Vibration
} from "react-native";
import AsyncStorage from "@react-native-community/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Keychain from "react-native-keychain";
import "../../shim";
import { randomBytes } from "react-native-randombytes";
import bitcoinUnits from "bitcoin-units";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const {
	walletHelpers
} = require("./walletApi");
const bitcoin = require("bitcoinjs-lib");
const bitcoinMessage = require("bitcoinjs-message");
const bip39 = require("bip39");
const bip32 = require("bip32");
const moment = require("moment");
const bip21 = require("bip21");
const Url = require("url-parse");
const {
	networks,
	availableCoins,
	supportsRbf,
	defaultWalletShape
} = require("../utils/networks");
const {
	getTransaction
} = require("../utils/electrum");

export const setItem = async (key, value) => {
	try {
		await AsyncStorage.setItem(key, value);
		return({ error: false });
	} catch (e) {
		console.log(e);
		return({ error: true, data: e });
	}
};

export const getItem = (key) => {
	return new Promise(async (resolve) => {
		try {
			const result = await AsyncStorage.getItem(key);
			if (result !== null || result !== "") {
				resolve({error: false, data: result});
			} else {
				resolve({error: false, data: ""});
			}
		} catch (e) {
			resolve({error: true, data: e});
		}
	});
};

const setKeychainValue = async ({ key = "", value = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			// Set the credentials (username, password, service)
			const result = await Keychain.setGenericPassword(key, value, { service: key });
			resolve({ error: false, data: result });
		} catch (e) {
			resolve({ error: true, data: e });
			console.log(e);
		}
	});
};

const getKeychainValue = async ({ key = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const result = await Keychain.getGenericPassword({ service: key });
			resolve({ error: false, data: result });
		} catch (e) {
			resolve({ error: true, data: e });
			console.log(e);
		}
	});
};

//WARNING: This will wipe the specified key from storage
const resetKeychainValue = async ({ key = "" } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const result = await Keychain.resetGenericPassword(key);
			resolve({ error: false, data: result });
		} catch (e) {
			resolve({ error: true, data: e });
			console.log(e);
		}
	});
};

/*
This batch sends addresses and returns the balance of utxos from them
 */
const getBalanceFromUtxos = ({ addresses = [], changeAddresses = [] } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const result = await walletHelpers.utxos.bitcoin.default({ addresses, changeAddresses });
			resolve({ error: false, data: { utxos: result.utxos, balance: result.balance } });
		} catch (e) {
			console.log(e);
			resolve({ error: false, data: [] });
		}
	});
};

//Returns: { error: bool, isPrivateKey: bool, network: Object }
const validatePrivateKey = (privateKey = "") => {
	try {
		let verified = false;
		let network = "";
		for (let key in networks) {
			if (verified === true) return;
			try {
				bitcoin.ECPair.fromWIF(privateKey, networks[key]);
				verified = true;
				network = key;
				break;
			} catch(e) {
				verified = false;
			}
		}
		return { error: false, isPrivateKey: verified, network };
	} catch (e) {
		console.log(e);
		return false;
	}
};

const validateAddress = (address = "", selectedCrypto = "") => {
	try {
		//Validate address for a specific network
		if (selectedCrypto !== "") {
			const network = getCoinNetwork(selectedCrypto);
			bitcoin.address.toOutputScript(address, network);
		} else {
			//Validate address for all available networks
			let isValid = false;
			let coin = bitcoin;
			for (let i = 0; i < availableCoins.length; i++) {
				if (validateAddress(address, availableCoins[i]).isValid) {
					isValid = true;
					coin = availableCoins[i];
					break;
				}
			}
			return { isValid, coin  };
		}
		return { isValid: true, coin: selectedCrypto  };
	} catch (e) {
		return { isValid: false, coin: selectedCrypto  };
	}
};


const parsePaymentRequest = (data = "") => {
	return new Promise(async (resolve) => {
		const failure = (errorMsg = "Unable To Read The QR Code.") => {
			resolve({ error: true, data: errorMsg });
		};
		try {
			//Determine how to handle the data
			if (data) {
				let validateAddressResult = validateAddress(data);
				//If is a string and Bitcoin Address
				if (validateAddressResult.isValid && typeof data === "string" && !data.includes(":" || "?" || "&" || "//")) {
					resolve({ error: false, data: { address: data, coin: validateAddressResult.coin, amount: "", label: "" } });
					return;
				}

				//Determine if we need to parse the data.
				if (data.includes(":" || "?" || "&" || "//")) {
					try {
						//Remove slashes
						if (data.includes("//")) data = data.replace("//", "");
						//bip21.decode will throw if anything other than "bitcoin" is passed to it.
						//Replace any instance of "testnet" or "litecoin" with "bitcoin"
						if (data.includes(":")) {
							data = data.substring(data.indexOf(":") + 1);
							data = `bitcoin:${data}`;
						}
						const result = bip21.decode(data);
						const address = result.address;
						validateAddressResult = validateAddress(address);
						//Ensure address is valid
						if (!validateAddressResult.isValid) {
							failure(data);
							return;
						}
						let amount = "";
						let message = "";
						try {amount = result.options.amount || "";} catch (e) {}
						try {message = result.options.message || "";} catch (e) {}
						resolve({ error: false, data: { address, coin: validateAddressResult.coin, amount, message, label: message } });
					} catch (e) {
						console.log(e);
						failure(data);
					}
				} else {
					failure(data);
				}

			} else {
				failure();
			}
		} catch (e) {
			console.log(e);
			failure();
		}
	});
};

const getDifferenceBetweenDates = ({start = "", end = "", time = "minutes"} = {}) => {
	try {
		if (!moment.isMoment(start)) start = moment(start);
		if (!moment.isMoment(end)) end = moment(end);
		if (start.isValid() && end.isValid) {
			return end.diff(start, time);
		}
		return 0;
	} catch (e) {
		console.log(e);
		return 0;
	}
};

//Retrived from : https://github.com/bitcoinjs/bitcoinjs-lib/issues/1238
/*
const convert_zpub_to_xpub = (z) => {
	let data = b58.decode(z);
	data = data.slice(4);
	data = Buffer.concat([Buffer.from("0488b21e","hex"), data]);
	return b58.encode(data);
};
*/

const getTransactionData = ({ txId = "", selectedCrypto = "bitcoin" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (data = "") => {
			resolve({error: true, data});
		};
		try {
			const network = getNetworkType(selectedCrypto);
			const url = network === "mainnet" ? `https://api.blockcypher.com/v1/btc/main/txs/${txId}` : `https://api.blockcypher.com/v1/btc/test3/txs/${txId}`;
			const response = await fetch(url);
			const jsonResponse = await response.json();
			try {
				if (jsonResponse.error) {
					failure("No transaction data found.");
					return;
				}
			} catch (e) {}
			resolve({ error: false, data: jsonResponse });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const getExchangeRate = ({ selectedCrypto = "bitcoin", selectedCurrency = "usd", selectedService = "coingecko" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (errorTitle = "", errorMsg = "") => {
			resolve({ error: true, errorTitle, errorMsg });
		};

		const isConnected = await isOnline();
		if (!isConnected) {
			failure("Offline");
			return;
		}

		let exchangeRate = 0;
		try {
			exchangeRate = await walletHelpers.exchangeRate.default({ service: selectedService, selectedCurrency, selectedCrypto });
			if (exchangeRate.error) failure("Invalid Exchange Rate Data");
			resolve({ error: false, data: exchangeRate.data });
		} catch (e) {
			console.log(e);
			failure();
		}
	});
};

const getAddressTransactions = async ({ address = "", addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (data = "") => {
			resolve({ error: true, data });
		};

		const isConnected = await Promise.all(isOnline());
		if (!isConnected || isConnected === false) {
			failure("Offline");
			return;
		}

		try {
			const response = await walletHelpers.history.default({ address, addresses, changeAddresses, currentBlockHeight, selectedCrypto });
			if (response.error === true) {
				failure("No transaction data found.");
				//failure(response);
				return;
			}
			const transactions = response.data;
			resolve({ error: false, data: transactions });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const getAllTransactions = async ({ allAddresses = [], addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (data = "") => {
			resolve({ error: true, data });
		};

		const isConnected = await isOnline();
		if (!isConnected || isConnected === false) {
			failure("Offline");
			return;
		}

		try {
			const response = await walletHelpers.history.default({ allAddresses, addresses, changeAddresses, currentBlockHeight, selectedCrypto });
			if (response.error === true) {
				failure("No transaction data found.");
				//failure(response);
				return;
			}
			resolve(response);
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const isOnline = async () => {
	try {
		const connectionInfo = await NetInfo.fetch();
		return connectionInfo.isConnected;
	} catch {return false;}
};

//Remove any duplicates based off of matches from the provided value
const removeDupsFromArrOfObj = (arr = [], value = "") => {
	try {
		return arr.reduce((x, y) => x.findIndex(e=>e[value]===y[value])<0 ? [...x, y]: x, []);
	} catch (e) {
		console.log(e);
		return arr;
	}
};

//This returns either "mainnet" or "testnet" and assumes the following selectedCrypto format "coinTestnet"
const getNetworkType = (selectedCrypto = "bitcoin") => {
	try {
		selectedCrypto = selectedCrypto.toLowerCase();
		const isTestnet = selectedCrypto.includes("testnet");
		return isTestnet ? "testnet" : "mainnet";
	} catch (e) {
		return "testnet";
	}
};

const getTransactionSize = (numInputs, numOutputs) => {
	return numInputs*180 + numOutputs*34 + 10 + numInputs;
};

const setReplaceByFee = ({ psbt = {}, setRbf = true } = {}) => {
	try {
		const defaultSequence = bitcoin.Transaction.DEFAULT_SEQUENCE;
		//Cannot set replace-by-fee on transaction without inputs.
		const ins = psbt.data.globalMap.unsignedTx.tx.ins;
		if (ins.length !== 0) {
			ins.forEach(x => {
				if (setRbf) {
					if (x.sequence >= defaultSequence - 1) {
						x.sequence = 0;
					}
				} else {
					if (x.sequence < defaultSequence - 1) {
						x.sequence = defaultSequence;
					}
				}
			});
		}
	} catch (e) {}
};

//amount = Amount to send to recipient.
//transactionFee = fee per byte.
const createTransaction = ({ address = "", transactionFee = 2, amount = 0, confirmedBalance = 0, utxos = [], blacklistedUtxos = [], changeAddress = "", wallet = "wallet0", selectedCrypto = "bitcoin", message = "", addressType = "bech32", setRbf = true } = {}) => {
	return new Promise(async (resolve) => {
		try {
			const network = networks[selectedCrypto];
			const rbfIsSupported = supportsRbf[selectedCrypto]; //Ensure the selected coin is not Litecoin.
			const totalFee = getByteCount({[addressType]:utxos.length},{[addressType]:changeAddress ? 2 : 1}, message) * transactionFee;
			addressType = addressType.toLowerCase();

			let targets = [{ address, value: amount }];
			//Change address and amount to send back to wallet.
			if (changeAddress) targets.push({ address: changeAddress, value: confirmedBalance - (amount + totalFee) });

			//Embed any OP_RETURN messages.
			if (message !== "") {
				const messageLength = message.length;
				const lengthMin = 5;
				//This is a patch for the following: https://github.com/coreyphillips/moonshine/issues/52
				if (messageLength > 0 && messageLength < lengthMin) message += " ".repeat(lengthMin- messageLength);
				const data = Buffer.from(message, "utf8");
				const embed = bitcoin.payments.embed({data: [data], network});
				targets.push({ script: embed.output, value: 0 });
			}

			//Setup rbfData (Replace-By-Fee Data) for later use.
			let rbfData = undefined;
			if (rbfIsSupported) rbfData = { address, transactionFee, amount, confirmedBalance, utxos, blacklistedUtxos, changeAddress, wallet, selectedCrypto, message, addressType };

			//Fetch Keypair
			const keychainResult = await getKeychainValue({ key: wallet });
			if (keychainResult.error === true) return;

			//Attempt to acquire the bip39Passphrase if available
			let bip39Passphrase = "";
			try {
				const key = `${wallet}passphrase`;
				const bip39PassphraseResult = await getKeychainValue({ key });
				if (bip39PassphraseResult.error === false && bip39PassphraseResult.data.password) bip39Passphrase = bip39PassphraseResult.data.password;
			} catch (e) {}

			const mnemonic = keychainResult.data.password;
			const seed = bip39.mnemonicToSeedSync(mnemonic, bip39Passphrase);
			const root = bip32.fromSeed(seed, network);
			const psbt = new bitcoin.Psbt({ network });

			//Add Inputs
			const utxosLength = utxos.length;
			for (let i = 0; i < utxosLength; i++) {
				try {
					const utxo = utxos[i];
					if (blacklistedUtxos.includes(utxo.tx_hash)) continue;
					const path = utxo.path;
					const keyPair = root.derivePath(path);

					if (addressType === "bech32") {
						const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
						psbt.addInput({
							hash: utxo.txid,
							index: utxo.vout,
							witnessUtxo: {
								script: p2wpkh.output,
								value: utxo.value,
							}
						});
					}

					if (addressType === "segwit") {
						const p2wpkh =  bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
						const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
						psbt.addInput({
							hash: utxo.txid,
							index: utxo.vout,
							witnessUtxo: {
								script: p2sh.output,
								value: utxo.value,
							},
							redeemScript: p2sh.redeem.output
						});
					}

					if (addressType === "legacy") {
						const transaction = await getTransaction({ txHash: utxo.txid, coin: selectedCrypto });
						const nonWitnessUtxo = Buffer.from(transaction.data.hex, "hex");
						psbt.addInput({
							hash: utxo.txid,
							index: utxo.vout,
							nonWitnessUtxo
						});
					}
				} catch (e) {
					console.log(e);
				}
			}

			//Set RBF if supported and prompted via rbf in Settings.
			try { if (rbfIsSupported && setRbf) setReplaceByFee({ psbt, setRbf }); } catch (e) {}

			//Shuffle and add outputs.
			try {targets = shuffleArray(targets);} catch (e) {}
			await Promise.all(
				targets.map((target) => {
					//Check if OP_RETURN
					let isOpReturn = false;
					try {isOpReturn = !!target.script;} catch (e) {}
					if (isOpReturn) {
						psbt.addOutput({
							script: target.script,
							value: target.value,
						});
					} else {
						psbt.addOutput({
							address: target.address,
							value: target.value,
						});
					}
				})
			);

			//Loop through and sign
			let index = 0;
			for (let i = 0; i < utxosLength; i++) {
				try {
					const utxo = utxos[i];
					if (blacklistedUtxos.includes(utxo.tx_hash)) continue;
					const path = utxo.path;
					const keyPair = root.derivePath(path);
					psbt.signInput(index, keyPair);
					index++;
				} catch (e) {
					console.log(e);
				}
			}
			psbt.finalizeAllInputs();
			const rawTx = psbt.extractTransaction().toHex();
			const data = { error: false, data: rawTx };
			if (rbfIsSupported && setRbf && rbfData) data["rbfData"] = rbfData;
			resolve(data);
		} catch (e) {
			console.log(e);
			resolve({ error: true, data: e });
		}
	});
};

const fetchData = (type, params) => {
	switch (type.toLowerCase()) {
		case "post":
			return {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...params
				})
			};
		default:
			return {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				}
			};
	}
};

const getCoinNetwork = (coin = "") => {
	return networks[coin];
};

const generateAddresses = async ({ addressAmount = 0, changeAddressAmount = 0, wallet = "wallet0", addressIndex = 0, changeAddressIndex = 0, selectedCrypto = "bitcoin", keyDerivationPath = "84", addressType = "bech32" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			const coinTypePath = defaultWalletShape.coinTypePath[selectedCrypto];
			const network = networks[selectedCrypto]; //Returns the network object based on the selected crypto.
			const keychainResult = await getKeychainValue({ key: wallet });
			addressType = addressType.toLowerCase();
			if (keychainResult.error === true) return;

			//Attempt to acquire the bip39Passphrase if available
			let bip39Passphrase = "";
			try {
				const key = `${wallet}passphrase`;
				const bip39PassphraseResult = await getKeychainValue({ key });
				if (bip39PassphraseResult.error === false && bip39PassphraseResult.data.password) bip39Passphrase = bip39PassphraseResult.data.password;
			} catch (e) {}

			const mnemonic = keychainResult.data.password;
			const seed = bip39.mnemonicToSeedSync(mnemonic, bip39Passphrase);
			const root = bip32.fromSeed(seed, network);
			let addresses = [];
			let changeAddresses = [];

			//Generate Addresses
			let addressArray = new Array(addressAmount).fill(null);
			let changeAddressArray = new Array(changeAddressAmount).fill(null);
			await Promise.all(
				addressArray.map(async (item, i) => {
					try {
						const addressPath = `m/${keyDerivationPath}'/${coinTypePath}'/0'/0/${i + addressIndex}`;
						const addressKeypair = root.derivePath(addressPath);
						const address = await getAddress(addressKeypair, network, addressType);
						const scriptHash = getScriptHash(address, network);
						addresses.push({ address, path: addressPath, scriptHash });
						return {address, path: addressPath, scriptHash};
					} catch (e) {}
				}),
				changeAddressArray.map(async (item, i) => {
					try {
						const changeAddressPath = `m/${keyDerivationPath}'/${coinTypePath}'/0'/1/${i + changeAddressIndex}`;
						const changeAddressKeypair = root.derivePath(changeAddressPath);
						const address = await getAddress(changeAddressKeypair, network, addressType);
						const scriptHash = getScriptHash(address, network);
						changeAddresses.push({ address, path: changeAddressPath, scriptHash });
						return {address, path: changeAddressPath, scriptHash};
					} catch (e) {}
				})
			);
			resolve({ error: false, data: { addresses, changeAddresses } });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const getAddress = (keyPair, network, type = "bech32") => {
	try {
		if (typeof network === "string" && network in networks) network = networks[network];
		switch (type) {
			case "bech32":
				//Get Native Bech32 (bc1) addresses
				return bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address;
			case "segwit":
				//Get Segwit P2SH Address (3)
				return bitcoin.payments.p2sh({
					redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }),
					network
				}).address;
			//Get Legacy Address (1)
			case "legacy":
				return bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address;
		}
	} catch { return ""; }
};

//Used to validate price inputs.
//Removes multiple decimal places and only allows for 2 chars after a decimal place.
export const parseFiat = (text) => {
	function removeDecimals( str ) {
		return str.replace( /^([^.]*\.)(.*)$/, function ( a, b, c ) {
			return b + c.replace( /\./g, '' );
		});
	}
	try {
		text = text.toString();
		text = removeDecimals(text);
		const decimalIndex = text.indexOf(".");
		if (decimalIndex !== -1) {
			text = text.substr(0, decimalIndex + 3);
		}
		text = text.replace(/[^\d\.]/g,'');
		return text;
	} catch (e) {
		console.log(e);
	}
};

const capitalize = (str = "") => {
	try {
		//Add a space before any non-consecutive capital letter
		str = str.replace(/([A-Z]+)/g, ' $1').trim();
		//Capitalize the first letter of the final string
		return str.charAt(0).toUpperCase() + str.slice(1);
	} catch (e) {
		return str;
	}
};

const openUrl = (url = "") => {
	try {
		Linking.canOpenURL(url).then(supported => {
			if (!supported) {
				console.log('Can\'t handle url: ' + url);
			} else {
				return Linking.openURL(url);
			}
		}).catch(err => console.error('An error occurred', err));
	} catch (e) {
		console.log(e);
	}
};

const openTxId = (txid = "", selectedCrypto = ""): void => {
	if (!txid || !selectedCrypto) return;
	let url = "";
	if (selectedCrypto === "bitcoin") url = `https://blockstream.info/tx/${txid}`;
	if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/tx/${txid}`;
	if (selectedCrypto === "litecoin") url = `https://chain.so/tx/LTC/${txid}`;
	if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/tx/LTCTEST/${txid}`;
	openUrl(url);
};

const pauseExecution = async (duration = 500) => {
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

const vibrate = (type = "impactHeavy") => {
	try {
		if (type === "default") {
			Vibration.vibrate(1000);
			return;
		}
		const options = {
			enableVibrateFallback: true,
			ignoreAndroidSystemSettings: false
		};
		ReactNativeHapticFeedback.trigger(type, options);
	} catch (e) {
		console.log(e);
	}
};

const shuffleArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

//Get the nth pattern in a string.
const nthIndex = (str, pat, n) => {
	let L= str.length, i= -1;
	while(n-- && i++<L){
		i= str.indexOf(pat, i);
		if (i < 0) break;
	}
	return i;
};

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

//Solution located here: https://stackoverflow.com/questions/3753483/javascript-thousand-separator-string-format/19840881
//This inserts commas appropriately in a number and does not insert commas after a decimal.
const formatNumber = (num) => {
	const n = String(num),
		p = n.indexOf('.');
	return n.replace(
		/\d(?=(?:\d{3})+(?:\.|$))/g,
		(m, i) => p < 0 || i < p ? `${m},` : m
	);
};

const removeDecimals = (str) => {
	return str.replace( /^([^.]*\.)(.*)$/, function ( a, b, c ) {
		return b + c.replace( /\./g, '' );
	});
};

const removeAllButFirstInstanceOfPeriod = (s) => {
	try {
		if (s.length >= 2 && s.charAt(0) === "0" && s.charAt(1) !== ".") {
			while (s.charAt(0) === "0" && s.charAt(1) !== ".") {
				s = s.substr(1);
			}
		}
		if (s.charAt(0) === "." && s.length === 1) s = "0.";
		s = removeDecimals(s);
		const decimalIndex = s.includes(".");
		if (decimalIndex) {
			s = s.substr(0, decimalIndex + 9);
		}
		s = s.replace(/[^\d\.]/g,'');
		//Remove Leading Zeroes
		s = s.replace(/^00+/g, "0");
		return s;
	} catch (e) {
		console.log(e);
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

const signMessage = async ({ message = "", addressType = "bech32", path = "m/84'/0'/0'/0/0", selectedWallet = "wallet0", selectedCrypto = "bitcoin" } = {}) => {
	try {
		if (message === "") return { error: true, data: "No message to sign." };
		const network = networks[selectedCrypto];
		const messagePrefix = network.messagePrefix;

		//Fetch Keypair
		const keychainResult = await getKeychainValue({ key: selectedWallet });
		if (keychainResult.error === true) return;

		//Attempt to acquire the bip39Passphrase if available
		let bip39Passphrase = "";
		try {
			const key = `${selectedWallet}passphrase`;
			const bip39PassphraseResult = await getKeychainValue({ key });
			if (bip39PassphraseResult.error === false && bip39PassphraseResult.data.password) bip39Passphrase = bip39PassphraseResult.data.password;
		} catch (e) {}

		const mnemonic = keychainResult.data.password;
		const seed = bip39.mnemonicToSeedSync(mnemonic, bip39Passphrase);
		const root = bip32.fromSeed(seed, network);
		const keyPair = root.derivePath(path);
		const privateKey = keyPair.privateKey;

		let sigOptions = { extraEntropy: randomBytes(32) };
		if (addressType === "bech32") sigOptions["segwitType"] = "p2wpkh" ;
		if (addressType === "segwit") sigOptions["segwitType"] = "p2sh(p2wpkh)" ;

		let signature = "";
		if (addressType === "legacy") {
			signature = bitcoinMessage.signElectrum(message, privateKey, keyPair, messagePrefix);
		} else {
			signature = bitcoinMessage.signElectrum(message, privateKey, keyPair.compressed, messagePrefix, sigOptions);
		}
		signature = signature.toString("base64");

		const address = await getAddress(keyPair, network, addressType);
		const isVerified = verifyMessage({ message, address, signature, selectedCrypto });
		if (isVerified === true) return { error: false, data: { address, message, signature } };
		return { error: true, data: "Unable to verify signature." };
	} catch (e) {
		return { error: true, data: e };
	}
};

const verifyMessage = ({ message = "", address = "", signature = "", selectedCrypto = "" } = {}) => {
	try {
		const network = networks[selectedCrypto];
		const messagePrefix = network.messagePrefix;
		let isValid = false;
		try { isValid = bitcoinMessage.verify(message, address, signature, messagePrefix); } catch (e) {}
		//This is a fix for https://github.com/bitcoinjs/bitcoinjs-message/issues/20
		if (!isValid)  isValid = bitcoinMessage.verifyElectrum(message, address, signature, messagePrefix);
		return isValid;
	} catch (e) {
		console.log(e);
		return false;
	}
};

const getBaseDerivationPath = ({ keyDerivationPath = "84", selectedCrypto = "bitcoin" }) => {
	try {
		const networkValue = defaultWalletShape.coinTypePath[selectedCrypto];
		return `m/${keyDerivationPath}'/${networkValue}'/0'/0/0`;
	} catch (e) {
		return { error: true, data: e };
	}
};

const decodeURLParams = (url) => {
	const hashes = url.slice(url.indexOf("?") + 1).split("&");
	return hashes.reduce((params, hash) => {
		const split = hash.indexOf("=");
		if (split < 0) return Object.assign(params, {[hash]: null});
		const key = hash.slice(0, split);
		const val = hash.slice(split + 1);
		return Object.assign(params, { [key]: decodeURIComponent(val) });
	}, {});
};

const loginWithBitid = async ({ url = "", addressType = "bech32", keyDerivationPath, selectedCrypto, selectedWallet } ={}) => {
	try {
		//Get the base derivation path based on the current derivation path key.
		const path = getBaseDerivationPath({ keyDerivationPath, selectedCrypto });
		//Sign the message
		const signMessageResponse = await signMessage(
			{
				message: url,
				addressType,
				path,
				selectedWallet,
				selectedCrypto
			});
		//Check for signing error
		if (signMessageResponse.error) return { error: true, data: signMessageResponse.data };
		const { address, signature } = signMessageResponse.data;
		const parsedURL = new Url(url);
		const response = await fetch(`https://${parsedURL.hostname}${parsedURL.pathname}`, fetchData("POST", {uri: url, address, signature}));
		const responseJson = await response.json();
		return { error: false, data: responseJson };
	} catch (e) {
		console.log(e);
		return { error: true, data: e };
	}
};

const sortArrOfObjByKey = (arr = [], key = "", ascending = true) => {
	try {
		if (ascending) return arr.sort((a,b) => (a[key] - b[key]));
		return arr.sort((a,b) => (b[key] - a[key]));
	} catch (e) {return arr;}
};

const getFiatBalance = ({ balance = 0, exchangeRate = 0 } = {}) => {
	try {
		bitcoinUnits.setFiat("usd", exchangeRate);
		const fiatBalance = bitcoinUnits(balance, "satoshi").to("usd").value().toFixed(2);
		if (isNaN(fiatBalance)) return 0;
		return Number(fiatBalance);
	} catch (e) {
		return 0;
	}
};

const cryptoToFiat = ({ amount = 0, exchangeRate = 0 } = {}) => {
	try {
		amount = Number(amount);
		bitcoinUnits.setFiat("usd", exchangeRate);
		return bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
	} catch(e) {
		console.log(e);
	}
};

const satsToBtc = ({amount = 0 } = {}) => {
	try {
		amount = Number(amount);
		return bitcoinUnits(amount, "satoshi").to("BTC").value();
	} catch (e) {return amount;}
};

const fiatToCrypto = ({ amount = 0, exchangeRate = 0 } = {}) => {
	try {
		amount = Number(amount);
		bitcoinUnits.setFiat("usd", exchangeRate);
		return bitcoinUnits(amount, "usd").to("satoshi").value().toFixed(0);
	} catch (e) {
		console.log(e);
	}
};

const getLastWordInString = (phrase = "") => {
	try {
		//const n = phrase.trim().split(" ");
		const n = phrase.split(" ");
		return n[n.length - 1];
	} catch (e) {return phrase;}
};

/*
	Source:
	https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c
	Usage:
	getByteCount({'MULTISIG-P2SH:2-4':45},{'P2PKH':1}) Means "45 inputs of P2SH Multisig and 1 output of P2PKH"
	getByteCount({'P2PKH':1,'MULTISIG-P2SH:2-3':2},{'P2PKH':2}) means "1 P2PKH input and 2 Multisig P2SH (2 of 3) inputs along with 2 P2PKH outputs"
*/
const getByteCount = (inputs, outputs, message = "") => {
	try {
		let totalWeight = 0;
		let hasWitness = false;
		let inputCount = 0;
		let outputCount = 0;
		// assumes compressed pubkeys in all cases.
		let types = {
			"inputs": {
				"MULTISIG-P2SH": 49 * 4,
				"MULTISIG-P2WSH": 6 + (41 * 4),
				"MULTISIG-P2SH-P2WSH": 6 + (76 * 4),
				"P2PKH": 148 * 4,
				"P2WPKH": 108 + (41 * 4),
				"P2SH-P2WPKH": 108 + (64 * 4),
				"bech32": (108 + (41 * 4)) + 1,
				"segwit": (108 + (64 * 4)) + 1,
				"legacy": (148 * 4) + 1
			},
			"outputs": {
				"P2SH": 32 * 4,
				"P2PKH": 34 * 4,
				"P2WPKH": 31 * 4,
				"P2WSH": 43 * 4,
				"bech32": 31 * 4 + 1,
				"segwit": 32 * 4 + 1,
				"legacy": 34 * 4 + 1
			}
		};

		const checkUInt53 = (n) => {
			if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0) throw new RangeError("value out of range");
		};

		const varIntLength = (number) => {
			checkUInt53(number);

			return (
				number < 0xfd ? 1
					: number <= 0xffff ? 3
					: number <= 0xffffffff ? 5
						: 9
			);
		};

		Object.keys(inputs).forEach(function (key) {
			checkUInt53(inputs[key]);
			if (key.slice(0, 8) === "MULTISIG") {
				// ex. "MULTISIG-P2SH:2-3" would mean 2 of 3 P2SH MULTISIG
				var keyParts = key.split(":");
				if (keyParts.length !== 2) throw new Error("invalid input: " + key);
				var newKey = keyParts[0];
				var mAndN = keyParts[1].split("-").map(function (item) {
					return parseInt(item);
				});

				totalWeight += types.inputs[newKey] * inputs[key];
				var multiplyer = (newKey === "MULTISIG-P2SH") ? 4 : 1;
				totalWeight += ((73 * mAndN[0]) + (34 * mAndN[1])) * multiplyer * inputs[key];
			} else {
				totalWeight += types.inputs[key] * inputs[key];
			}
			inputCount += inputs[key];
			if (key.indexOf("W") >= 0) hasWitness = true;
		});

		Object.keys(outputs).forEach(function (key) {
			checkUInt53(outputs[key]);
			totalWeight += types.outputs[key] * outputs[key];
			outputCount += outputs[key];
		});

		if (hasWitness) totalWeight += 2;

		totalWeight += 8 * 4;
		totalWeight += varIntLength(inputCount) * 4;
		totalWeight += varIntLength(outputCount) * 4;

		let messageByteCount = 0;
		try {
			messageByteCount = message.length;
			//Multiply by 2 to help ensure Electrum servers will broadcast the tx.
			messageByteCount = messageByteCount * 2;
		} catch {}
		return Math.ceil(totalWeight / 4)+messageByteCount;
	} catch (e) { return 256; }
};

const getScriptHash = (address = "", network = networks["bitcoin"]) => {
	if (typeof network === "string" && network in networks) network = networks[network];
	const script = bitcoin.address.toOutputScript(address, network);
	let hash = bitcoin.crypto.sha256(script);
	const reversedHash = new Buffer(hash.reverse());
	return reversedHash.toString("hex");
};

module.exports = {
	getItem,
	setItem,
	setKeychainValue,
	getKeychainValue,
	resetKeychainValue,
	validatePrivateKey,
	validateAddress,
	parsePaymentRequest,
	getDifferenceBetweenDates,
	getBalanceFromUtxos,
	getAddressTransactions,
	getAllTransactions,
	getTransactionData,
	getExchangeRate,
	isOnline,
	removeDupsFromArrOfObj,
	createTransaction,
	getTransactionSize,
	fetchData,
	getCoinNetwork,
	generateAddresses,
	getAddress,
	parseFiat,
	getNetworkType,
	capitalize,
	openUrl,
	openTxId,
	pauseExecution,
	vibrate,
	shuffleArray,
	getInfoFromAddressPath,
	nthIndex,
	formatNumber,
	removeAllButFirstInstanceOfPeriod,
	decodeOpReturnMessage,
	signMessage,
	verifyMessage,
	decodeURLParams,
	getBaseDerivationPath,
	loginWithBitid,
	getFiatBalance,
	removeDecimals,
	sortArrOfObjByKey,
	cryptoToFiat,
	fiatToCrypto,
	satsToBtc,
	getLastWordInString,
	getByteCount,
	getScriptHash
};
