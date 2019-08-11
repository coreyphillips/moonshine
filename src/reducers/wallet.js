// @flow weak
const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");
const {
	removeDupsFromArrOfObj
} = require("../utils/helpers");

const {
	defaultWalletShape,
	availableCoins,
	zeroValueItems
} = require("../utils/networks");

let currentAddresses = [], currentChangeAddresses = [];

module.exports = (state = {
	loading: false,
	error: false,
	errorTitle: "",
	errorMsg: "",
	network: "mainnet",
	selectedCrypto: "bitcoin",
	selectedCurrency: "usd",
	selectedWallet: "wallet0",
	wallets: {
		wallet0: defaultWalletShape
	},
	selectedTransaction: "",
	availableCoins,
	exchangeRate: zeroValueItems,
	blockHeight: { ...zeroValueItems, timestamp: null }
}, action) => {
	switch (action.type) {

		case actions.UPDATE_WALLET:
			return {
				...state,
				...action.payload
			};
		
		case actions.CREATE_WALLET:
			return {
				...state,
				wallets: {
					...state.wallets,
					...action.payload
				}
			};

		case actions.ADD_ADDRESSES:

			//Remove Duplicates From Addresses
			try { currentAddresses = state.wallets[action.payload.wallet].addresses[action.payload.selectedCrypto]; } catch (e) {}
			let newAddresses = action.payload.addresses;
			let addresses = currentAddresses.concat(newAddresses);
			addresses = removeDupsFromArrOfObj(addresses, "address");

			//Remove Duplicated From ChangeAddresses
			try { currentChangeAddresses = state.wallets[action.payload.wallet].changeAddresses[action.payload.selectedCrypto]; } catch (e) {}
			let newChangeAddresses = action.payload.changeAddresses;
			let changeAddresses = currentChangeAddresses.concat(newChangeAddresses);
			changeAddresses = removeDupsFromArrOfObj(changeAddresses, "address");

			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						addresses: {
							...state[action.payload.wallet].addresses,
							[action.payload.selectedCrypto]: addresses
						},
						changeAddresses: {
							...state.wallets[action.payload.wallet].changeAddresses,
							[action.payload.selectedCrypto]: changeAddresses
						}
					}
				}
			};

		case actions.RESET_UTXOS:
			let newUtxos = [];
			let oldUtxos = {};
			try {
				newUtxos = action.payload.utxos;
			} catch (e) {}
			try {
				oldUtxos = state.wallets[action.payload.wallet].utxos;
			} catch (e) {}
			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						utxos: {
							...oldUtxos,
							[action.payload.selectedCrypto]: newUtxos,
							timestamp: action.payload.timestamp
						}
					}
				}
			};

		case actions.ADD_UTXOS:

			let previousUtxos = [];
			try {
				previousUtxos = state.wallets[action.payload.wallet].utxos;
				previousUtxos = previousUtxos[action.payload.selectedCrypto];
			} catch (e) {}
			let utxos = action.payload.utxos.concat(previousUtxos);

			if (utxos.length > 1) utxos = removeDupsFromArrOfObj(utxos, "txid");

			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						utxos: {
							...state.wallets[action.payload.wallet].utxos,
							[action.payload.selectedCrypto]: utxos,
							timestamp: action.payload.timestamp
						}
					}
				}
			};

		case actions.UPDATE_CONFIRMED_BALANCE:
			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						confirmedBalance: {
							...state.wallets[action.payload.wallet].confirmedBalance,
							[action.payload.selectedCrypto]: action.payload.confirmedBalance,
							timestamp: action.payload.timestamp
						},
						unconfirmedBalance: {
							...state.wallets[action.payload.wallet].unconfirmedBalance,
							[action.payload.selectedCrypto]: action.payload.unconfirmedBalance,
							timestamp: action.payload.timestamp
						}
					}
				}
			};

		case actions.ADD_TRANSACTION:
			let currentTransactions = state.wallets[action.payload.wallet].transactions[action.payload.selectedCrypto];
			let newTransactions = action.payload.transaction.concat(currentTransactions);

			newTransactions = removeDupsFromArrOfObj(newTransactions, "hash");

			try {
				newTransactions.sort((obj1, obj2) => {
					const obj1Value = obj1.timestamp;
					const obj2Value = obj2.timestamp;
					return obj2Value - obj1Value || obj2.block - obj1.block || obj1.amount - obj2.amount;
				});
			} catch (e) {}
			
			const transactionData = {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						transactions: {
							...state.wallets[action.payload.wallet].transactions,
							[action.payload.selectedCrypto]: newTransactions
						}
					}
				}
			};
			
			//Attempt to add new rbfData
			let rbfData = {};
			try {
				if (Object.entries(action.payload.rbfData).length !== 0 && action.payload.rbfData.constructor === Object) {
					rbfData[action.payload.rbfData.hash] = action.payload.rbfData || {};
					transactionData[action.payload.wallet]["rbfData"] = {
						...state.wallets[action.payload.wallet].rbfData,
						[action.payload.selectedCrypto]: rbfData
					};
				}
			} catch (e) {}

			return transactionData;
		
		case actions.UPDATE_RBF_DATA:
			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						rbfData: {
							...state.wallets[action.payload.wallet].rbfData,
							[action.payload.selectedCrypto]: action.payload.rbfData
						}
					}
				}
			};

		case actions.TOGGLE_UTXO_BLACKLIST:

			let blacklistedUtxos = [];
			try {
				blacklistedUtxos = state.wallets[action.payload.wallet].blacklistedUtxos[action.payload.selectedCrypto];
			} catch (e) {}

			let transactionToBlacklist = action.payload.transaction;

			let transactionIndex = blacklistedUtxos.indexOf(transactionToBlacklist);
			if (transactionIndex > -1) {
				//Remove whitelisted transaction from the blacklist.
				blacklistedUtxos.splice(transactionIndex, 1);
			} else {
				//Add blacklist transaction to the blacklist.
				blacklistedUtxos.push(transactionToBlacklist);
			}

			let oldBlacklistedTransactions = {};
			try {
				oldBlacklistedTransactions = state.wallets[action.payload.wallet].blacklistedUtxos;
			} catch (e) {}

			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						blacklistedUtxos: {
							...oldBlacklistedTransactions,
							[action.payload.selectedCrypto]: blacklistedUtxos
						}
					}
				}
			};

		case actions.UPDATE_BLOCK_HEIGHT:
			return {
				...state,
				blockHeight: {
					...state.blockHeight,
					[action.payload.selectedCrypto]: action.payload.blockHeight,
					timestamp: action.payload.timestamp
				}
			};

		case actions.UPDATE_NEXT_AVAILABLE_ADDRESS:

			let previousTransactions = state.wallets[action.payload.wallet].transactions;
			previousTransactions = previousTransactions[action.payload.selectedCrypto];
			let transactions = action.payload.transactions.concat(previousTransactions);

			transactions = removeDupsFromArrOfObj(transactions, "hash");

			//TODO: Improve sorting of transactions included in the same block. Add a "firstSeen" id to properly sort the transactions in the order the wallet has first seen them.
			//Filter transactions by timestamp.
			try {
				transactions.sort((obj1, obj2) => {
					return obj2.timestamp - obj1.timestamp || obj2.block - obj1.block || obj1.amount - obj2.amount;
				});
			} catch (e) {}

			let timestamp = "";
			try {
				timestamp = action.payload.timestamp;
			} catch (e) {}

			//Remove Duplicates From Addresses
			try { currentAddresses = state.wallets[action.payload.wallet].addresses[action.payload.selectedCrypto]; } catch (e) {}
			newAddresses = action.payload.addresses;
			addresses = currentAddresses.concat(newAddresses);
			addresses = removeDupsFromArrOfObj(addresses, "address");

			//Remove Duplicated From ChangeAddresses
			currentChangeAddresses = state.wallets[action.payload.wallet].changeAddresses[action.payload.selectedCrypto];
			newChangeAddresses = action.payload.changeAddresses;
			changeAddresses = currentChangeAddresses.concat(newChangeAddresses);
			changeAddresses = removeDupsFromArrOfObj(changeAddresses, "address");

			//Remove any duplicate transactions
			//transactions = transactions.reduce((x, y) => x.findIndex(e=>e.hash===y.hash)<0 ? [...x, y]: x, []);
			return {
				...state,
				wallets: {
					...state.wallets,
					[action.payload.wallet]: {
						...state.wallets[action.payload.wallet],
						transactions: {
							...state.wallets[action.payload.wallet].transactions,
							[action.payload.selectedCrypto]: transactions
						},
						addressIndex: {
							...state.wallets[action.payload.wallet].addressIndex,
							[action.payload.selectedCrypto]: action.payload.addressIndex,
						},
						changeAddressIndex: {
							...state.wallets[action.payload.wallet].changeAddressIndex,
							[action.payload.selectedCrypto]: action.payload.changeAddressIndex
						},
						addresses: {
							...state.wallets[action.payload.wallet].addresses,
							[action.payload.selectedCrypto]: addresses
						},
						changeAddresses: {
							...state.wallets[action.payload.wallet].changeAddresses,
							[action.payload.selectedCrypto]: changeAddresses
						},
						lastUpdated: {
							...state.wallets[action.payload.wallet].lastUpdated,
							[action.payload.selectedCrypto]: timestamp
						}
					}
				}
			};

		case actions.CLEAR_LOADING_SPINNER:
			return {
				...state,
				error: false,
				errorTitle: "",
				errorMsg: "",
				loading: false
			};

		case actions.RESET:
			return {
				...state,
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: ""
			};

		case actions.DELETE_WALLET:
			const wallets = state.wallets;
			delete wallets[action.payload.wallet];
			return {
				...state,
				wallets
			};

		case actions.WIPE_DEVICE:
			return {
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: "",
				network: "mainnet",
				selectedCrypto: "bitcoin",
				selectedWallet: "wallet0",
				selectedCurrency: "usd",
				wallets: [],
				selectedTransaction: "",
				availableCoins,
				exchangeRate: zeroValueItems,
				blockHeight: { ...zeroValueItems, timestamp: null },
				wallet0: defaultWalletShape
			};

		default:
			return state;
	}
};
