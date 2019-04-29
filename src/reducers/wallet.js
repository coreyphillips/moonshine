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
	selectedWallet: "wallet0",
	wallets: [],
	selectedTransaction: "",
	availableCoins,
	exchangeRate: zeroValueItems,
	blockHeight: { ...zeroValueItems, timestamp: null },
	wallet0: defaultWalletShape
}, action) => {
	switch (action.type) {

		case actions.UPDATE_WALLET:
			return {
				...state,
				...action.payload
			};

		case actions.ADD_ADDRESSES:

			//Remove Duplicates From Addresses
			try { currentAddresses = state[action.payload.wallet].addresses[action.payload.selectedCrypto]; } catch (e) {}
			let newAddresses = action.payload.addresses;
			let addresses = currentAddresses.concat(newAddresses);
			addresses = removeDupsFromArrOfObj(addresses, "address");

			//Remove Duplicated From ChangeAddresses
			try { currentChangeAddresses = state[action.payload.wallet].changeAddresses[action.payload.selectedCrypto]; } catch (e) {}
			let newChangeAddresses = action.payload.changeAddresses;
			let changeAddresses = currentChangeAddresses.concat(newChangeAddresses);
			changeAddresses = removeDupsFromArrOfObj(changeAddresses, "address");

			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					addresses: {
						...state[action.payload.wallet].addresses,
						[action.payload.selectedCrypto]: addresses
					},
					changeAddresses: {
						...state[action.payload.wallet].changeAddresses,
						[action.payload.selectedCrypto]: changeAddresses
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
				oldUtxos = state[action.payload.wallet].utxos;
			} catch (e) {}
			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					utxos: {
						...oldUtxos,
						[action.payload.selectedCrypto]: newUtxos,
						timestamp: action.payload.timestamp
					}
				}
			};

		case actions.ADD_UTXOS:

			let previousUtxos = [];
			try {
				previousUtxos = state[action.payload.wallet].utxos;
				previousUtxos = previousUtxos[action.payload.selectedCrypto];
			} catch (e) {}
			let utxos = action.payload.utxos.concat(previousUtxos);

			if (utxos.length > 1) utxos = removeDupsFromArrOfObj(utxos, "txid");

			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					utxos: {
						...state[action.payload.wallet].utxos,
						[action.payload.selectedCrypto]: utxos,
						timestamp: action.payload.timestamp
					}
				}
			};

		case actions.UPDATE_CONFIRMED_BALANCE:
			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					confirmedBalance: {
						...state[action.payload.wallet].confirmedBalance,
						[action.payload.selectedCrypto]: action.payload.confirmedBalance,
						timestamp: action.payload.timestamp
					},
					unconfirmedBalance: {
						...state[action.payload.wallet].unconfirmedBalance,
						[action.payload.selectedCrypto]: action.payload.unconfirmedBalance,
						timestamp: action.payload.timestamp
					}
				}
			};

		case actions.ADD_TRANSACTION:
			let currentTransactions = state[action.payload.wallet].transactions[action.payload.selectedCrypto];
			let newTransactions = action.payload.transaction.concat(currentTransactions);

			newTransactions = removeDupsFromArrOfObj(newTransactions, "hash");

			try {
				newTransactions.sort((obj1, obj2) => {
					const obj1Value = obj1.timestamp;
					const obj2Value = obj2.timestamp;
					return obj2Value - obj1Value || obj2.block - obj1.block || obj1.amount - obj2.amount;
				});
			} catch (e) {}

			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					transactions: {
						...state[action.payload.wallet].transactions,
						[action.payload.selectedCrypto]: newTransactions
					}
				}
			};

		case actions.BLACKLIST_TRANSACTION:

			let blacklistedTransactions = [];
			try {
				blacklistedTransactions = state[action.payload.wallet].blacklistedTransactions[action.payload.selectedCrypto];
			} catch (e) {}

			let transactionToBlacklist = action.payload.transaction;

			let transactionIndex = blacklistedTransactions.indexOf(transactionToBlacklist);
			if (transactionIndex > -1) {
				//Remove whitelisted transaction from the blacklist.
				blacklistedTransactions.splice(transactionIndex, 1);
			} else {
				//Add blacklist transaction to the blacklist.
				blacklistedTransactions.push(transactionToBlacklist);
			}

			let oldBlacklistedTransactions = {};
			try {
				oldBlacklistedTransactions = state[action.payload.wallet].blacklistedTransactions;
			} catch (e) {}

			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					blacklistedTransactions: {
						...oldBlacklistedTransactions,
						[action.payload.selectedCrypto]: blacklistedTransactions
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

			let previousTransactions = state[action.payload.wallet].transactions;
			previousTransactions = previousTransactions[action.payload.selectedCrypto];
			let transactions = action.payload.transactions.concat(previousTransactions);

			transactions = removeDupsFromArrOfObj(transactions, "hash");

			//TODO: Improve sorting of transactions included in the same block.
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
			try { currentAddresses = state[action.payload.wallet].addresses[action.payload.selectedCrypto]; } catch (e) {}
			newAddresses = action.payload.addresses;
			addresses = currentAddresses.concat(newAddresses);
			addresses = removeDupsFromArrOfObj(addresses, "address");

			//Remove Duplicated From ChangeAddresses
			currentChangeAddresses = state[action.payload.wallet].changeAddresses[action.payload.selectedCrypto];
			newChangeAddresses = action.payload.changeAddresses;
			changeAddresses = currentChangeAddresses.concat(newChangeAddresses);
			changeAddresses = removeDupsFromArrOfObj(changeAddresses, "address");

			//Remove any duplicate transactions
			//transactions = transactions.reduce((x, y) => x.findIndex(e=>e.hash===y.hash)<0 ? [...x, y]: x, []);
			return {
				...state,
				[action.payload.wallet]: {
					...state[action.payload.wallet],
					transactions: {
						...state[action.payload.wallet].transactions,
						[action.payload.selectedCrypto]: transactions
					},
					addressIndex: {
						...state[action.payload.wallet].addressIndex,
						[action.payload.selectedCrypto]: action.payload.addressIndex,
					},
					changeAddressIndex: {
						...state[action.payload.wallet].changeAddressIndex,
						[action.payload.selectedCrypto]: action.payload.changeAddressIndex
					},
					addresses: {
						...state[action.payload.wallet].addresses,
						[action.payload.selectedCrypto]: addresses
					},
					changeAddresses: {
						...state[action.payload.wallet].changeAddresses,
						[action.payload.selectedCrypto]: changeAddresses
					},
					lastUpdated: {
						...state[action.payload.wallet].lastUpdated,
						[action.payload.selectedCrypto]: timestamp
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
			let wallets = state.wallets;
			const index = wallets.indexOf(action.payload.wallet);
			if (index > -1) {
				wallets.splice(index, 1);
			}
			delete state[action.payload.wallet];
			//Iterate over existing wallets. Only put in wallets that do not match the wallet to be removed
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
