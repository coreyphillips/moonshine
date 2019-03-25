import {
	Platform,
	Linking,
	Vibration
} from "react-native";
import AsyncStorage from "@react-native-community/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Keychain from "react-native-keychain";
import "../../shim";
const {
	networks
} = require("./networks");
const {
	walletHelpers
} = require("./walletApi");
const bitcoin = require("rn-bitcoinjs-lib");
const bip39 = require("bip39");
const bip32 = require("bip32");
const moment = require("moment");
let coinSelect = require("coinselect");
const bip21 = require("bip21");
const {
	availableCoins
} = require("../utils/networks");

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
			const result = await Keychain.setGenericPassword(key, value, key);
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
			const result = await Keychain.getGenericPassword(key);
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
const getBalanceFromUtxos = ({ addresses = [], changeAddresses = [], selectedCrypto = "bitcoin" } = {}) => {
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

const importWallet = async ({ wallets = [], updateWallet = () => null, createWallet = () => null, mnemonic = "" } = {}) => {
	try {
		const result = await createWallet({ mnemonic });
		if (result.error === false) {
			return { error: false, data: result.data };
		} else {
			return { error: true, data: result.data };
		}
	} catch (e) {
		console.log(e);
	}
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
				console.log("Is Key");
				verified = true;
				network = key;
				break;
			} catch(e) {
				verified = false
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
				if (validateAddressResult.isValid && typeof data === "string" && !data.includes(":" || "?" || "&")) {
					resolve({ error: false, data: { address: data, coin: validateAddressResult.coin, amount: "", label: "" } });
					return;
				}

				//Determine if we need to parse the data.
				if (data.includes(":" || "?" || "&")) {
					try {
						const coin = data.match(/.+?(?=:)/);
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
						try {
							amount = result.options.amount;
						} catch (e) {}
						try {
							message = result.options.message;
						} catch (e) {}
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
			//alert(uri.includes(":" || "?" || "&"));
			//alert(JSON.stringify(queryString.parse("1DEcJ8mZ68YWvbxwoa8EzNKVuVpg3ik2WE")));
			//alert(JSON.stringify(data));
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
const convert_zpub_to_xpub = (z) => {
	let data = b58.decode(z);
	data = data.slice(4);
	data = Buffer.concat([Buffer.from("0488b21e","hex"), data]);
	return b58.encode(data);
};

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

const getExchangeRate = ({ selectedCrypto = "bitcoin" } = {}) => {
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
			exchangeRate = await walletHelpers.exchangeRate[selectedCrypto].default();
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
			const response = await walletHelpers.history[selectedCrypto].default({ address, addresses, changeAddresses, currentBlockHeight, selectedCrypto });
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

		const isConnected = await Promise.all(isOnline());
		if (!isConnected || isConnected === false) {
			failure("Offline");
			return;
		}

		try {
			const response = await walletHelpers.history[selectedCrypto].default({ allAddresses, addresses, changeAddresses, currentBlockHeight, selectedCrypto });
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
	let isConnected = true;
	try {
		if (Platform.OS === "ios") {
			return new Promise((resolve) => {
				const connectionHandler = connectionInfo => {
					NetInfo.removeEventListener("connectionChange", connectionHandler);
					if (connectionInfo.type === "none" || connectionInfo.type === "unknown") isConnected = false;
					resolve(isConnected);
				};
				NetInfo.addEventListener("connectionChange", connectionHandler);
			})
		}
		const connectionInfo = await NetInfo.getConnectionInfo();
		if (connectionInfo.type === "none" || connectionInfo.type === "unknown") isConnected = false;
	} catch (e) {}
	return isConnected;
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
	/*
	switch (selectedCrypto) {
		case "bitcoin":
		case "litecoin":
			return "mainnet";
		case "bitcoinTestnet":
		case "litecoinTestnet":
			return "testnet";
		default:
			return "mainnet";
			break;
	}
	*/
	try {
		selectedCrypto = selectedCrypto.toLowerCase();
		const isTestnet = selectedCrypto.includes("testnet");
		return isTestnet ? "testnet" : "mainnet";
	} catch (e) {
		return "testnet"
	}
};

const getTransactionSize = (numInputs, numOutputs) => {
	return numInputs*180 + numOutputs*34 + 10 + numInputs;
};

const createTransaction = ({ address = "", transactionFee = 2, amount = 0, confirmedBalance = 0, utxos = [], changeAddress = "", wallet = "wallet0", selectedCrypto = "bitcoin", message = "" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (errorTitle = "", errorMsg = "") => {
			resolve({ error: true, errorTitle, errorMsg });
		};
		try {
			const network = networks[selectedCrypto];
			const totalFee = getTransactionSize(utxos.length, changeAddress ? 2 : 1) * transactionFee;

			//Address and amount to send.
			let targets = [{ address, value: amount }];
			//Change address and amount to send back to wallet.
			if (changeAddress) targets.push({ address: changeAddress, value: confirmedBalance - (amount + totalFee) });

			//Fetch Keypair
			const keychainResult = await getKeychainValue({ key: wallet });
			if (keychainResult.error === true) return;
			const mnemonic = keychainResult.data.password;
			const seed = bip39.mnemonicToSeed(mnemonic);
			const root = bip32.fromSeed(seed, network);
			//const privKeyWIF = keyPair.toWIF();
			//const keyPair = bitcoin.ECPair.fromWIF(privKeyWIF, network);
			//const xprv = root.toBase58();
			//const xpub = root.neutered().toBase58();
			let txb = new bitcoin.TransactionBuilder(network);

			//Add Inputs
			await Promise.all(
				utxos.map((utxo) => {
					const path = utxo.path;
					const keyPair = root.derivePath(path);
					//const keyPair = root.derivePath("m/49");
					const p2wpkh = bitcoin.payments.p2wpkh({pubkey: keyPair.publicKey, network});
					//const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
					const p2pk = bitcoin.payments.p2pk({pubkey: keyPair.publicKey, network});
					const p2wsh = bitcoin.payments.p2wsh({redeem: p2pk, network});
					let p2wpkhOutScript = null;
					try {
						p2wpkhOutScript = p2wpkh.output;
					} catch (e) {
					}
					let p2wshOutScript = null;
					try {
						p2wshOutScript = p2wsh.output;
					} catch (e) {
					}
					let prevOutPutScript = null;
					if (p2wpkhOutScript !== null) prevOutPutScript = p2wpkhOutScript; //22 bytes
					if (p2wshOutScript !== null) prevOutPutScript = p2wshOutScript; //34 bytes
					// For P2WPKH (bech32): txb.addInput(unspent.txId, unspent.vout, null, p2wpkh.output) // NOTE: provide the prevOutScript!
					// For P2SH (3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy): txb.addInput(unspent.txId, unspent.vout)
					// For P2PWPKH txb.addInput(unspent.txId, unspent.vout, null, p2wpkh.output) // NOTE: provide the prevOutScript!
					// For p2wsh txb.addInput(unspent.txId, unspent.vout, null, p2wsh.output) // NOTE: provide the prevOutScript!
					// For P2SH(P2WPKH) txb.addInput(unspent.txId, unspent.vout)
					txb.addInput(utxo.txid, utxo.vout, null, p2wpkh.output);
				})
			);

			if (message !== "") {
				const data = Buffer.from(message, "utf8");
				const embed = bitcoin.payments.embed({data: [data], network});
				txb.addOutput(embed.output, 0);

			}

			await Promise.all(
				targets.map((target) => {
					txb.addOutput(target.address, target.value);
				})
			);

			//Loop through and sign
			await Promise.all(
				utxos.map((utxo, i) => {
					try {
						const path = utxo.path;
						const keyPair = root.derivePath(path);
						txb.sign(i, keyPair, null, null, utxo.value);
					} catch (e) {
						console.log(e);
					}
				})
			);
			const rawTx = txb.build().toHex();
			resolve({ error: false, data: rawTx });
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
			break;
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

const generateAddresses = async ({ addressAmount = 0, changeAddressAmount = 0, wallet = "wallet0", addressIndex = 0, changeAddressIndex = 0, selectedCrypto = "bitcoin", type = "bech32" } = {}) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			const networkType = getNetworkType(selectedCrypto); //Returns mainnet or testnet
			const networkValue = networkType === "testnet" ? 1 : 0; //Used to modify the derivation path accordingly
			const network = networks[selectedCrypto]; //Returns the network object based on the selected crypto.
			const keychainResult = await getKeychainValue({ key: wallet });
			if (keychainResult.error === true) return;

			const mnemonic = keychainResult.data.password;
			const seed = bip39.mnemonicToSeed(mnemonic);
			const root = bip32.fromSeed(seed, network);

			console.log("Log: Retrieved Mnemonic & Root...");

			console.log("Logging Change Address Index");
			console.log(changeAddressIndex)

			let addresses = [];
			let changeAddresses = [];

			//Generate Addresses
			let addressArray = new Array(addressAmount).fill(null);
			let changeAddressArray = new Array(changeAddressAmount).fill(null);
			type = "bech32";
			//type = "p2pkh";
			await Promise.all(
				addressArray.map(async (item, i) => {
					try {
						const addressPath = `m/49'/${networkValue}'/0'/0/${i + addressIndex}`;
						const addressKeypair = root.derivePath(addressPath);
						const address = await getAddress(addressKeypair, network, type);
						console.log(`Log: Created address ${i + addressIndex}: ${address}`);
						addresses.push({ address, path: addressPath });
						return {address, path: addressPath};
					} catch (e) {}
				}),
				changeAddressArray.map(async (item, i) => {
					try {
						const changeAddressPath = `m/49'/${networkValue}'/0'/1/${i + changeAddressIndex}`;
						const changeAddressKeypair = root.derivePath(changeAddressPath);
						const address = await getAddress(changeAddressKeypair, network, type);
						console.log(`Log: Created changeAddress ${i + changeAddressIndex}: ${address}`);
						changeAddresses.push({ address, path: changeAddressPath });
						return {address, path: changeAddressPath}
					} catch (e) {}
				})
			);

			/*
			for (let i = addressIndex; i < addressAmount+addressIndex; i++) {
				const addressPath = `m/49'/${networkValue}'/0'/0/${i}`;
				const addressKeypair = root.derivePath(addressPath);
				const address = await getAddress(addressKeypair, network, type);
				console.log(`Log: Created address ${i}: ${address}`);
				addresses.push({ address, path: addressPath });
			}

			//Generate Change Addresses
			for (let i = changeAddressIndex; i < changeAddressAmount+changeAddressIndex; i++) {
				const changeAddressPath = `m/49'/${networkValue}'/0'/1/${i}`;
				const changeAddressKeypair = root.derivePath(changeAddressPath);
				const address = await getAddress(changeAddressKeypair, network, type)
				console.log(`Log: Created changeAddress ${i}: ${address}`);
				changeAddresses.push({ address, path: changeAddressPath });
			}
			*/
			resolve({ error: false, data: { addresses, changeAddresses } });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const getAddress = (keyPair, network, type = "bech32") => {
	switch (type) {
		case "bech32":
			//Get Native Bech32 (bc1) addresses
			return bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address;
		case "p2sh":
			//Get Segwit P2SH Address (3)
			return bitcoin.payments.p2sh({
				redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }),
				network
			}).address;
			//Get Legacy Address (1)
		case "p2pkh":
			return bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address;
	}
	/*
	if (type === "bech32") {
		//Get Native Bech32 (bc1) addresses
		const {address} = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
		return address;
	}
	if (type === "p2sh") {
		//Get Segwit P2SH Address (3)
		const { address } = bitcoin.payments.p2sh({
			redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }),
			network
		});
		return address;
	}
	*/
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

const vibrate = (duration = 50) => {
	try {
		Vibration.vibrate(duration);
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

//Returns true or false if there is a match between two arrays
const compareArrays = (arr1,arr2) => {
	return new Promise(async (resolve) => {
		try {
			arr1.forEach((e1) => arr2.forEach((e2) => {
					if (e1 === e2) {
						objMap[e1] = objMap[e1] + 1 || 1;
					}
				}
			));
			const count = Object.keys(objMap).map(e => Number(e));
			resolve({ error: true, data: count[0] > 0 });
		} catch (e) {
			resolve({ error: true , data: false });
		}
	});

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
	)
};

const removeAllButFirstInstanceOfPeriod = (s) => {
	//s = s.replace(/[^^]./g, '')
	//return = s.replace(/[^0-9.]/g, ""); //Best so far

	function removeDecimals( str ) {
		return str.replace( /^([^.]*\.)(.*)$/, function ( a, b, c ) {
			return b + c.replace( /\./g, '' );
		});
	}
	try {
		if (s.length >= 2 && s.charAt(0) === "0" && s.charAt(1) !== ".") {
			while (s.charAt(0) === "0" && s.charAt(1) !== ".") {
				s = s.substr(1);
			}
		}
		if (s.charAt(0) === "." && s.length === 1) s = "0.";
		s = removeDecimals(s);
		const decimalIndex = s.includes(".");
		if (decimalIndex !== -1) {
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

const getCoinData = ({ selectedCrypto = "bitcoin", cryptoUnit = "satoshi" }) => {
	try {
		let acronym = "BTC";
		let satoshi = "satoshi";
		switch (selectedCrypto) {
			case "bitcoin":
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				return { acronym, label: "Bitcoin", crypto: "BTC", satoshi };
			case "bitcoinTestnet":
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				return { acronym, label: "Bitcoin Testnet", crypto: "BTC", satoshi };
			case "litecoin":
				satoshi = "litoshi";
				acronym = cryptoUnit === "satoshi" ? "lits" : "LTC";
				return { acronym, label: "Litecoin", crypto: "LTC", satoshi };
			case "litecoinTestnet":
				satoshi = "litoshi";
				acronym = cryptoUnit === "satoshi" ? "lits" : "LTC";
				return { acronym, label: "Litecoin Testnet", crypto: "LTC", satoshi };
			default:
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				return { acronym, label: "Bitcoin", crypto: "BTC" };
		}
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

module.exports = {
	getCoinData,
	compareArrays,
	getItem,
	setItem,
	setKeychainValue,
	getKeychainValue,
	resetKeychainValue,
	importWallet,
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
	pauseExecution,
	vibrate,
	shuffleArray,
	getInfoFromAddressPath,
	nthIndex,
	formatNumber,
	removeAllButFirstInstanceOfPeriod,
	decodeOpReturnMessage
};