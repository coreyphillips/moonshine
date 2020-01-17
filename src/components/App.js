import React, {Component} from "react";
import {
	ActivityIndicator,
	Animated,
	AppState,
	BackHandler,
	Dimensions,
	InteractionManager,
	Keyboard,
	LayoutAnimation,
	NativeModules,
	Platform,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
	Easing
} from "react-native";
import {systemWeights} from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import TouchID from "react-native-touch-id";
import "../../shim";

import Header from "./Header";
import CameraRow from "./CameraRow";
import ReceiveTransaction from "./ReceiveTransaction";
import TransactionList from "./TransactionList";
import TransactionDetail from "./TransactionDetail";
import Button from "./Button";
import XButton from "./XButton";
import Camera from "./Camera";
import SelectCoin from "./SelectCoin";
import SendTransaction from "./SendTransaction";
import SweepPrivateKey from "./SweepPrivateKey";
import Settings from "./Settings";
import Biometrics from "./Biometrics";
import PinPad from "./PinPad";
import Loading from "./Loading";
import * as electrum from "../utils/electrum";
import nodejs from "nodejs-mobile-react-native";
import bitcoinUnits from "bitcoin-units";
import DefaultModal from "./DefaultModal";
import Welcome from "./Welcome";
import BackupPhrase from './BackupPhrase';
//import ElectrumTesting from "./ElectrumTesting";
const uuidv4 = require("uuid/v4");
const {UIManager} = NativeModules;
const Url = require("url-parse");
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	parsePaymentRequest,
	isOnline,
	getNetworkType,
	pauseExecution,
	capitalize,
	getInfoFromAddressPath,
	getExchangeRate,
	validatePrivateKey,
	getTransactionSize,
	loginWithBitid,
	vibrate,
	getKeychainValue
} = require("../utils/helpers");
const {
	defaultWalletShape
} = require("../utils/networks");
const moment = require("moment");
const {
	version
} = require("../../package");
const {width} = Dimensions.get("window");
const bip39 = require("bip39");
this.subscribedAddress = ""; //Holds currently subscribed address
this.headersAreSubscribed = false; //Determines whether wallet is subscribed to new headers
this.subscribedWithPeer = ""; //Holds what peer we are subscribed to new headers with
this.authenticating = false; //Determines whether the app is currently authenticating. This attempts to address issue #5.
export default class App extends Component {
	
	state = {
		upperContentFlex: new Animated.Value(1),
		lowerContentFlex: new Animated.Value(0),
		
		displayCameraRow: false,
		cameraRowOpacity: new Animated.Value(0),
		
		displayReceiveTransaction: false,
		receiveTransactionOpacity: new Animated.Value(0),
		
		displayTransactionDetail: false,
		transactionDetailOpacity: new Animated.Value(0),
		
		displaySelectCoin: false,
		selectCoinOpacity: new Animated.Value(0),
		
		displayLoading: false,
		loadingOpacity: new Animated.Value(0),
		
		displayTextInput: false,
		textInputOpacity: new Animated.Value(0),
		
		displaySweepPrivateKey: false,
		sweepPrivateKeyOpacity: new Animated.Value(0),
		
		displayPriceHeader: false,
		priceHeaderOpacity: new Animated.Value(0),
		
		displayXButton: false,
		xButtonOpacity: new Animated.Value(0),
		
		displayCamera: false,
		cameraOpacity: new Animated.Value(0),
		
		displaySettings: false,
		settingsOpacity: new Animated.Value(0),
		
		displayBiometrics: false,
		biometricsOpacity: new Animated.Value(0),
		displayBiometricAuthenticationRetry: false,
		
		displayPin: false,
		pinOpacity: new Animated.Value(0),
		
		displayTransactionList: false,
		transactionListOpacity: new Animated.Value(0),
		
		displayBitidModal: false,
		bitidData: { uri: "", host: "" },
		
		displayWelcomeModal: false,
		
		displayBackupPhrase: false,
		backupPhrase: [],
		
		appState: AppState.currentState,
		appHasLoaded: false,
		
		/*
		I do wonder how long it will take for someone to find and sweep this private key...
		Addr: bc1qcgt450ctz7c0zpgzq0wmua3je7mmpzzed9wyfg
		Priv: L323HBXNkhn4ogPvmMZBa5fFVE7BjL6f5osyXYxmVsUjNoBvYAHG
		Update: Congrats to whoever managed to find and sweep this key! Thank you for taking the time to check out my code, you are awesome :-)
		*/
		//Only used to pass as a prop to SweepPrivateKey when sweeping a private key.
		privateKey: "",
		
		address: "",
		amount: 0,
		optionSelected: "",
		transactionsAreExpanded: false,
		loadingMessage: "",
		loadingProgress: 0,
		loadingTransactions: true,
		loadingAnimationName: "moonshine",
		isAnimating: false
	};
	
	setExchangeRate = async ({selectedCrypto = "bitcoin", selectedCurrency = "usd", selectedService = "coingecko"} = {}) => {
		//const start = this.props.transaction.feeTimestamp;
		//const end = new Date();
		//const difference = getDifferenceBetweenDates({ start, end });
		//if (!this.props.transaction.feeTimestamp || difference > 10) {
		const exchangeRate = await getExchangeRate({selectedCrypto, selectedCurrency, selectedService});
		if (exchangeRate.error === false) {
			this.props.updateWallet({
				exchangeRate: {
					...this.props.wallet.exchangeRate,
					[selectedCrypto]: exchangeRate.data
				}
			});
		}
		//}
	};
	
	onCoinPress = async ({coin = "bitcoin", walletId = "wallet0", initialLoadingMessage = ""} = {}) => {
		try {
			const sameCoin = this.props.wallet.selectedCrypto === coin;
			const sameWallet = this.props.wallet.selectedWallet === walletId;
			if (sameCoin && sameWallet) {
				this.resetView();
				return;
			}
			
			this.updateItem({
				stateId: "displaySelectCoin",
				opacityId: "selectCoinOpacity",
				display: false,
				duration: 200
			});
			
			const network = getNetworkType(coin);
			await this.props.updateWallet({selectedCrypto: coin, network, selectedWallet: walletId});
			
			if (this.props.wallet.wallets[walletId].addresses[coin].length > 0) {
				//This condition occurs when the user selects a coin that already has generated addresses from the "SelectCoin" view.
				this.updateItem({stateId: "displayLoading", opacityId: "loadingOpacity", display: false});
				this.resetView();
			} else {
				//This condition occurs when the user selects a coin that does not have any addresses from the "SelectCoin" view.
				if (initialLoadingMessage) {
					this.setState({
						loadingMessage: initialLoadingMessage,
						loadingProgress: 0.3,
						loadingAnimationName: coin
					});
				} else {
					this.setState({
						loadingMessage: `Switching to ${capitalize(coin)} for Wallet ${this.props.wallet.wallets[walletId].name || this.getWalletName()}`,
						loadingProgress: 0.3,
						loadingAnimationName: coin
					});
				}
				this.updateItem({stateId: "displayLoading", opacityId: "loadingOpacity", display: true});
				InteractionManager.runAfterInteractions(async () => {
					await this.refreshWallet({reconnectToElectrum: !sameCoin});
					this.resetView();
				});
				return;
			}
			InteractionManager.runAfterInteractions(() => {
				if (this.state.loadingTransactions !== true) this.setState({loadingTransactions: true});
				this.refreshWallet({reconnectToElectrum: !sameCoin});
			});
		} catch (e) {
			this.resetView();
		}
	};
	
	//TODO: Remove this in version 1.0.0
	retainPreviousDerivationPath = async () => {
		const retainPath = async () => {
			try {
				let wallets = {};
				//Retain the old paths for all existing wallets.
				await Promise.all(this.props.wallet.walletOrder.map(async (wallet) => {
					try {
						wallets[wallet] = {
							...this.props.wallet.wallets[wallet],
							coinTypePath: {
								...defaultWalletShape.coinTypePath,
								litecoin: "0",
								litecoinTestnet: "1"
							}
						};
					} catch (e) {}
				}));
				await this.props.updateWallet({
					...this.props.wallet,
					wallets
				});
			} catch (e) {}
		};
		return new Promise(async (resolve) => {
			try {
				const {selectedWallet} = this.props.wallet;
				if (this.props.wallet.wallets[selectedWallet]["coinTypePath"]) return resolve({error: false});
				await retainPath();
				resolve({error: false});
			} catch (e) {
				await retainPath();
				resolve({error: false});
			}
		});
	};
	
	isNewVersion = () => {
		try {
			if (version === this.props.settings.version) return false;
			this.props.updateSettings({ version });
			return true;
		} catch (e) {
			try {this.props.updateSettings({ version });} catch (e) {}
			return true;
		}
	};
	
	launchDefaultFuncs = async ({displayLoading = true, resetView = true} = {}) => {
		this.authenticating = false;
		const items = [
			{stateId: "displayBiometrics", opacityId: "biometricsOpacity", display: false},
			{stateId: "displayPin", opacityId: "pinOpacity", display: false},
			{stateId: "displayLoading", opacityId: "loadingOpacity", display: displayLoading}
		];
		await this.updateItems(items);
		
		//Determine if the user has any existing wallets. Create a new wallet if so.
		let walletLength = 0;
		try {
			walletLength = this.props.wallet.walletOrder.length;
		} catch (e) {
		}
		if (walletLength < 1) {
			this.createWallet("wallet0", true);
			return;
		}
		
		//Attempt to migrate to the new derivation path
		await this.retainPreviousDerivationPath();
		
		//Display Welcome modal if a new version has been released.
		if (this.isNewVersion()) this.setState({ displayWelcomeModal: true });
		
		try {
			const onBack = () => {
				if (this.state.displayPin || this.state.displayBiometrics || this.state.appHasLoaded === false) return true;
				if (this.state.optionSelected === "send") {
					this.onSendPress();
					return true;
				}
				this.resetView();
				return true;
			};
			//Setup BackHandler for Android
			BackHandler.addEventListener("hardwareBackPress", onBack);
			//BackHandler.addEventListener("hardwareBackPress", this.state.displayPin || this.state.displayBiometrics ? null : this.state.optionSelected === "send" ? this.onSendPress : this.resetView);
			//Start listener to detect if the app is in the background or foreground
			AppState.addEventListener("change", this._handleAppStateChange);
			//Setup Layout Animation for Android
			if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
		} catch (e) {
		}
		
		this.startDate = new Date();
		clearInterval(this._refreshWallet);
		
		this.setState({loadingMessage: "Fetching Network Status", loadingProgress: 0.35, appHasLoaded: true});
		/*
		 Clear or Reset any pending transactions to start from a clean slate.
		 &&
		 Set user's online status
		 */
		const isConnected = await isOnline();
		await Promise.all([this.props.resetTransaction(), this.props.updateUser({isOnline: isConnected})]);
		
		//If online, connect to an electrum server.
		if (isConnected) {
			//Push user to the default view while the rest of the wallet data loads.
			if (resetView) await this.resetView();
			this.refreshWallet({ignoreLoading: !displayLoading});
		} else {
			//Device is offline. Ensure any loading animations are disabled.
			await pauseExecution();
			//Push user to the default view.
			if (resetView) await this.resetView();
			InteractionManager.runAfterInteractions(() => {
				if (this.state.loadingTransactions !== false) this.setState({loadingTransactions: false});
			});
		}
	};
	
	refreshWallet = async ({ignoreLoading = false, reconnectToElectrum = true, skipSubscribeActions = false} = {}) => {
		//This helps to prevent the app from disconnecting and stalling when attempting to connect to an electrum server after some time.
		//await nodejs.start("main.js");
		
		try {
			
			if (this.headersAreSubscribed === false && skipSubscribeActions === true) {
				skipSubscribeActions = false;
			}
			if (reconnectToElectrum === true && this.headersAreSubscribed === true) {
				this.headersAreSubscribed = false;
				skipSubscribeActions = false;
			}
			
			//Enable the loading state
			if (this.state.loadingTransactions !== true) this.setState({loadingTransactions: true});
			const {selectedWallet, selectedCrypto, selectedCurrency} = this.props.wallet;
			const {selectedService} = this.props.settings;
			const keyDerivationPath = this.props.wallet.wallets[selectedWallet].keyDerivationPath[selectedCrypto];
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			
			//Check if the user is online and connected.
			const isConnected = await isOnline();
			if (this.props.user.isOnline) {
				//Ensure the user is still online
				if (!isConnected) {
					//Device is offline. Ensure any loading animations are disabled.
					await Promise.all([this.props.updateUser({isOnline: isConnected})]);
					if (this.state.loadingTransactions !== false) this.setState({loadingTransactions: false});
					alert("Your device is currently offline. Please check your network connection and try again.");
					return;
				}
			} else {
				//Check the users connection again and pull them out of offline status if they are back online.
				if (isConnected) {
					this.props.updateUser({isOnline: isConnected});
				} else {
					this.setState({loadingTransactions: false});
					return;
				}
			}
			
			this.setExchangeRate({selectedCrypto, selectedService, selectedCurrency}); //Set the exchange rate for the selected currency
			//Update status of the user-facing loading message and progress bar
			if (!ignoreLoading) this.setState({
				loadingMessage: "Connecting to Electrum Server...",
				loadingProgress: 0.4
			});
			if (reconnectToElectrum) {
				//Spin up electrum, connect to a peer & start Electrum's keep-alive function;
				//Returns: { customPeers: [], data: { host: "" port: 443 }, error: false, method: "connectToPeer" }
				const electrumStartResponse = await this.restartElectrum({coin: selectedCrypto});
				if (electrumStartResponse.error === false) {
					//Set the current electrum peer.
					this.props.updateSettings({currentPeer: electrumStartResponse.data});
				} else {
					//The device is considered offline if it is unable to connect to an electrum server. Ensure any loading animations are disabled.
					await Promise.all([this.props.updateUser({isOnline: false})]);
					if (this.state.loadingTransactions !== false) this.setState({loadingTransactions: false});
					alert("Unable to connect to an electrum server at this time. Please check your connection and try again.");
					return;
				}
				//Remove any pre-existing instance of this._refreshWallet
				clearInterval(this._refreshWallet);
				
				//Set an interval to update the exchange rate approximately every 2 minutes.
				this._refreshWallet = setInterval(async () => {
					this.setExchangeRate({selectedCrypto, selectedService, selectedCurrency}); //Set the exchange rate for the selected currency
				}, 60 * 2000);
			}
			
			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({
				loadingMessage: "Getting Current Block Height & Exchange Rate...",
				loadingProgress: 0.5
			});
			
			//Gather existing addresses, changeAddresses and their respective indexes for use later on
			let addresses = [];
			try {
				addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto];
			} catch (e) {
			}
			let changeAddresses = [];
			try {
				changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto];
			} catch (e) {
			}
			
			let addressIndex = this.props.wallet.wallets[selectedWallet].addressIndex[selectedCrypto];
			let changeAddressIndex = this.props.wallet.wallets[selectedWallet].changeAddressIndex[selectedCrypto];
			
			/*
			 //Rescan Addresses if user is waiting for any pending transactions
			 await Promise.all(this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto].map((add, i) => {
			 if (add.block <= 0 && i < addressIndex) addressIndex = i;
			 }));
			 //Rescan Change Addresses if user is waiting for any pending transactions
			 await Promise.all(this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto].map((add, i) => {
			 if (add.block <= 0 && i < changeAddressIndex) changeAddressIndex = i;
			 }));
			 */
			
			//Gather existing utxo's for use later on
			let utxos = [];
			try {
				utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto] || [];
			} catch (e) {
			}
			
			//Specify the threshold at which the app will continue searching empty addresses before giving up.
			//const indexThreshold = addresses.length < 20 ? addresses.length-1 : 20;
			
			
			//Get & Set Current Block Height
			await this.props.updateBlockHeight({selectedCrypto});
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			if (!skipSubscribeActions && !this.headersAreSubscribed) {
				this.headersAreSubscribed = true;
				this.subscribeHeader();
			}
			
			let utxoLength = 1;
			try {
				utxoLength = utxos.length;
			} catch (e) {
			}
			
			//Update the recommended fee for the selected coin.
			const transactionSize = getTransactionSize(utxoLength, 2);
			this.props.getRecommendedFee({coin: this.props.wallet.selectedCrypto, transactionSize});
			
			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({
				loadingMessage: "Generating Addresses,\nUpdating Transactions.\nThis may take a while...",
				loadingProgress: 0.65
			});
			
			//This function loads up the user's transaction history for the transaction list, gathers the wallet's next available addresses/changeAddresses and creates more as needed
			//TODO: This function is way too large/multipurpose and needs to be broken up for easier use and testing.
			
			await this.props.getNextAvailableAddress({
				addresses,
				changeAddresses,
				addressIndex,
				changeAddressIndex,
				indexThreshold: 1,
				currentBlockHeight,
				selectedCrypto,
				selectedWallet,
				wallet: selectedWallet,
				customPeers: this.props.settings.customPeers[selectedCrypto],
				keyDerivationPath,
				addressType
			});
			
			//Subscribe to received transactions for the next available address
			if (!skipSubscribeActions) this.subscribeAddress();
			
			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({loadingMessage: "Updating UTXO's", loadingProgress: 0.8});
			
			//Fetch any new utxos.
			//Re-gather all known addresses and changeAddresses in case more were created from the getNextAvailableAddress function.
			addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto];
			changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto];
			
			//Scan all addresses & changeAddresses for UTXO's and save them.
			//Note: The app uses the saved UTXO response to verify/update the wallet's balance.
			const resetUtxosResponse = await this.props.resetUtxos({
				addresses,
				changeAddresses,
				currentUtxos: utxos,
				selectedCrypto,
				selectedWallet,
				wallet: selectedWallet,
				currentBlockHeight
			});
			//Iterate over the new utxos and rescan the transactions if a utxo with a new hash appears
			let needsToRescanTransactions = false;
			addressIndex = this.props.wallet.wallets[selectedWallet].addressIndex[selectedCrypto];
			changeAddressIndex = this.props.wallet.wallets[selectedWallet].changeAddressIndex[selectedCrypto];
			await Promise.all(resetUtxosResponse.data.utxos.map(async (newUtxo) => {
				let noHashMatches = true;
				await Promise.all(this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto].map((transaction) => {
					try {
						if (newUtxo.tx_hash === transaction.hash) {
							noHashMatches = false;
						}
					} catch (e) {
					}
					
				}));
				//If the transactions need to be rescanned set the index. Use the lowest index based on the results.
				if (noHashMatches) {
					try {
						needsToRescanTransactions = true;
						const path = newUtxo.path; // m/49'/1'/0'/1/6
						const pathInfo = await getInfoFromAddressPath(path);
						if (pathInfo.isChangeAddress) {
							if (Number(pathInfo.addressIndex) < changeAddressIndex) changeAddressIndex = pathInfo.addressIndex;
						} else {
							if (Number(pathInfo.addressIndex) < addressIndex) addressIndex = pathInfo.addressIndex;
						}
					} catch (e) {
					}
				}
			}));
			
			//Check if any transactions have <1 confirmations. If so, rescan them by the lowest index.
			let transactionsThatNeedRescanning = [];
			await Promise.all(this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto].map((transaction) => {
				if (transaction.block <= 0) {
					needsToRescanTransactions = true;
					transactionsThatNeedRescanning.push(transaction);
				}
			}));
			
			const transactions = this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto];
			//Get lowest index to rescan addresses & changeAddresses with.
			await Promise.all(
				transactionsThatNeedRescanning.map(async (transaction) => {
					try {
						try {
							const path = transaction.path;
							const pathInfo = await getInfoFromAddressPath(path);
							
							if (!pathInfo.error) {
								//Check the path's index and save the lowest value.
								if (pathInfo.isChangeAddress) {
									if (Number(pathInfo.addressIndex) < changeAddressIndex) changeAddressIndex = pathInfo.addressIndex === 0 ? 0 : pathInfo.addressIndex - 1;
								} else {
									if (Number(pathInfo.addressIndex) < addressIndex) addressIndex = pathInfo.addressIndex === 0 ? 0 : pathInfo.addressIndex - 1;
								}
							} else {
								changeAddressIndex = changeAddressIndex === 0 ? 0 : changeAddressIndex - 1;
								addressIndex = addressIndex === 0 ? 0 : addressIndex - 1;
							}
						} catch (e) {
							changeAddressIndex = changeAddressIndex === 1 ? 0 : changeAddressIndex - 2;
							addressIndex = addressIndex === 1 ? 0 : addressIndex - 2;
						}
						
						
						//Check for potentially RBF'd transactions that need removing.
						const result = await electrum.getTransaction({
							id: Math.random(),
							txHash: transaction.hash,
							coin: selectedCrypto
						});
						
						//If error, remove the transaction from the list of transactions
						if (result.error === true && result.data.code) {
							try {
								let rbfData = this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto];
								const savedTransactions = await Promise.all(transactions.filter((tx) => tx.hash !== transaction.hash));
								//Delete any RBF data for the given hash if it exists.
								try {
									if (rbfData[transaction.hash]) delete rbfData[transaction.hash];
								} catch (e) {
								}
								const wallet = this.props.wallet.wallets[selectedWallet];
								await this.props.updateWallet({
									...this.props.wallet,
									wallets: {
										...this.props.wallet.wallets,
										[selectedWallet]: {
											...wallet,
											transactions: {
												...wallet.transactions,
												[selectedCrypto]: savedTransactions
											},
											rbfData: {
												...wallet.rbfData,
												[selectedCrypto]: rbfData
											}
										}
									}
								});
							} catch (e) {
								console.log(e);
							}
						}
						
					} catch (e) {
					}
				})
			);
			//Clear RBF Data if there are no 0-conf sent transactions.
			try {
				if (transactionsThatNeedRescanning.length === 0 && Object.entries(this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto]).length !== 0 && this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto].constructor === Object) {
					this.props.updateRbfData({wallet: selectedWallet, selectedCrypto});
				}
			} catch (e) {
			}
			
			/*
			 let transactionPathsThatNeedRescanning = [];
			 await Promise.all(this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto].map((transaction) => {
			 if (transaction.block <= 0) {
			 needsToRescanTransactions = true;
			 transactionPathsThatNeedRescanning.push(transaction.path);
			 }
			 }));
			 await Promise.all(
			 transactionPathsThatNeedRescanning.map(async (path) => {
			 const pathInfo = await getInfoFromAddressPath(path);
			 if (pathInfo.isChangeAddress) {
			 if (Number(pathInfo.addressIndex) < changeAddressIndex) changeAddressIndex = pathInfo.addressIndex;
			 } else {
			 if (Number(pathInfo.addressIndex) < addressIndex) addressIndex = pathInfo.addressIndex;
			 }
			 })
			 );
			 */
			
			//Begin Rescan of transactions if necessary based on the saved path indexes.
			let getNextAvailableAddressResponse = {error: false, data: []};
			if (needsToRescanTransactions) {
				getNextAvailableAddressResponse = await this.props.getNextAvailableAddress({
					addresses,
					changeAddresses,
					addressIndex,
					changeAddressIndex,
					indexThreshold: 1,
					currentBlockHeight,
					selectedCrypto,
					selectedWallet,
					wallet: selectedWallet,
					customPeers: this.props.settings.customPeers[selectedCrypto],
					keyDerivationPath,
					addressType
				});
			}
			
			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({loadingMessage: "Updating Balance", loadingProgress: 1});
			
			//If there was no issue fetching the UTXO sets or the next available addresses, update the balance using the newly acquired UTXO's.
			if (resetUtxosResponse.error === false && getNextAvailableAddressResponse.error === false) {
				try {
					utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto] || [];
					const blacklistedUtxos = this.props.wallet.wallets[selectedWallet].blacklistedUtxos[selectedCrypto];
					await this.props.updateBalance({
						utxos,
						blacklistedUtxos,
						selectedCrypto,
						selectedWallet,
						wallet: selectedWallet
					});
				} catch (e) {
					console.log(e);
				}
			}
			
			//Subscribe to received transactions for the next available address
			if (!skipSubscribeActions) this.subscribeAddress();
			//Cease the loading state.
			InteractionManager.runAfterInteractions(() => {
				if (this.state.loadingTransactions !== false) this.setState({loadingTransactions: false});
			});
		} catch (e) {
			console.log(e);
			InteractionManager.runAfterInteractions(() => {
				if (this.state.loadingTransactions !== false) this.setState({loadingTransactions: false});
			});
		}
	};
	
	//Subscribe to new blocks. Refresh wallet when a new block is found.
	subscribeHeader = async () => {
		try {
			if (this.headersAreSubscribed === true && this.subscribedWithPeer === this.props.settings.currentPeer["host"]) return;
			const { selectedCrypto } = this.props.wallet;
			const onReceive = (data) => {
				try {
					//Refresh the wallet when a new block is detected.
					if (__DEV__) console.log(data);
					this.refreshWallet({ ignoreLoading: true, reconnectToElectrum: false, skipSubscribeActions: true });
				} catch (e) {
					console.log(e);
				}
			};
			electrum.subscribeHeader({ id: Math.random(), coin: selectedCrypto, onReceive });
			this.subscribedWithPeer = this.props.settings.currentPeer["host"];
			this.headersAreSubscribed = true;
		} catch (e) {console.log(e);}
	};
	
	//Subscribe to received transactions for the next available address
	subscribeAddress = async () => {
		try {
			const { selectedCrypto } = this.props.wallet;
			const nextAvailableAddress = this.getNextAvailableAddress();
			if (nextAvailableAddress === this.subscribedAddress) return;
			this.subscribedAddress = nextAvailableAddress;
			if (__DEV__) console.log(`Subscribed to address: ${nextAvailableAddress}`);
			const scriptHash = await electrum.getAddressScriptHash({
				address: nextAvailableAddress,
				coin: selectedCrypto
			});
			const onReceive = async (data) => {
				try {
					//Only refresh the wallet if a new transaction is detected.
					if (Array.isArray(data.data)) {
						vibrate(2000); //Vibrate to notify user.
						this.refreshWallet({ reconnectToElectrum: true }); //Refresh wallet.
						//this.subscribeAddress();
					}
				} catch (e) {
					console.log(e);
				}
			};
			electrum.subscribeAddress({
				id: scriptHash.data,
				address: scriptHash.data,
				coin: selectedCrypto,
				onReceive
			});
		} catch (e) {console.log(e);}
	};
	
	authenticateUserWithBiometrics = () => {
		if (this.authenticating) return;
		this.authenticating = true;
		const optionalConfigObject = {
			unifiedErrors: false // use unified error messages (default false)
		};
		const authenticate = () => {
			TouchID.authenticate("To open Moonshine", optionalConfigObject)
				.then(() => {
					//Hide the retry button on the Biometric Authentication view.
					if (this.state.displayBiometricAuthenticationRetry !== false) this.setState({displayBiometricAuthenticationRetry: false});
					//Forward the user to the Pin view if they've enabled it. Otherwise, forward them to the app via launchDefaultFuncs.
					if (this.props.settings.pin) {
						//Transition to the pin view.
						this.onPinPress();
						return;
					}
					this.launchDefaultFuncs();
				})
				.catch(() => {
					//Display the retry button on the Biometric Authentication view in case they hit cancel or encountered some other error during the authentication process.
					if (this.state.displayBiometricAuthenticationRetry !== true) this.setState({displayBiometricAuthenticationRetry: true});
				});
		};
		//Ensure Biometric authentication via Face or Touch ID is supported.
		TouchID.isSupported(optionalConfigObject)
			.then(biometryType => {
				// Success code
				if (biometryType === "FaceID") {
					authenticate(); //FaceID is supported.
				} else {
					authenticate(); //TouchID is supported.
				}
			})
			.catch(() => {
			});
	};
	
	createWallet = async (walletName = "wallet0", ignoreAddressCheck = false) => {
		try {
			const {selectedCrypto} = this.props.wallet;
			const items = [
				{stateId: "displayBiometrics", opacityId: "biometricsOpacity", display: false},
				{stateId: "displayPin", opacityId: "pinOpacity", display: false},
				{stateId: "displayLoading", opacityId: "loadingOpacity", display: true}
			];
			await this.updateItems(items);
			await this.props.updateWallet({selectedCrypto: "bitcoin"});
			
			//Figure out what type of security/authentication is allowed for settings.
			let biometricsIsSupported = false;
			let biometricTypeSupported = "";
			const optionalConfigObject = {
				unifiedErrors: false // use unified error messages (default false)
			};
			TouchID.isSupported(optionalConfigObject)
				.then(biometryType => {
					biometricsIsSupported = true;
					// Success code
					if (biometryType === "FaceID") {
						biometricTypeSupported = "FaceID";
					} else {
						biometricTypeSupported = "TouchID";
					}
					this.props.updateSettings({biometricsIsSupported, biometricTypeSupported});
				})
				.catch(() => {
					this.props.updateSettings({biometricsIsSupported, biometricTypeSupported});
				});
			
			//Create Wallet if first timer
			this.setState({loadingMessage: "Creating Wallet...", loadingProgress: 0.1});
			await this.props.createWallet({
				addressAmount: 2,
				changeAddressAmount: 2,
				wallet: walletName,
				generateAllAddresses: true
			});
			//Add wallet name to the walletOrder array;
			let walletOrder = [];
			try {
				walletOrder = this.props.wallet.walletOrder.concat(walletName);
			} catch (e) {
				walletOrder = [walletName];
			}
			//Set the selectedWallet accordingly and update the wallets array.
			await this.props.updateWallet({selectedWallet: walletName, walletOrder});
			const {selectedWallet} = this.props.wallet;
			this.setState({loadingMessage: "Fetching Current Block Height...", loadingProgress: 0.15});
			let addresses = [];
			try {
				addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto];
			} catch (e) {
			}
			let changeAddresses = [];
			try {
				changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto];
			} catch (e) {
			}
			if (ignoreAddressCheck === false) {
				//Spin up the nodejs thread and connect to electrum.
				//await nodejs.start("main.js");
				//await electrum.stop({ coin: selectedCrypto });
				await this.restartElectrum({coin: selectedCrypto});
				//Get Current Block Height
				await this.props.updateBlockHeight({selectedCrypto});
				const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
				
				this.setState({loadingMessage: "Syncing...", loadingProgress: 0.15});
				//Load up the user's transaction history and next available addresses
				await this.props.getNextAvailableAddress({
					addresses,
					changeAddresses,
					indexThreshold: 1,
					selectedCrypto,
					selectedWallet,
					currentBlockHeight,
					wallet: selectedWallet
				});
				this.setState({
					loadingMessage: "Finished Creating Wallet",
					loadingProgress: 0.3,
					loadingAnimationName: "moonshine"
				});
			}
			this.launchDefaultFuncs({displayLoading: false});
		} catch (e) {
		}
	};
	
	_handleAppStateChange = async (nextAppState) => {
		//Foreground -> Background
		if (this.state.appState.match(/active/) && nextAppState.match(/inactive|background/) && !this.state.displayCamera) {
			if (this.authenticating) return;
			electrum.stop({coin: this.props.wallet.selectedCrypto});
			//Clear/Remove Wallet Refresh Timer
			clearInterval(this._refreshWallet);
			if (this.state.appHasLoaded !== false) this.setState({appHasLoaded: false});
		}
		//Background -> Foreground
		if (this.state.appState.match(/inactive|background/) && nextAppState === "active" && !this.state.displayCamera) {
			this.setState({appState: nextAppState});
			//Return if the desired app state and components are already set.
			if (this.state.displayBiometrics || this.state.displayPin || this.authenticating) return;
			try {
				//Check if Biometrics is Enabled
				if (this.props.settings.biometrics) {
					this.onBiometricsPress();
					return;
				}
			} catch (e) {}
			
			try {
				//Check if Pin is Enabled
				if (this.props.settings.pin) {
					this.onPinPress();
					return;
				}
			} catch (e) {}
			
			try {
				//Resume normal operations
				this.launchDefaultFuncs({displayLoading: false, resetView: false});
			} catch (e) {}
		}
		if (this.state.appState !== nextAppState) this.setState({appState: nextAppState});
	};
	
	async componentDidMount() {
		//This gets called after redux-persist rehydrates
		
		//Spin up the nodejs thread
		await nodejs.start("main.js");
		
		InteractionManager.runAfterInteractions(async () => {
			try {
				//Check if Biometrics is Enabled
				if (this.props.settings.biometrics) {
					this.onBiometricsPress();
					return;
				}
				
				//Check if Pin is Enabled
				if (this.props.settings.pin) {
					this.onPinPress();
					return;
				}
				
				//Resume normal operations
				this.launchDefaultFuncs();
			} catch (e) {
				console.log(e);
			}
		});
	}
	
	componentDidUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}
	
	shouldComponentUpdate(nextProps, nextState) {
		try {
			return nextProps.wallet !== this.props.wallet || nextState !== this.state;
		} catch (e) {
			return false;
		}
	}
	
	componentWillUnmount() {
		try {
			//Stop Electrum Process
			electrum.stop({coin: this.props.wallet.selectedCrypto});
			//Remove Back Button Listener
			BackHandler.removeEventListener("hardwareBackPress", this.resetView);
			//Start the listener that detects if the app is in the background or foreground
			AppState.removeEventListener("change", this._handleAppStateChange);
			//Clear/Remove Wallet Refresh Timer
			clearInterval(this._refreshWallet);
		} catch (e) {
		}
	}
	
	//Handles The "upper" & "lower" Flex Animation
	updateFlex = ({upperContentFlex = 1, lowerContentFlex = 1, duration = 250} = {}) => {
		return new Promise(async (resolve) => {
			try {
				Animated.parallel([
					Animated.timing(
						this.state.upperContentFlex,
						{
							toValue: upperContentFlex,
							duration: duration,
							easing: Easing.inOut(Easing.ease)
						}
					),
					Animated.timing(
						this.state.lowerContentFlex,
						{
							toValue: lowerContentFlex,
							duration: duration,
							easing: Easing.inOut(Easing.ease)
						}
					)
				]).start(() => {
					//Perform any other action after the update has been completed.
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({error: true, data: e});
			}
		});
	};
	
	updateItems = (items = []) => {
		//items = [{ stateId: "", opacityId: "", display: false, duration: 400, onComplete: null }]
		return new Promise(async (resolve) => {
			try {
				let itemsToDisplay = {isAnimating: true};
				let itemsToHide = {isAnimating: false};
				let animations = [];
				let onCompleteFuncs = [];
				
				await Promise.all(items.map(async ({stateId = "", opacityId = "", display = false, duration = 400, onComplete = null} = {}) => {
					try {
						//Handle Opacity Animations
						
						//Return if the desired value is already set for the given stateId
						if (this.state[stateId] === display) return;
						
						//Push all onComplete functions into an array to call once the animation completes
						try {
							if (typeof onComplete === "function") onCompleteFuncs.push(onComplete);
						} catch (e) {
						}
						try {
							//Set the items to display and hide in the appropriate object.
							if (display) {
								itemsToDisplay = {...itemsToDisplay, [stateId]: display};
							} else {
								itemsToHide = {...itemsToHide, [stateId]: display};
							}
							
							//Construct and push each animation to the animations array.
							animations.push(
								Animated.timing(
									this.state[opacityId],
									{
										toValue: display ? 1 : 0,
										duration,
										easing: Easing.inOut(Easing.ease),
										useNativeDriver: true
									}
								),
							);
						} catch (e) {
						}
					} catch (e) {
					}
				}));
				
				//Display necessary items
				if (Object.entries(itemsToDisplay).length !== 0 && itemsToDisplay.constructor === Object) this.setState(itemsToDisplay);
				
				//Start Animations.
				Animated.parallel(animations).start(async () => {
					//Perform any other action after the update has been completed.
					
					//Hide necessary items
					if (Object.entries(itemsToHide).length !== 0 && itemsToHide.constructor === Object) this.setState(itemsToHide);
					
					//Call all onComplete functions
					onCompleteFuncs.map((onComplete) => {
						try {
							onComplete();
						} catch (e) {
						}
					});
					resolve({error: false});
				});
				
			} catch (e) {
				console.log(e);
				resolve({error: true, data: e});
			}
		});
	};
	
	updateItem = ({stateId = "", opacityId = "", display = true, duration = 400, endToEndAnimation = true} = {}) => {
		if (this.state[stateId] === display) return;
		return new Promise(async (resolve) => {
			try {
				if (endToEndAnimation) {
					if (display) this.setState({[stateId]: display});
				} else {
					this.setState({[stateId]: display});
				}
				Animated.timing(
					this.state[opacityId],
					{
						toValue: display ? 1 : 0,
						duration,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display && endToEndAnimation) this.setState({[stateId]: display});
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({error: true});
			}
		});
	};
	
	//Handles the series of animations necessary when the user taps "Send"
	onSendPress = async ({ address = "", amount = 0 } = {}) => {
		try {
			if (this.state.isAnimating || !this.state.appHasLoaded) return;
			
			if (address || amount) await this.props.updateTransaction({ address, amount });
			
			//Open Send State
			const items = [
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 250},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: true, duration: 600},
				{stateId: "displaySettings", opacityId: "settingsOpacity", display: false},
			];
			this.updateItems(items);
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			InteractionManager.runAfterInteractions(() => {
				if (this.state.optionSelected !== "send") this.setState({optionSelected: "send"});
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary when the user intends to sweep a transaction
	onSweep = async (key = "") => {
		try {
			if (!key) {
				alert("No private key detected.");
				return;
			}
			await this.setState({privateKey: key});
			//Open Send State
			const items = [
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true},
				{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 250},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false, duration: 200}
			];
			this.updateItems(items);
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateItems([{
				stateId: "displaySweepPrivateKey",
				opacityId: "sweepPrivateKeyOpacity",
				display: true,
				duration: Platform.OS === "ios" ? 800 : 300
			}]);
			InteractionManager.runAfterInteractions(() => {
				if (this.state.optionSelected !== "send") this.setState({optionSelected: "send"});
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary when the user taps "Receive"
	onReceivePress = async () => {
		if (this.state.isAnimating || !this.state.appHasLoaded) return;
		if (this.state.optionSelected !== "receive") {
			//Open Receive State
			const items = [
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 250},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200},
				{
					stateId: "displayReceiveTransaction",
					opacityId: "receiveTransactionOpacity",
					display: true,
					duration: 800
				}
			];
			this.updateItems(items);
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			InteractionManager.runAfterInteractions(() => {
				if (this.state.optionSelected !== "receive") this.setState({optionSelected: "receive"});
			});
		} else {
			//Close Receive State
			if (this.state.optionSelected !== "") this.setState({optionSelected: ""});
			
			const items = [
				{
					stateId: "displayReceiveTransaction",
					opacityId: "receiveTransactionOpacity",
					display: false,
					duration: 200
				},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false, duration: 100},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: true, duration: 350}
			];
			this.updateItems(items);
			await this.updateFlex();
			this.updateItem({
				stateId: "displayPriceHeader",
				opacityId: "priceHeaderOpacity",
				display: true,
				duration: 350
			});
		}
	};
	
	//Handles the series of animations necessary when the user taps a specific transaction from the TransactionList.
	onTransactionPress = async (transaction = "") => {
		try {
			if (this.state.isAnimating || !this.state.appHasLoaded) return;
			const {selectedWallet, selectedCrypto} = this.props.wallet;
			transaction = await this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto].filter((tx) => tx.hash === transaction);
			await this.props.updateWallet({selectedTransaction: transaction[0]});
			
			const items = [
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true},
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 350},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 400},
				{stateId: "displayTransactionDetail", opacityId: "transactionDetailOpacity", display: true}
			];
			this.updateItems(items);
			this.updateFlex({upperContentFlex: 0, lowerContentFlex: 1, duration: 400});
		} catch (e) {
		}
	};
	
	//Handles the series of animations necessary when the user taps the selected crypto symbol
	onSelectCoinPress = async () => {
		//This prevents any possibility of the user tapping into the view without prior authorization.
		if (this.state.displayLoading || this.state.displayPin || this.state.displayBiometrics || this.state.displayBiometricAuthenticationRetry || this.state.isAnimating || this.state.appHasLoaded === false) return;
		if (!this.state.displaySelectCoin) {
			//Open SelectCoin State
			const items = [
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true, duration: 500},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 300},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200},
				{stateId: "displayReceiveTransaction", opacityId: "receiveTransactionOpacity", display: false},
				{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: true, duration: 600}
			];
			await Promise.all([
				this.updateItems(items),
				this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0})
			]);
		} else {
			//Close SelectCoin State
			const items = [
				{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: false},
				{
					stateId: "displayReceiveTransaction",
					opacityId: "receiveTransactionOpacity",
					display: false,
					duration: 200
				},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false, duration: 100},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: true, duration: 350}
			];
			await Promise.all([
				this.updateItems(items),
				this.updateFlex()
			]);
		}
	};
	
	//Handles the series of animations necessary when the user taps the Camera icon.
	onCameraPress = async () => {
		try {
			if (this.state.isAnimating || !this.state.appHasLoaded) return;
			//Open Receive State
			const items = [
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayReceiveTransaction", opacityId: "receiveTransactionOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200}
			];
			await Promise.all([
				this.updateItem({
					stateId: "displayPriceHeader",
					opacityId: "priceHeaderOpacity",
					display: false,
					duration: 200,
					endToEndAnimation: true
				}),
				this.updateItem({
					stateId: "displayCameraRow",
					opacityId: "cameraRowOpacity",
					display: false,
					duration: 200,
					endToEndAnimation: true
				}),
				this.updateItems(items),
				this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0})
			]);
			this.updateItem({stateId: "displayCamera", opacityId: "cameraOpacity", display: true});
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary when the user taps the Settings icon.
	onSettingsPress = async () => {
		try {
			if (this.state.isAnimating || !this.state.appHasLoaded) return;
			//Open Receive State
			const items = [
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 350},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayReceiveTransaction", opacityId: "receiveTransactionOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false},
				{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false, duration: 200},
				{stateId: "displaySettings", opacityId: "settingsOpacity", display: true, duration: 600}
			];
			await Promise.all([
				this.updateItems(items),
				this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0})
			]);
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary to transition the view to handle Biometrics.
	onBiometricsPress = async () => {
		try {
			const items = [
				{stateId: "displayReceiveTransaction", opacityId: "receiveTransactionOpacity", display: false},
				{stateId: "displaySettings", opacityId: "settingsOpacity", display: false},
				{stateId: "displayTransactionDetail", opacityId: "transactionDetailOpacity", display: false},
				{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: false},
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false},
				{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
				{stateId: "displayLoading", opacityId: "loadingOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false}
			];
			this.updateItems(items);
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateItems([{
				stateId: "displayBiometrics",
				opacityId: "biometricsOpacity",
				display: true,
				onComplete: this.authenticateUserWithBiometrics
			}]);
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary to transition the view to handle Pin.
	onPinPress = async () => {
		try {
			const items = [
				{stateId: "displayReceiveTransaction", opacityId: "receiveTransactionOpacity", display: false},
				{stateId: "displaySettings", opacityId: "settingsOpacity", display: false},
				{stateId: "displayTransactionDetail", opacityId: "transactionDetailOpacity", display: false},
				{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: false},
				{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 250},
				{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false},
				{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false},
				{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
				{stateId: "displayLoading", opacityId: "loadingOpacity", display: false},
				{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: false},
				{stateId: "displayBiometrics", opacityId: "biometricsOpacity", display: false}
			];
			this.updateItems(items);
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateItem({stateId: "displayPin", opacityId: "pinOpacity", display: true});
		} catch (e) {
			console.log(e);
		}
	};
	
	//Handles the series of animations necessary to revert the view back to it's original layout.
	resetView = async () => {
		if (this.state.isAnimating) return;
		const items = [
			{stateId: "displayTransactionList", opacityId: "transactionListOpacity", display: true},
			{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: true},
			{stateId: "displayCamera", opacityId: "cameraOpacity", display: false},
			{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false, duration: 100},
			{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false, duration: 200},
			{stateId: "displaySweepPrivateKey", opacityId: "sweepPrivateKeyOpacity", display: false, duration: 200},
			{
				stateId: "displayReceiveTransaction",
				opacityId: "receiveTransactionOpacity",
				display: false,
				duration: 200
			},
			{stateId: "displaySettings", opacityId: "settingsOpacity", display: false, duration: 200},
			{stateId: "displayTransactionDetail", opacityId: "transactionDetailOpacity", display: false, duration: 200},
			{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: false, duration: 200},
			{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: true, duration: 600}
		];
		await Promise.all([
			this.updateItem({
				stateId: "displayLoading",
				opacityId: "loadingOpacity",
				display: false,
				duration: 200,
				endToEndAnimation: false
			}),
			this.updateItems(items),
			this.updateFlex({duration: 400})
		]);
		InteractionManager.runAfterInteractions(() => {
			this.props.updateWallet({selectedTransaction: ""});
			this.setState({
				optionSelected: "",
				transactionsAreExpanded: false,
				loadingAnimationName: "loader",
				privateKey: ""
			});
		});
	};
	
	//Handles the series of animations necessary for the user to expand the transaction list.
	expandTransactions = () => {
		this.setState({transactionsAreExpanded: true});
		const items = [
			{stateId: "displayXButton", opacityId: "xButtonOpacity", display: true},
			{stateId: "displayCameraRow", opacityId: "cameraRowOpacity", display: false, duration: 200},
			{stateId: "displayPriceHeader", opacityId: "priceHeaderOpacity", display: false, duration: 350},
			{stateId: "displayTextInput", opacityId: "textInputOpacity", display: false}
		];
		this.updateItems(items);
		this.updateFlex({upperContentFlex: 0, lowerContentFlex: 1});
	};
	
	//Handles any action that requires the Keyboard to be dismissed.
	dismissKeyboard = async () => {
		Keyboard.dismiss();
	};
	
	restartElectrum = ({coin = ""} = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (!coin) resolve({error: true, data: {}});
				
				//This helps to prevent the app from disconnecting and stalling when attempting to connect to an electrum server after some time.
				//await nodejs.start("main.js");
				
				//Disconnect from the currently connected Electrum server. Not entirely sure if this is necessary, but it seems to prevent the app from stalling in certain scenarios.
				try {
					//await electrum.stop({ coin });
				} catch (e) {
				}
				
				try {
					let hasPeers = false;
					let hasCustomPeers = false;
					try {
						if (Array.isArray(this.props.settings.peers[coin]) && this.props.settings.peers[coin].length) hasPeers = true;
					} catch (e) {
					}
					try {
						if (Array.isArray(this.props.settings.customPeers[coin]) && this.props.settings.customPeers[coin].length) hasCustomPeers = true;
					} catch (e) {
					}
					
					if (!hasPeers && !hasCustomPeers) {
						//Attempt to retrieve a list of peers from the default servers.
						const startResponse = await electrum.start({
							coin,
							peers: [],
							customPeers: []
							
						});
						if (startResponse.error === true) {
							resolve(startResponse);
							return;
						}
						const peers = await electrum.getPeers({coin});
						await this.props.updatePeersList({peerList: peers.data, coin});
					}
				} catch (e) {
				}
				
				//Connect to an electrum server
				const result = await electrum.start({
					coin,
					peers: this.props.settings.peers[coin],
					customPeers: this.props.settings.customPeers[coin]
					
				});
				resolve(result);
			} catch (e) {
				console.log(e);
			}
		});
	};
	
	_closeBitidModal = () => {
		try {
			this.setState({ displayBitidModal: false, bitidData: { uri: "", host: "" } });
		} catch (e) {}
	};
	
	_closeWelcomeModal = () => {
		try {
			this.setState({ displayWelcomeModal: false });
		} catch (e) {}
	};
	
	_loginWithBitid = async () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const keyDerivationPath = this.props.wallet.wallets[selectedWallet].keyDerivationPath[selectedCrypto];
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			let url = "";
			try {url = this.state.bitidData["uri"];} catch (e) {}
			if (url === "") {
				this._closeBitidModal();
				alert("Invalid URI");
				return;
			}
			await Promise.all([
				loginWithBitid({
					url,
					addressType,
					keyDerivationPath,
					selectedCrypto,
					selectedWallet
				}),
				this.setState({ displayBitidModal: false, bitidData: { uri: "", host: "" } })
			]);
			//Allows the BitidModal enough time to remove itself before removing it's text/content.
			setTimeout(() => {
				this.setState({ bitidData: { uri: "", host: "" } });
			}, 1000);
		} catch (e) {}
	};
	
	//Handles any BarCodeRead action.
	onBarCodeRead = async (data) => {
		try {
			//Determine if we need to import a mnemonic phrase
			if (bip39.validateMnemonic(data)) {
				await this.updateItem({stateId: "displayCamera", opacityId: "cameraOpacity", display: false});
				this.createNewWallet({mnemonic: data});
				return;
			}
			
			//Determine if we need to sweep a private key
			const validatePrivateKeyResults = await validatePrivateKey(data);
			if (validatePrivateKeyResults.isPrivateKey === true) {
				//Remove Camera View
				await this.updateItem({stateId: "displayCamera", opacityId: "cameraOpacity", display: false});
				this.onSweep(data);
				return;
			}
			
			//Check if this is a BitId Request
			if (data.includes("bitid:")) {
				try {
					//Remove Camera & Reset View
					await this.updateItem({stateId: "displayCamera", opacityId: "cameraOpacity", display: false});
					await this.resetView();
					//Present user with the option to sign and send the request.
					const parsedURL = new Url(data);
					this.setState({displayBitidModal: true, bitidData: {uri: data, host: parsedURL.hostname}});
				} catch (e) {alert("Unable to parse Bitid URL.");}
				return;
			}
			
			const qrCodeData = await parsePaymentRequest(data);
			//Throw error if unable to interpret the qrcode data.
			if (qrCodeData.error) {
				await this.updateItem({stateId: "displayCamera", opacityId: "cameraOpacity", display: false});
				await this.resetView();
				alert(`Unable to parse the following data:\n${qrCodeData.data}`);
				return;
			}
			InteractionManager.runAfterInteractions(async () => {
				
				//Switch to proper Electrum Server if the qrcode coin data doesn't match our currently selected coin.
				if (qrCodeData.data.coin !== this.props.wallet.selectedCrypto) {
					const coin = qrCodeData.data.coin;
					await this.props.updateWallet({selectedCrypto: coin});
					//Disconnect from the current electurm server.
					//await electrum.stop({ coin });
					//Connect to the relevant electrum server as per the qrcode data.
					await this.restartElectrum({coin});
				}
				
				//Pass the transaction data forward for use in the SendTransaction component.
				let { address, amount } = qrCodeData.data;
				//Ensure the amount is correctly formatted in sats
				if (amount % 1 !== 0) amount = bitcoinUnits(Number(qrCodeData.data.amount), "BTC").to("satoshi").value();
				//Set amount to 0 if the requested amount is greater than the current balance.
				if (amount > this.getCryptoBalance()) amount = 0;
				this.props.updateTransaction({ address, amount });
				
				//Trigger the onSendPress animation to expose the transaction view.
				this.onSendPress();
			});
		} catch (e) {
			//console.log(e);
		}
	};
	
	//Returns the fiat balance based on the most recent exchange rate of the selected crypto.
	getFiatBalance = () => {
		try {
			const {selectedWallet, selectedCrypto} = this.props.wallet;
			const confirmedBalance = Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]);
			bitcoinUnits.setFiat("usd", Number(this.props.wallet.exchangeRate[selectedCrypto]));
			const fiatBalance = bitcoinUnits(confirmedBalance, "satoshi").to("usd").value().toFixed(2);
			if (isNaN(fiatBalance)) return 0;
			return Number(fiatBalance);
		} catch (e) {
			return 0;
		}
	};
	
	//Returns the confirmed balance of the selected crypto.
	getCryptoBalance = () => {
		let confirmedBalance = 0;
		try {
			const {selectedWallet, selectedCrypto} = this.props.wallet;
			return Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]) || 0;
		} catch (e) {
		}
		return confirmedBalance;
	};
	
	//Returns the next available empty address of the selected crypto.
	getNextAvailableAddress = () => {
		try {
			const {selectedWallet, selectedCrypto} = this.props.wallet;
			const addressIndex = this.props.wallet.wallets[selectedWallet].addressIndex[selectedCrypto];
			return this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto][addressIndex].address;
		} catch (e) {
			//console.log(e);
			return "";
		}
	};
	
	//Returns all transactions for the selected crypto.
	getTransactions = () => {
		try {
			const {selectedWallet, selectedCrypto} = this.props.wallet;
			const transactions = this.props.wallet.wallets[selectedWallet].transactions[selectedCrypto];
			if (Array.isArray(transactions)) {
				return transactions;
			}
			return [];
		} catch (e) {
			//console.log(e);
			return [];
		}
	};
	
	onPinFailure = async () => {
		try {
			await this.createWallet("wallet0", true);
		} catch (e) {
		
		}
	};
	
	createNewWallet = async ({mnemonic = ""} = {}) => {
		try {
			//Add wallet name to wallets array;
			const walletName = await uuidv4();
			let walletOrder = [];
			try {
				walletOrder = this.props.wallet.walletOrder.concat(walletName);
			} catch (e) {
				walletOrder = [walletName];
			}
			//Set Loading Message
			await this.setState({
				loadingMessage: `Creating Wallet ${Object.keys(this.props.wallet.wallets).length} & Generating Addresses`,
				loadingProgress: 0.5
			});
			
			//Close Receive State
			const items = [
				{stateId: "displaySelectCoin", opacityId: "selectCoinOpacity", display: false},
				{stateId: "displaySettings", opacityId: "settingsOpacity", display: false},
				{stateId: "displayXButton", opacityId: "xButtonOpacity", display: false, duration: 100},
				{stateId: "displayLoading", opacityId: "loadingOpacity", display: true}
			];
			await this.updateItems(items);
			
			//Set the selectedWallet accordingly and update the wallets array.
			await this.props.updateWallet({selectedWallet: walletName, walletOrder});
			
			const {selectedCrypto} = this.props.wallet;
			
			await this.props.createWallet({wallet: walletName, mnemonic, generateAllAddresses: mnemonic === ""});
			await this.restartElectrum({coin: selectedCrypto});
			//Get Current Block Height
			this.props.updateBlockHeight({selectedCrypto});
			
			//There's no need to check address/transaction history for new, random mnemonics.
			if (mnemonic !== "") {
				await this.refreshWallet({ignoreLoading: false});
			}
			await this.setState({loadingMessage: "Wallet Created!", loadingProgress: 1});
			await pauseExecution(500);
			this.resetView();
		} catch (e) {
			console.log(e);
		}
	};
	
	getBlacklistedUtxos = () => {
		let blacklistedUtxos = [];
		try {
			blacklistedUtxos = this.props.wallet.wallets[this.props.wallet.selectedWallet].blacklistedUtxos[this.props.wallet.selectedCrypto];
		} catch (e) {
		}
		return blacklistedUtxos;
	};
	
	getWalletName = () => {
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			try {
				if (this.props.wallet.wallets[selectedWallet].name.trim() !== "") return this.props.wallet.wallets[selectedWallet].name;
			} catch (e) {
			}
			try {
				return `Wallet ${this.props.wallet.walletOrder.indexOf(selectedWallet)}`;
			} catch (e) {
			}
		} catch (e) {
			return "?";
		}
	};
	
	hasBackedUpWallet = () => {
		try {
			return this.props.wallet.wallets[this.props.wallet.selectedWallet].hasBackedUpWallet;
		} catch (e) {return false;}
	};
	
	toggleBackupPhrase = async () => {
		try {
			if (this.state.isAnimating || !this.state.appHasLoaded) return;
			const { selectedWallet } = this.props.wallet;
			if (!selectedWallet) return;
			const displayBackupPhrase = this.state.displayBackupPhrase;
			if (!displayBackupPhrase) {
				//Fetch Recovery Phrase
				const keychainResult = await getKeychainValue({key: selectedWallet});
				if (keychainResult.error === true) return;
				const mnemonic = keychainResult.data.password;
				const backupPhrase = mnemonic.split(" ");
				let phrase = [];
				backupPhrase.forEach((word, i) => phrase.push({ id: i+1, word: backupPhrase[i] }));
				await this.setState({ backupPhrase: phrase, displayBackupPhrase: !displayBackupPhrase });
				this.props.updateWallet({
					wallets: {
						...this.props.wallet.wallets,
						[selectedWallet]: {
							...this.props.wallet.wallets[selectedWallet],
							hasBackedUpWallet: true,
							walletBackupTimestamp: moment()
						}
					}
				});
			} else {
				this.setState({backupPhrase: [], displayBackupPhrase: false});
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	render() {
		//return <ElectrumTesting />;
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar backgroundColor={colors.darkPurple} barStyle="light-content" animated={true} />
				<Animated.View style={[styles.upperContent, {flex: this.state.upperContentFlex}]}>
					<LinearGradient
						style={styles.linearGradient}
						colors={["#8e45bf", "#7931ab", "#5e1993", "#59158e"]}
						start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}
					>
						
						<TouchableWithoutFeedback style={{flex: 1}} activeOpacity={1} onPress={this.dismissKeyboard}>
							<View style={{flex: 1}}>
								{this.state.displayPriceHeader &&
								<Animated.View style={[styles.settingsContainer, {
									opacity: this.state.priceHeaderOpacity,
									zIndex: 200
								}]}
								>
									<TouchableOpacity
										style={{paddingTop: 10, paddingRight: 10, paddingLeft: 30, paddingBottom: 30}}
										onPress={this.onSettingsPress}
									>
										<Ionicons name={"ios-cog"} size={30} color={colors.white} />
									</TouchableOpacity>
								</Animated.View>}
								
								{this.state.displayBiometrics &&
								<Animated.View style={[styles.settings, {opacity: this.state.biometricsOpacity}]}>
									<Biometrics
										biometricTypeSupported={this.props.settings.biometricTypeSupported}
										retryAuthentication={this.authenticateUserWithBiometrics}
									/>
								</Animated.View>}
								
								{this.state.displayPin &&
								<Animated.View style={[styles.settings, {opacity: this.state.pinOpacity}]}>
									<PinPad
										updateSettings={this.props.updateSettings}
										wipeDevice={this.props.wipeDevice}
										pinAttemptsRemaining={this.props.settings.pinAttemptsRemaining}
										onSuccess={this.launchDefaultFuncs}
										onFailure={this.onPinFailure}
									/>
								</Animated.View>}
								
								{this.state.displayLoading &&
								<Loading
									loadingOpacity={this.state.loadingOpacity}
									loadingMessage={this.state.loadingMessage}
									loadingProgress={this.state.loadingProgress}
									width={width / 2}
									animationName={this.state.loadingAnimationName}
								/>}
								
								{this.state.displayCamera &&
								<Animated.View style={[styles.camera, {opacity: this.state.cameraOpacity}]}>
									<Camera
										onClose={this.state.optionSelected === "send" ? this.onSendPress : this.resetView}
										onBarCodeRead={this.onBarCodeRead}
									/>
								</Animated.View>}
								
								{this.state.displaySettings &&
								<Animated.View style={[styles.settings, {opacity: this.state.settingsOpacity}]}>
									<Settings
										createNewWallet={this.createNewWallet}
										onBack={this.resetView}
										refreshWallet={this.refreshWallet}
										onSendPress={this.onSendPress}
									/>
								</Animated.View>}
								
								<Animated.View style={[styles.priceHeader, {opacity: this.state.priceHeaderOpacity}]}>
									<TouchableOpacity onPress={this.hasBackedUpWallet() ? this.onSelectCoinPress : this.toggleBackupPhrase} style={{
										position: "absolute",
										top: 0,
										paddingVertical: 5,
										paddingHorizontal: 15,
										backgroundColor: "transparent",
										borderRadius: 10,
										borderColor: this.hasBackedUpWallet() ? "transparent" : colors.white,
										borderWidth: 1.5
									}}
									>
										<Text style={styles.cryptoValue}>{this.hasBackedUpWallet() ? this.getWalletName() : `${this.getWalletName()} is not backed up.\nTap to backup now.`}</Text>
									</TouchableOpacity>
									<Header
										fiatValue={this.getFiatBalance()}
										fiatSymbol={this.props.settings.fiatSymbol}
										cryptoValue={this.getCryptoBalance()}
										cryptoUnit={this.props.settings.cryptoUnit}
										selectedCrypto={this.props.wallet.selectedCrypto}
										selectedWallet={this.props.wallet.selectedWallet}
										exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]}
										isOnline={this.props.user.isOnline}
										onSelectCoinPress={this.onSelectCoinPress}
									/>
								</Animated.View>
								
								{this.state.displayReceiveTransaction &&
								<Animated.View
									style={[styles.ReceiveTransaction, {opacity: this.state.receiveTransactionOpacity}]}
								>
									<ReceiveTransaction
										address={this.getNextAvailableAddress()}
										selectedCrypto={this.props.wallet.selectedCrypto}
										size={200}
									/>
								</Animated.View>}
								
								{this.state.displayTextInput &&
								<Animated.View
									style={[styles.textFormContainer, {opacity: this.state.textInputOpacity}]}
								>
									
									<SendTransaction
										onCameraPress={this.onCameraPress}
										refreshWallet={this.refreshWallet}
										onClose={this.resetView}
									/>
								
								</Animated.View>}
								
								{this.state.displaySweepPrivateKey &&
								<Animated.View
									style={[styles.textFormContainer, {opacity: this.state.sweepPrivateKeyOpacity}]}
								>
									
									<SweepPrivateKey
										privateKey={this.state.privateKey}
										refreshWallet={this.refreshWallet} onClose={this.resetView}
										updateXButton={this.updateItem}
									/>
								
								</Animated.View>}
								
								{this.state.displayCameraRow &&
								<Animated.View style={[styles.cameraRow, {opacity: this.state.cameraRowOpacity}]}>
									<CameraRow
										onSendPress={this.onSendPress}
										onReceivePress={this.onReceivePress}
										onCameraPress={this.onCameraPress}
									/>
								</Animated.View>}
							</View>
						</TouchableWithoutFeedback>
						
						{this.state.displaySelectCoin &&
						<Animated.View style={[styles.selectCoin, {opacity: this.state.selectCoinOpacity}]}>
							<SelectCoin
								wallet={this.props.wallet}
								onCoinPress={this.onCoinPress}
								cryptoUnit={this.props.settings.cryptoUnit}
								updateWallet={this.props.updateWallet}
								deleteWallet={this.props.deleteWallet}
								createNewWallet={this.createNewWallet}
								displayTestnet={this.props.settings.testnet}
							/>
						</Animated.View>}
					
					</LinearGradient>
				</Animated.View>
				
				<Animated.View style={[styles.lowerContent, {flex: this.state.lowerContentFlex}]}>
					
					<View style={{flex: 1}}>
						
						<View style={{flex: 1}}>
							<Animated.View style={{flex: 1, opacity: this.state.transactionListOpacity}}>
								<View style={styles.transactionListHeader}>
									{!this.state.loadingTransactions &&
									<TouchableOpacity onPress={this.refreshWallet} style={styles.refresh}>
										<Ionicons name={"ios-refresh"} size={18} color={colors.darkPurple} />
									</TouchableOpacity>}
									{this.state.loadingTransactions && this.state.displayTransactionList &&
									<View style={styles.refresh}>
										<ActivityIndicator size="small" color={colors.lightPurple} />
									</View>}
									<TouchableOpacity
										onPress={this.state.transactionsAreExpanded ? this.resetView : this.expandTransactions}
										style={[styles.centerContent, { flex: 2 }]}
									>
										<Text style={styles.boldText}>Transactions</Text>
									</TouchableOpacity>
									
									<TouchableOpacity
										onPress={this.state.transactionsAreExpanded ? this.resetView : this.expandTransactions}
										style={styles.expand}
									>
										{this.state.transactionsAreExpanded &&
										<EvilIcon name={"chevron-down"} size={30} color={colors.darkPurple} />}
										{!this.state.transactionsAreExpanded &&
										<EvilIcon name={"chevron-up"} size={30} color={colors.darkPurple} />}
									</TouchableOpacity>
								</View>
								<TransactionList
									exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]}
									blockHeight={this.props.wallet.blockHeight[this.props.wallet.selectedCrypto]}
									blacklistedUtxos={this.getBlacklistedUtxos()}
									selectedCrypto={this.props.wallet.selectedCrypto}
									transactions={this.getTransactions()}
									cryptoUnit={this.props.settings.cryptoUnit}
									onTransactionPress={this.onTransactionPress}
									onRefresh={this.resetView}
								/>
							</Animated.View>
						</View>
						
						{this.state.displayTransactionDetail &&
						<Animated.View
							style={[styles.transactionDetail, {opacity: this.state.transactionDetailOpacity}]}
						>
							<TransactionDetail
								refreshWallet={this.refreshWallet}
								onTransactionPress={this.onTransactionPress}
							/>
						</Animated.View>}
					
					</View>
				
				</Animated.View>
				
				{this.state.displayXButton &&
				<Animated.View style={[styles.xButton, {opacity: this.state.xButtonOpacity}]}>
					<XButton
						style={{borderColor: this.state.displayTransactionList ? "transparent" : colors.white}}
						onPress={this.resetView}
					/>
				</Animated.View>}
				
				<DefaultModal
					isVisible={this.state.displayWelcomeModal}
					onClose={this._closeWelcomeModal}
					type="ScrollView"
					style={styles.modal}
					contentStyle={styles.modalContent}
				>
					<Welcome />
				</DefaultModal>

				<DefaultModal
					isVisible={this.state.displayBackupPhrase}
					onClose={this.toggleBackupPhrase}
					type="View"
					style={styles.modal}
					contentStyle={styles.modalContent}
				>
					<View style={{ flex: 1, justifyContent: "center" }}>
						<BackupPhrase
							phrase={this.state.backupPhrase}
							onPress={this.toggleBackupPhrase}
						/>
					</View>
				</DefaultModal>
				
				<DefaultModal
					isVisible={this.state.displayBitidModal}
					onClose={this._closeBitidModal}
					type="View"
					style={styles.modal}
					contentStyle={styles.modalContent}
				>
					<View style={styles.centerContent}>
						<Text style={styles.boldText}>Do you want to login to:</Text>
						<Text style={[styles.text, { marginTop: 10, color: colors.purple }]}>{this.state.bitidData["host"]}</Text>
					</View>
					<View style={[styles.centerContent, { flexDirection: "row" }]}>
						<Button textStyle={styles.text} gradient={true} style={styles.button} text="Cancel" onPress={this._closeBitidModal} />
						<View style={{marginHorizontal: 10}} />
						<Button textStyle={styles.text} gradient={true} style={styles.button} text="Login" onPress={this._loginWithBitid} />
					</View>
				</DefaultModal>
				
			</SafeAreaView>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.darkPurple
	},
	linearGradient: {
		flex: 1
	},
	upperContent: {
		backgroundColor: "transparent"
	},
	lowerContent: {
		backgroundColor: colors.white
	},
	centerContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center"
	},
	priceHeader: {
		position: "absolute",
		top: 0,
		bottom: 50,
		left: 0,
		right: 0,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	cameraRow: {
		position: "absolute",
		bottom: 5,
		left: 0,
		right: 0,
		alignItems: "center",
		justifyContent: "flex-end"
	},
	ReceiveTransaction: {
		position: "absolute",
		top: -100,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	transactionDetail: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	selectCoin: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	textFormContainer: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "flex-start",
		paddingHorizontal: 20,
		marginVertical: 10,
		//borderWidth: 1,
		//borderColor: colors.white
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
	},
	transactionListHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: colors.gray
	},
	boldText: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 20,
		textAlign: "center"
	},
	text: {
		...systemWeights.light,
		color: colors.white,
		fontSize: 20,
		textAlign: "center"
	},
	refresh: {
		flex: 0.5,
		alignItems: "flex-start",
		justifyContent: "center",
		paddingLeft: 15
	},
	expand: {
		flex: 0.5,
		alignItems: "flex-end",
		justifyContent: "center",
		paddingRight: 10
	},
	camera: {
		flex: 1,
		zIndex: 10
	},
	settings: {
		flex: 1,
		zIndex: 10
	},
	settingsContainer: {
		position: "absolute",
		backgroundColor: "transparent",
		top: 0,
		right: 0
	},
	cryptoValue: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 20,
		textAlign: "center",
		backgroundColor: "transparent"
	},
	modal: {
	},
	modalContent: {
		borderWidth: 5,
		borderRadius: 20,
		borderColor: colors.lightGray
	},
	button: {
		backgroundColor: colors.lightPurple,
		minWidth: "20%",
		paddingHorizontal: 15,
		paddingVertical: 9,
	}
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("../actions/user");
const walletActions = require("../actions/wallet");
const settingsActions = require("../actions/settings");
const transactionActions = require("../actions/transaction");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...userActions,
		...walletActions,
		...settingsActions,
		...transactionActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(App);
