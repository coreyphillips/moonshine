import "../../shim";
const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");
const moment = require("moment");
const bip39 = require("bip39");
const {
	setKeychainValue,
	resetKeychainValue,
	isOnline,
	generateAddresses,
	getAddress,
	getAddressTransactions,
	getAllTransactions,
	getInfoFromAddressPath
} = require("../utils/helpers");
const {
	walletHelpers
} = require("../utils/walletApi");
const {
	availableCoins,
	defaultWalletShape
} = require("../utils/networks");

const updateWallet = (payload) => ({
	type: actions.UPDATE_WALLET,
	payload
});

const getExchangeRate = ({ selectedCoin = "bitcoin", selectedCurrency = "usd", selectedService = "coincap" } = {}) => () => {
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
			exchangeRate = await walletHelpers.exchangeRate[selectedCoin].default({ service: selectedService, selectedCurrency });
			if (exchangeRate.error) failure("Invalid Exchange Rate Data");
			resolve({ error: false, data: exchangeRate.data });
		} catch (e) {
			console.log(e);
			failure();
		}
	});
};

const deleteWallet = ({ wallet } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};

		await resetKeychainValue({ key: wallet });

		try {
			dispatch({
				type: actions.DELETE_WALLET,
				payload: {
					wallet
				}
			});
			resolve({ error: false, data: "" });
		} catch (e) {
			failure(e);
		}
	});
};

const importWallet = ({ wallets = [], mnemonic = "" } = {}) => async () => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		
		try {
			//Get highest wallet number
			let highestNumber = 0;
			await Promise.all(
				wallets.map((wallet) => {
					let walletNumber = wallet.replace("wallet","");
					walletNumber = Number(walletNumber);
					if (walletNumber > highestNumber) highestNumber = walletNumber;
				})
			);
			//Add wallet name to wallets array;
			const walletName = `wallet${highestNumber+1}`;
			
			const response = await createWallet({ wallet: walletName, mnemonic});
			
			if (response.error === false) {
				resolve({error: false, data: response.data});
			} else {
				failure(response.data);
			}
		} catch (e) {
			failure(e);
		}
	});
};

const createWallet = ({ wallet = "wallet0", selectedCrypto = "bitcoin", addressAmount = 2, changeAddressAmount = 2, mnemonic = "", generateAllAddresses = true } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			//Generate Mnemonic
			if (mnemonic === "") {
				mnemonic = bip39.generateMnemonic(256);
			}
			
			if (bip39.validateMnemonic(mnemonic)) {
				await setKeychainValue({ key: wallet, value: mnemonic });
			} else {
				//createWallet({ wallet, mnemonic });
				//Invalid Mnemonic
				failure("Invalid Mnemonic");
				return;
			}
			
			const coins = availableCoins;
			
			let allAddresses = {};
			await Promise.all(coins.map(async (coin) => { allAddresses[coin] = { addresses: [], changeAddresses: [] };}));
			
			//Generate receiving and change addresses.
			if (generateAllAddresses) {
				await Promise.all(
					coins.map(async (coin) => {
						let addresses = await generateAddresses({
							addressAmount,
							changeAddressAmount,
							selectedCrypto: coin,
							wallet
						});
						if (addresses.error) addresses = {data: {addresses: [], changeAddresses: []}};
						allAddresses[coin].addresses = addresses.data.addresses;
						allAddresses[coin].changeAddresses = addresses.data.changeAddresses;
					})
				);
			} else {
				let generatedAddresses = await generateAddresses({ addressAmount, changeAddressAmount, selectedCrypto, wallet });
				if (generatedAddresses.error) {
					allAddresses[selectedCrypto].addresses = generatedAddresses.data.addresses;
					allAddresses[selectedCrypto].changeAddresses = generatedAddresses.data.changeAddresses;
				}
			}
			
			let addresses = {}, changeAddresses = {};
			await Promise.all(
				coins.map(coin => {
					try {
						addresses[coin] = allAddresses[coin].addresses || [];
						changeAddresses[coin] = allAddresses[coin].changeAddresses || [];
					} catch (e) {
						addresses[coin] = [];
						changeAddresses[coin] = [];
					}
				})
			);
			
			const payload = {
				[wallet]: {
					...defaultWalletShape,
					addresses,
					changeAddresses
				}
			};
			
			await dispatch({
				type: actions.UPDATE_WALLET,
				payload
			});
			
			resolve({ error: false, data: allAddresses });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const resetUtxos = ({wallet = "wallet0", addresses = [], changeAddresses = [], currentBlockHeight = 0, selectedCrypto = "bitcoin"} = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			/*
			//Add existing utxos to addresses
			let currentUtxos = [];
			await Promise.all(
				currentUtxos.map(async (utxo) => {
					let match = false;
					await Promise.all(
						addresses.map((address) => address === utxo.address ? match = true : null),
						changeAddresses.map((changeAddress) => changeAddress === utxo.address ? match = true : null),
					);
					if (match === false) addresses = addresses.push(utxo.address);
				}
			));
			*/
			
			
			//Returns { error: false, data: { utxos, balance } }
			const utxoResult = await walletHelpers.utxos[selectedCrypto].default({ addresses, changeAddresses, currentBlockHeight });
			if (utxoResult.error === true) {
				failure(utxoResult);
				return;
			}
			let utxos = [];
			try {
				utxos = utxoResult.data.utxos;
			} catch (e) {
				failure();
				return;
			}
			
			if (utxoResult.error === false) {
				dispatch({
					type: actions.RESET_UTXOS,
					payload: {
						wallet,
						selectedCrypto,
						utxos,
						//confirmedBalance: utxoResult.data.balance,
						timestamp: moment()
					},
				});
				resolve(utxoResult);
				return;
			}
			failure(utxoResult);
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const addTransaction = ({ wallet = "wallet0", transaction = {}, selectedCrypto = "bitcoin" } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({ error: true, data });
		};
		try {
			dispatch({
				type: actions.ADD_TRANSACTION,
				payload: {
					wallet,
					selectedCrypto,
					transaction
				},
			});
			resolve({ error: false, data: transaction });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const updateBalance = ({ wallet = "wallet0", utxos = [], selectedCrypto = "bitcoin" } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({ error: true, data });
		};
		try {
			const isConnected = await isOnline();
			if (isConnected === false) {
				failure();
				return;
			}
			
			let confirmedBalance = 0;
			let unconfirmedBalance = 0;
			await Promise.all(utxos.map(async (utxo) => {
				try {
					confirmedBalance += utxo.value;
				} catch (e) {}
			}));
			/*
			await Promise.all(utxos.map(async (utxo) => {
				utxo.confirmations >= confirmations ? confirmedBalance+=utxo.value : unconfirmedBalance+=utxo.value;
			}));
			*/
			dispatch({
				type: actions.UPDATE_CONFIRMED_BALANCE,
				payload: {
					wallet,
					selectedCrypto,
					confirmedBalance,
					unconfirmedBalance,
					timestamp: moment()
				},
			});
			resolve({ error: false, data: confirmedBalance });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const updateBlockHeight = ({ selectedCrypto = "bitcoin" } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({ error: true, data });
		};
		try {
			const response = await walletHelpers.getBlockHeight[selectedCrypto].default();
			try {
				if (response.error === false && response.data !== undefined && response.data > 0) {
					const blockHeight = response.data;
					dispatch({
						type: actions.UPDATE_BLOCK_HEIGHT,
						payload: {
							selectedCrypto,
							blockHeight,
							timestamp: moment()
						},
					});
					resolve({ error: false, data: response });
				}
				failure("Unable to fetch block height.");
			} catch (e) {
				console.log(e);
				failure("Unable to fetch block height.");
			}
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const addAddresses = ({ wallet = "wallet0", selectedCrypto = "bitcoin", addressAmount = 5, changeAddressAmount = 5, addressIndex = 0, changeAddressIndex = 0 }) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			//Generate receiving and change addresses.
			let addresses = await generateAddresses({ addressAmount, changeAddressAmount, addressIndex, changeAddressIndex, selectedCrypto, wallet });
			if (addresses.error) {
				addresses = { data: { addresses: [], changeAddresses: [] } };
			}
			
			dispatch({
				type: actions.ADD_ADDRESSES,
				payload: {
					wallet,
					selectedCrypto,
					addresses: addresses.data.addresses,
					changeAddresses: addresses.data.changeAddresses,
					timestamp: moment()
				},
			});
			resolve({ error: false, data: addresses.data });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const blacklistTransaction = ({ transaction = "", wallet = "wallet0", selectedCrypto = "" } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({error: true, data});
		};
		try {
			
			dispatch({
				type: actions.BLACKLIST_TRANSACTION,
				payload: {
					transaction,
					wallet,
					selectedCrypto
				}
			});
			resolve({ error: false, data: transaction, wallet, selectedCrypto });
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const initialImportSync = ({ wallet = "wallet0", selectedCrypto = "bitcoin", currentBlockHeight = 0 }) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({ error: true, data });
		};
		
		const isConnected = await isOnline();
		if (isConnected === false) {
			failure("Offline");
			return;
		}
		
		try {
			//The threshold dictates how many empty addresses the function should search for before resolving
			//const defaultIndexThreshold = 1;
			//Add all address transactions to transactions array
			let transactions = [];
			let addressIndexes = [];
			let changeAddressIndexes = [];
			
			//Create Addresses
			//Generate receiving and change addresses.
			const newAddresses = await generateAddresses({ addressAmount: 50, changeAddressAmount: 50, addressIndex: 0, selectedCrypto, wallet });
			const addresses = newAddresses.data.addresses;
			const changeAddresses = newAddresses.data.changeAddresses;
			
			await Promise.all(
				addresses.map(async (addr) => {
					try {
						const address = addr.address;
						const addressTransactions = await getAddressTransactions({
							address,
							addresses,
							changeAddresses,
							selectedCrypto,
							currentBlockHeight
						});
						if (addressTransactions.error === false && Array.isArray(addressTransactions.data) && addressTransactions.data.length > 0) {
							const currentAddressIndex = await getInfoFromAddressPath(addr.path);
							addressIndexes = addressIndexes.concat([currentAddressIndex.addressIndex]);
							transactions = transactions.concat(addressTransactions.data);
						}
					} catch (e) {
						console.log(e);
					}
				}),
				changeAddresses.map (async (changeAddr) => {
					const changeAddress = changeAddr.address;
					const changeAddressTransactions = await getAddressTransactions({
						address: changeAddress,
						addresses,
						changeAddresses,
						selectedCrypto,
						currentBlockHeight
					});
					if (changeAddressTransactions.error === false && Array.isArray(changeAddressTransactions.data) && changeAddressTransactions.data.length > 0) {
						const currentAddressIndex = await getInfoFromAddressPath(changeAddr.path);
						changeAddressIndexes = changeAddressIndexes.concat([currentAddressIndex.addressIndex]);
						transactions = transactions.concat(changeAddressTransactions.data);
					}
				})
			);
			
			
			//Filter transactions by timestamp.
			/*
			transactions.sort((obj1, obj2) => {
				const obj1Value = obj1.timestamp;
				const obj2Value = obj2.timestamp;
				return obj2Value - obj1Value || obj2.block - obj1.block || obj1.amount - obj2.amount;
			});
			*/
			
			const payload = {
				wallet,
				selectedCrypto,
				transactions,
				addressIndex: Math.max.apply(Math, addressIndexes),
				changeAddressIndex: Math.max.apply(changeAddressIndexes),
				addresses,
				changeAddresses,
				timestamp: moment()
			};
			
			dispatch({
				type: actions.UPDATE_NEXT_AVAILABLE_ADDRESS,
				payload
			});
			resolve({error: false, data: payload});
		} catch (e) {
			console.log(e);
			failure(e);
		}
	});
};

const getNextAvailableAddress = ({ wallet = "wallet0", addresses = [], changeAddresses = [], addressIndex = 0, changeAddressIndex = 0, selectedCrypto = "bitcoin", currentBlockHeight = 0 } = {}) => async (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (data) => {
			resolve({ error: true, data });
		};
		
		const isConnected = await isOnline();
		if (isConnected === false) {
			failure("Offline");
			return;
		}
		
		try {
			//Make sure to dispatch and save new addresses if there are no addresses initially.
			let addNewAddresses = false;
			//Create Addresses if none exist
			if (!addresses.length) {
				//Generate receiving and change addresses.
				const newAddresses = await generateAddresses({ addressAmount: 5, changeAddressAmount: 0, addressIndex: 0, selectedCrypto, wallet });
				if (!newAddresses.error) addresses = newAddresses.data.addresses;
				addNewAddresses = true;
			}
			//Create Change Addresses if none exist
			if (!changeAddresses.length) {
				//Generate receiving and change addresses.
				const newAddresses = await generateAddresses({ addressAmount: 0, changeAddressAmount: 5, addressIndex: 0, selectedCrypto, wallet });
				if (!newAddresses.error) changeAddresses = newAddresses.data.changeAddresses;
				addNewAddresses = true;
			}
			
			let allAddresses = addresses.slice(addressIndex, addresses.length);
			let allChangeAddresses = changeAddresses.slice(changeAddressIndex, changeAddresses.length);
			allAddresses = allAddresses.concat(allChangeAddresses);
			
			let allTransactions = [];
			let foundLastUsedAddress = false;
			let foundLastUsedChangeAddress = false;
			
			for (let i = 0; i < 10; i++) {
				const transactions = await getAllTransactions({
					allAddresses,
					addresses,
					changeAddresses,
					selectedCrypto,
					currentBlockHeight
				});
				
				if (transactions.error === false && transactions.data.length) allTransactions = allTransactions.concat(transactions.data);
				
				addressIndex = transactions.lastUsedAddress !== null ? transactions.lastUsedAddress + 1 : addressIndex;
				foundLastUsedAddress = transactions.lastUsedAddress === null || transactions.lastUsedAddress < addresses.length - 1;
				
				changeAddressIndex = transactions.lastUsedChangeAddress !== null ? transactions.lastUsedChangeAddress + 1 : changeAddressIndex;
				foundLastUsedChangeAddress = transactions.lastUsedChangeAddress === null || transactions.lastUsedChangeAddress < changeAddresses.length - 1;
				
				allAddresses = [];
				
				//Create Addresses if none exist
				if (foundLastUsedAddress === false) {
					i = 0;
					//Generate receiving and change addresses.
					const newAddresses = await generateAddresses({ addressAmount: 5, changeAddressAmount: 0, addressIndex, selectedCrypto, wallet });
					allAddresses = allAddresses.concat(newAddresses.data.addresses);
					addresses = addresses.concat(newAddresses.data.addresses);
				}
				
				//Create Change Addresses if none exist
				if (foundLastUsedChangeAddress === false) {
					i = 0;
					//Generate receiving and change addresses.
					const newChangeAddresses = await generateAddresses({ addressAmount: 0, changeAddressAmount: 5, changeAddressIndex, selectedCrypto, wallet });
					allAddresses = allAddresses.concat(newChangeAddresses.data.changeAddresses);
					changeAddresses = changeAddresses.concat(newChangeAddresses.data.changeAddresses);
				}
				
				if (foundLastUsedAddress && foundLastUsedChangeAddress) {
					i = 10;
					break;
				}
			}
			
			if (allTransactions.length || addNewAddresses) {
				const payload = {
					wallet,
					selectedCrypto,
					transactions: allTransactions,
					addressIndex,
					changeAddressIndex,
					addresses,
					changeAddresses
				};
				
				dispatch({
					type: actions.UPDATE_NEXT_AVAILABLE_ADDRESS,
					payload
				});
				resolve({error: false, data: payload});
				return;
			}
			resolve({error: false, data: {}});
		} catch (e) {
			console.log(e);
			failure(e);
		}
		
	});
};

module.exports = {
	deleteWallet,
	importWallet,
	updateWallet,
	getExchangeRate,
	getAddress,
	createWallet,
	updateBalance,
	getNextAvailableAddress,
	resetUtxos,
	updateBlockHeight,
	addTransaction,
	blacklistTransaction,
	addAddresses,
	initialImportSync
};