import React, { PureComponent } from "react";
import {
	Platform,
	StyleSheet,
	Text,
	View,
	Animated,
	TouchableOpacity,
	SafeAreaView,
	StatusBar,
	Keyboard,
	BackHandler,
	UIManager,
	ActivityIndicator,
	Dimensions,
	LayoutAnimation,
	AppState,
	InteractionManager
} from "react-native";
import { systemWeights } from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import TouchID from "react-native-touch-id";
import "./shim";

import Header from "./src/components/Header";
import CameraRow from "./src/components/CameraRow";
import ReceiveTransaction from "./src/components/ReceiveTransaction";
import TransactionList from "./src/components/TransactionList";
import TransactionDetail from "./src/components/TransactionDetail";
import XButton from "./src/components/XButton";
import Camera from "./src/components/Camera";
import SelectCoin from "./src/components/SelectCoin";
import SendTransaction from "./src/components/SendTransaction";
import Settings from "./src/components/Settings";
import Biometrics from "./src/components/Biometrics";
import PinPad from "./src/components/PinPad";
import Loading from "./src/components/Loading";

import * as electrum from "./src/utils/electrum";
import nodejs from "nodejs-mobile-react-native";
import bitcoinUnits from "bitcoin-units";
const {
	networks
} = require("./src/utils/networks");

const {
	Constants: {
		colors
	}
} = require("./ProjectData.json");
const {
	parsePaymentRequest,
	getDifferenceBetweenDates,
	isOnline,
	getNetworkType,
	getAddress,
	pauseExecution,
	capitalize,
	getInfoFromAddressPath,
	getExchangeRate,
	validatePrivateKey
} = require("./src/utils/helpers");
const { width } = Dimensions.get("window");
const bitcoin = require("rn-bitcoinjs-lib");
const bip39 = require("bip39");
const moment = require("moment");

export default class App extends PureComponent {

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

		displayTransactionList: true,
		transactionListOpacity: new Animated.Value(0),

		appState: AppState.currentState,
		appHasLoaded: false,

		address: "",
		amount: 0,
		optionSelected: "",
		transactionsAreExpanded: false,
		loadingMessage: "",
		loadingProgress: 0,
		loadingTransactions: true,
		loadingAnimationName: "cloudBook"
	};

	setExchangeRate = async ({selectedCrypto = "bitcoin"} = {}) => {
		//const start = this.props.transaction.feeTimestamp;
		//const end = new Date();
		//const difference = getDifferenceBetweenDates({ start, end });
		//if (!this.props.transaction.feeTimestamp || difference > 10) {
		const exchangeRate = await getExchangeRate({ selectedCrypto });
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

	onCoinPress = async ({ coin = "bitcoin", wallet = "wallet0", initialLoadingMessage = "" } = {}) => {
		try {
			const sameCoin = this.props.wallet.selectedCrypto === coin;
			const sameWallet = this.props.wallet.selectedWallet === wallet;
			if (sameCoin && sameWallet) {
				this.resetView();
				return;
			}

			this.updateSelectCoin({display: false, duration: 200});

			const network = getNetworkType(coin);
			await this.props.updateWallet({ selectedCrypto: coin, network, selectedWallet: wallet });

			if (this.props.wallet[wallet].addresses[coin].length > 0) {
				//This condition occurs when the user selects a coin that already has generated addresses from the "SelectCoin" view.
				this.updateLoading({ display: false });
				this.resetView();
			} else {
				//This condition occurs when the user selects a coin that does not have any addresses from the "SelectCoin" view.
				if (initialLoadingMessage) {
					this.setState({ loadingMessage: initialLoadingMessage, loadingProgress: 0.3, loadingAnimationName: coin });
				} else {
					this.setState({ loadingMessage: `Switching to ${capitalize(coin)} for ${this.props.wallet.selectedWallet.split('wallet').join('Wallet ')}`, loadingProgress: 0.3, loadingAnimationName: coin });
				}
				this.updateLoading({ display: true });
				InteractionManager.runAfterInteractions(async () => {
					await this.refreshWallet({ reconnectToElectrum: !sameCoin });
					this.resetView();
				});
				return;
			}

			this.setState({ loadingTransactions: true });
			InteractionManager.runAfterInteractions(() => {
				this.refreshWallet({reconnectToElectrum: !sameCoin});
			});
		} catch (e) {
			console.log(e);
			this.resetView();
		}
	};

	launchDefaultFuncs = async ({ displayLoading = true, resetView = true } = {}) => {
		this.updateBiometrics({display: false});
		this.updatePin({display: false});
		if (displayLoading) this.updateLoading({display: true});

		//Push user to the default view while the rest of the wallet data loads.
		//this.resetView();

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
			if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
		} catch (e) {
			console.log(e);
		}

		this.startDate = new Date();
		clearInterval(this._refreshWallet);

		this.setState({ loadingMessage: "Fetching Network Status", loadingProgress: 0.35, appHasLoaded: true });
		/*
		 Clear or Reset any pending transactions to start from a clean slate.
		 &&
		 Set user's online status
		 */
		const isConnected = await isOnline();
		await Promise.all([this.props.resetTransaction(), this.props.updateUser({ isOnline: isConnected })]);

		//If online, connect to an electrum server.
		if (isConnected) {
			this.refreshWallet();
			await pauseExecution()
		} else {
			//Device is offline. Ensure any loading animations are disabled.
			await pauseExecution();
			this.setState({ loadingTransactions: false });
		}

		//Push user to the default view while the rest of the wallet data loads.
		if (resetView) this.resetView();
	};

	refreshWallet = async ({ ignoreLoading = false, reconnectToElectrum = true } = {}) => {
		//This helps to prevent the app from disconnecting and stalling when attempting to connect to an electrum server after some time.
		await nodejs.start("main.js");

		try {
			//Enable the loading state
			this.setState({ loadingTransactions: true });

			//Check if the user is online
			const isConnected = await isOnline();
			if (!isConnected) {
				//Device is offline. Ensure any loading animations are disabled.
				await Promise.all([this.props.updateUser({ isOnline: isConnected })]);
				this.setState({ loadingTransactions: false });
				alert("Your device is currently offline. Please check your network connection and try again.");
				return;
			}
			//Save isConnected state to isOnline.
			if (this.props.user.isOnline === false) this.props.updateUser({ isOnline: isConnected });

			const { selectedWallet, selectedCrypto } = this.props.wallet;

			await this.setExchangeRate({ selectedCrypto }); //Set the exchange rate for the selected currency

			//Update status of the user-facing loading message and progress bar
			if (!ignoreLoading) this.setState({ loadingMessage: "Connecting to Electrum Server...", loadingProgress: 0.4 });

			if (reconnectToElectrum) {
				//Disconnect from the currently connected Electrum server. Not entirely sure if this is necessary, but it seems to prevent the app from stalling in certain scenarios.
				await electrum.stop();

				//Spin up electrum, connect to a peer & start Electrum's keep-alive function;
				//Returns: { customPeers: [], data: { host: "" port: 443 }, error: false, method: "connectToPeer" }
				const electrumStartResponse = await electrum.start({
					coin: selectedCrypto,
					customPeers: this.props.settings.customPeers[selectedCrypto]
				});
				if (electrumStartResponse.error === false) {
					//Set the current electrum peer.
					this.props.updateSettings({currentPeer: electrumStartResponse.data});
				} else {
					//The device is considered offline if it is unable to connect to an electrum server. Ensure any loading animations are disabled.
					await Promise.all([this.props.updateUser({isOnline: false})]);
					this.setState({loadingTransactions: false});
					alert("Unable to connect to an electrum server at this time. Please check your connection and try again.");
					return;
				}
				//Remove any pre-existing instance of this._refreshWallet
				clearInterval(this._refreshWallet);

				if (!__DEV__) {
					//Set an interval to run this.refreshWallet approximately every 2 minutes.
					this._refreshWallet = setInterval(async () => {
						const currentTime = new Date();
						const seconds = (currentTime.getTime() - this.startDate.getTime()) / 1000;
						let end = moment();
						let difference = 0;
						try {
							end = this.props.wallet[selectedWallet].lastUsedAddress[selectedCrypto];
						} catch (e) {
						}
						try {
							difference = getDifferenceBetweenDates({start: moment(), end});
						} catch (e) {
						}
						if (seconds > 10 && difference >= 1.8) {
							await this.refreshWallet();
						}
					}, 60 * 2000);
				}
			}

			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({ loadingMessage: "Getting Current Block Height & Exchange Rate...", loadingProgress: 0.5 });

			//Gather existing addresses, changeAddresses and their respective indexes for use later on
			let addresses = [];
			try {
				addresses = this.props.wallet[selectedWallet].addresses[selectedCrypto];
			} catch (e) {}
			let changeAddresses = [];
			try {
				changeAddresses = this.props.wallet[selectedWallet].changeAddresses[selectedCrypto];
			} catch (e) {}

			let addressIndex = this.props.wallet[selectedWallet].addressIndex[selectedCrypto];
			let changeAddressIndex = this.props.wallet[selectedWallet].changeAddressIndex[selectedCrypto];

			/*
			 //Rescan Addresses if user is waiting for any pending transactions
			 await Promise.all(this.props.wallet[selectedWallet].addresses[selectedCrypto].map((add, i) => {
			 if (add.block <= 0 && i < addressIndex) addressIndex = i;
			 }));
			 //Rescan Change Addresses if user is waiting for any pending transactions
			 await Promise.all(this.props.wallet[selectedWallet].changeAddresses[selectedCrypto].map((add, i) => {
			 if (add.block <= 0 && i < changeAddressIndex) changeAddressIndex = i;
			 }));
			 */

			//Gather existing utxo's for use later on
			let utxos = [];
			try {
				utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto] || [];
			} catch (e) {
			}

			//Specify the threshold at which the app will continue searching empty addresses before giving up.
			const indexThreshold = addresses.length < 20 ? addresses.length-1 : 20;

			//Get & Set Current Block Height
			await this.props.updateBlockHeight({ selectedCrypto });
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];

			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({ loadingMessage: "Generating Addresses,\nUpdating Transactions.\nThis may take a while...", loadingProgress: 0.65 });

			//This function loads up the user's transaction history for the transaction list, gathers the wallet's next available addresses/changeAddresses and creates more as needed
			//TODO: This function is way too large/multipurpose and needs to be broken up for easier use and testing.
			await this.props.getNextAvailableAddress({ addresses, changeAddresses, addressIndex, changeAddressIndex, indexThreshold: 1, currentBlockHeight, selectedCrypto, selectedWallet, wallet: selectedWallet, customPeers: this.props.settings.customPeers[selectedCrypto] });

			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({ loadingMessage: "Updating UTXO's", loadingProgress: 0.8 });

			//Fetch any new utxos.
			//Re-gather all known addresses and changeAddresses in case more were created from the getNextAvailableAddress function.
			addresses = this.props.wallet[selectedWallet].addresses[selectedCrypto];
			changeAddresses = this.props.wallet[selectedWallet].changeAddresses[selectedCrypto];

			//Scan all addresses & changeAddresses for UTXO's and save them.
			//Note: The app uses the saved UTXO response to verify/update the wallet's balance.
			const resetUtxosResponse = await this.props.resetUtxos({ addresses, changeAddresses, currentUtxos: utxos, selectedCrypto, selectedWallet, wallet: selectedWallet, currentBlockHeight });

			//Iterate over the new utxos and rescan the transactions if a utxo with a new hash appears
			let needsToRescanTransactions = false;
			addressIndex = this.props.wallet[selectedWallet].addressIndex[selectedCrypto];
			changeAddressIndex = this.props.wallet[selectedWallet].changeAddressIndex[selectedCrypto];
			await Promise.all(resetUtxosResponse.data.utxos.map(async (newUtxo) => {
				let noHashMatches = true;
				await Promise.all(this.props.wallet[selectedWallet].transactions[selectedCrypto].map((transaction) => {
					try {
						if (newUtxo.tx_hash === transaction.hash) {
							noHashMatches = false;
						}
					} catch (e) { console.log(e) }

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
					} catch (e) { console.log(e) }
				}
			}));

			//Check if any transactions have <1 confirmations. If so, rescan them by the lowest index.
			let transactionsThatNeedRescanning = [];
			await Promise.all(this.props.wallet[selectedWallet].transactions[selectedCrypto].map((transaction) => {
				if (transaction.block <= 0) {
					needsToRescanTransactions = true;
					transactionsThatNeedRescanning.push(transaction.address);
				}
			}));

			//Push all addresses and changeAddresses into the same array.
			const allAddresses = this.props.wallet[selectedWallet].addresses[selectedCrypto].concat(this.props.wallet[selectedWallet].changeAddresses[selectedCrypto]);

			//Get lowest index to rescan addresses & changeAddresses with.
			await Promise.all(
				transactionsThatNeedRescanning.map(async (transactionAddress) => {
					try {
						//Filter for the transaction address
						const filteredTransactionAddress = allAddresses.filter((address) => address.address === transactionAddress);

						//Extract the addresses path (Ex: m/49'/1'/0'/1/6)
						const path = filteredTransactionAddress[0].path;
						const pathInfo = await getInfoFromAddressPath(path);

						//Check the path's index and save the lowest value.
						if (pathInfo.isChangeAddress) {
							if (Number(pathInfo.addressIndex) < changeAddressIndex) changeAddressIndex = pathInfo.addressIndex;
						} else {
							if (Number(pathInfo.addressIndex) < addressIndex) addressIndex = pathInfo.addressIndex;
						}
					} catch (e) { console.log(e); }
				})
			);

			/*
			 let transactionPathsThatNeedRescanning = [];
			 await Promise.all(this.props.wallet[selectedWallet].transactions[selectedCrypto].map((transaction) => {
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
			let getNextAvailableAddressResponse = { error: false, data: [] };
			if (needsToRescanTransactions) {
				getNextAvailableAddressResponse = await this.props.getNextAvailableAddress({ addresses, changeAddresses, addressIndex, changeAddressIndex, indexThreshold: 1, currentBlockHeight, selectedCrypto, selectedWallet, wallet: selectedWallet, customPeers: this.props.settings.customPeers[selectedCrypto] });
			}

			//Update status of the user-facing loading message and progress bar
			if (ignoreLoading === false) this.setState({ loadingMessage: "Updating Balance", loadingProgress: 1 });

			//If there was no issue fetching the UTXO sets or the next available addresses, update the balance using the newly acquired UTXO's.
			if (resetUtxosResponse.error === false && getNextAvailableAddressResponse.error === false) {
				try {
					utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto] || [];
					await this.props.updateBalance({ utxos, selectedCrypto, selectedWallet, wallet: selectedWallet });
				} catch (e) {
					console.log(e);
				}
			}

			//Cease the loading state.
			this.setState({ loadingTransactions: false });
		} catch (e) {
			console.log(e);
			this.setState({ loadingTransactions: false });
		}
	};

	authenticateUserWithBiometrics = () => {
		const optionalConfigObject = {
			unifiedErrors: false // use unified error messages (default false)
		};
		const authenticate = () => {
			TouchID.authenticate("To open Bitbip", optionalConfigObject)
				.then(success => {
					//Hide the retry button on the Biometric Authentication view.
					this.setState({ displayBiometricAuthenticationRetry: false });
					//Forward the user to the Pin view if they've enabled it. Otherwise, forward them to the app via launchDefaultFuncs.
					if (this.props.settings.pin) {
						//Transition to the pin view.
						this.onPinPress();
						return;
					}
					this.launchDefaultFuncs();
				})
				.catch(error => {
					//Display the retry button on the Biometric Authentication view in case they hit cancel or encountered some other error during the authentication process.
					this.setState({ displayBiometricAuthenticationRetry: true });
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
			.catch(e => {});
	};

	createWallet = async (walletName = "wallet0", ignoreAddressCheck = false) => {
		try {
			this.updateBiometrics({display: false});
			this.updatePin({display: false});
			await this.updateLoading({display: true});
			await this.props.updateWallet({ selectedCrypto: "bitcoin" });

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
					this.props.updateSettings({ biometricsIsSupported, biometricTypeSupported });
				})
				.catch(e => { this.props.updateSettings({ biometricsIsSupported, biometricTypeSupported }) });

			//Create Wallet if first timer
			this.setState({loadingMessage: "Creating Wallet...", loadingProgress: 0.1});
			await this.props.createWallet({addressAmount: 2, changeAddressAmount: 2, wallet: walletName, generateAllAddresses: true});
			//Add wallet name to wallets array;
			const wallets = this.props.wallet.wallets.concat(walletName);
			//Set the selectedWallet accordingly and update the wallets array.
			await this.props.updateWallet({ selectedWallet: walletName, wallets });
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			this.setState({loadingMessage: "Fetching Current Block Height...", loadingProgress: 0.15});
			//Get Current Block Height
			await this.props.updateBlockHeight({ selectedCrypto });
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			let addresses = [];
			try {
				addresses = this.props.wallet[selectedWallet].addresses[selectedCrypto];
			} catch (e) {
			}
			let changeAddresses = [];
			try {
				changeAddresses = this.props.wallet[selectedWallet].changeAddresses[selectedCrypto];
			} catch (e) {
			}
			if (ignoreAddressCheck === false) {
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
				this.setState({loadingMessage: "Finished Creating Wallet", loadingProgress: 0.3});
			}
			this.launchDefaultFuncs({ displayLoading: false });
		} catch (e) {
			console.log(e);
		}
	};

	async componentWillMount() {
		//Spin up the nodejs thread
		await nodejs.start("main.js");
	}

	_handleAppStateChange = async (nextAppState) => {
		//Foreground -> Background
		if (this.state.appState.match(/active/) && nextAppState.match(/inactive|background/) && !this.state.displayCamera) {
			electrum.stop();
			//Clear/Remove Wallet Refresh Timer
			clearInterval(this._refreshWallet);
			this.setState({appHasLoaded: false});
		}
		//Background -> Foreground
		if (this.state.appState.match(/inactive|background/) && nextAppState === "active" && !this.state.displayCamera) {
			if (this.props.settings.biometrics || this.props.settings.pin) {
				this.updatePriceHeader({display: false});
				this.updateCameraRow({display: false});
				this.updateTransactionList({display: false});
				this.updateSettings({display: false});
				this.updateSelectCoin({display: false});
				this.updateTransactionDetail({display: false});
				this.updateCamera({display: false});
				this.updateReceiveTransaction({display: false});
				this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
				//this.updateLoading({ display: true });

				try {
					//Determine if user is a first timer. Create a new wallet if so.
					if (this.props.wallet.wallet0.addresses.bitcoin.length === 0) {
						await this.createWallet("wallet0", true);
						return;
					}
				} catch (e) {}

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
			}
			try {
				/*
				 const { selectedCrypto } = this.props.wallet;
				 await nodejs.start("main.js");
				 await electrum.stop();
				 await electrum.start({
				 coin: selectedCrypto,
				 customPeers: this.props.settings.customPeers[selectedCrypto]
				 });
				 */
				//Resume normal operations
				this.launchDefaultFuncs({ displayLoading: false, resetView: false });
			} catch (e) {}
		}
		this.setState({appState: nextAppState});
	};

	async componentDidMount() {
		//This gets called after redux-persist rehydrates
		InteractionManager.runAfterInteractions(() => {
			try {
				//Determine if the user has any existing wallets. Create a new wallet if so.
				if (this.props.wallet.wallets.length === 0) {
					this.createWallet("wallet0", true);
					return;
				}

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

	componentWillUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}

	componentWillUnmount() {
		try {
			//Stop Electrum Process
			electrum.stop();
			//Remove Back Button Listener
			BackHandler.removeEventListener("hardwareBackPress", this.resetView);
			//Start the listener that detects if the app is in the background or foreground
			AppState.removeEventListener("change", this._handleAppStateChange);
			//Clear/Remove Wallet Refresh Timer
			clearInterval(this._refreshWallet);
		} catch (e) {
			console.log(e);
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
							duration: duration
						}
					),
					Animated.timing(
						this.state.lowerContentFlex,
						{
							toValue: lowerContentFlex,
							duration: duration
						}
					)
				]).start(() => {
					//Perform any other action after the update has been completed.
					resolve({ error: false });
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "QRCode" Opacity Animation
	updateReceiveTransaction = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayReceiveTransaction: display });
				Animated.timing(
					this.state.receiveTransactionOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayReceiveTransaction: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "TransactionDetail" Opacity Animation
	updateTransactionDetail = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayTransactionDetail: display });
				Animated.timing(
					this.state.transactionDetailOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "SelectCoin" Opacity Animation
	updateSelectCoin = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displaySelectCoin: display });
				Animated.timing(
					this.state.selectCoinOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({ error: false });
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Loading" Opacity Animation
	updateLoading = async ({ display = true, duration = 600 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayLoading: display });
				Animated.timing(
					this.state.loadingOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({ error: false });
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "TransactionList" View Opacity Animation
	updateTransactionList = async ({ display = true, duration = 0 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayTransactionList: display });
				Animated.timing(
					this.state.transactionListOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayTransactionList: display });
					resolve({ error: false });
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Camera" View Opacity Animation
	updateCamera = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayCamera: display });
				Animated.timing(
					this.state.cameraOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({ error: false });
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Settings" View Opacity Animation
	updateSettings = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displaySettings: display });
				Animated.timing(
					this.state.settingsOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Biometrics" View Opacity Animation
	updateBiometrics = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayBiometrics: display });
				Animated.timing(
					this.state.biometricsOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (display === true) this.authenticateUserWithBiometrics();
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "PinPad" View Opacity Animation
	updatePin = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayPin: display });
				Animated.timing(
					this.state.pinOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Header" Opacity Animation
	updatePriceHeader = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayPriceHeader: display });
				Animated.timing(
					this.state.priceHeaderOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(() => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayPriceHeader: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The TextInput Opacity Animation
	updateTextInput = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayTextInput: display });
				Animated.timing(
					this.state.textInputOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayTextInput: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Send", "Camera" and "Receive" Row Opacity Animation
	updateCameraRow = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayCameraRow: display });
				Animated.timing(
					this.state.cameraRowOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayCameraRow: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "X" Button Opacity Animation
	updateXButton = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display) this.setState({ displayXButton: display });
				Animated.timing(
					this.state.xButtonOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (!display) this.setState({ displayXButton: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles the series of animations necessary when the user taps "Send"
	onSendPress = async () => {
		try {
			//Open Send State
			this.updateCameraRow({display: false});
			this.updateXButton({display: true});
			this.updateCamera({ display: false });
			this.updatePriceHeader({display: false, duration: 250});
			this.updateTransactionList({ display: false, duration: 200 });
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateTextInput({display: true, duration: Platform.OS === "ios" ? 800 : 300});
			InteractionManager.runAfterInteractions(() => {
				this.setState({optionSelected: "send"});
			});
		} catch (e) {
			console.log(e);
		}
	};

	//Handles the series of animations necessary when the user taps "Receive"
	onReceivePress = async () => {
		if (this.state.optionSelected !== "receive") {
			//Open Receive State
			this.updateCameraRow({display: false});
			this.updateXButton({display: true});
			this.updatePriceHeader({display: false, duration: 250});
			this.updateTextInput({display: false});
			this.updateTransactionList({ display: false, duration: 200 });
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateReceiveTransaction({display: true, duration: 800});
			InteractionManager.runAfterInteractions(() => {
				this.setState({optionSelected: "receive"});
			});
		} else {
			//Close Receive State
			this.setState({optionSelected: ""});
			this.updateReceiveTransaction({display: false, duration: 200});
			this.updateTextInput({display: false});
			this.updateXButton({display: false, duration: 100});
			await this.updateFlex();
			this.updatePriceHeader({display: true, duration: 350});
		}
	};

	//Handles the series of animations necessary when the user taps a specific transaction from the TransactionList.
	onTransactionPress = async (transaction = "") => {
		try {
			this.updateXButton({display: true});
			this.updateCameraRow({display: false});
			this.updatePriceHeader({display: false, duration: 350});
			this.updateTextInput({display: false});
			this.updateTransactionList({display: false, duration: 400});
			this.updateFlex({upperContentFlex: 0, lowerContentFlex: 1, duration: 400});
			this.updateTransactionDetail({display: true});

			const {selectedWallet, selectedCrypto} = this.props.wallet;
			transaction = await this.props.wallet[selectedWallet].transactions[selectedCrypto].filter((tx) => tx.hash === transaction);
			this.props.updateWallet({selectedTransaction: transaction[0]});
		} catch (e) {}
	};

	//Handles the series of animations necessary when the user taps the selected crypto symbol
	onSelectCoinPress = async () => {
		//This prevents any possibility of the user tapping into the view without prior authorization.
		if (this.state.displayLoading || this.state.displayPin || this.state.displayBiometrics || this.state.displayBiometricAuthenticationRetry || this.state.appHasLoaded === false) return;
		if (!this.state.displaySelectCoin) {
			//Open SelectCoin State
			this.updateCameraRow({display: false});
			this.updateXButton({display: true, duration: 500});
			this.updatePriceHeader({display: false, duration: 350});
			this.updateTextInput({display: false});
			this.updateTransactionList({ display: false, duration: 200 });
			this.updateReceiveTransaction({display: false});
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateSelectCoin({display: true, duration: 400});
		} else {
			//Close SelectCoin State
			//TODO: Verify this comment is true. This condition is triggered when creating a new wallet from the SelectCoin view. It is used to properly close the view.
			this.updateSelectCoin({display: false});
			this.updateReceiveTransaction({display: false, duration: 200});
			this.updateTextInput({display: false});
			this.updateXButton({display: false, duration: 100});
			//this.updateSelectCoin({display: false, duration: 400});
			await this.updateFlex();
			this.updatePriceHeader({display: true, duration: 350});
		}
	};

	//Handles the series of animations necessary when the user taps the Camera icon.
	onCameraPress = async () => {
		try {
			//Open Receive State
			this.updateCameraRow({display: false});
			this.updatePriceHeader({display: false, duration: 350});
			this.updateTextInput({display: false});
			this.updateReceiveTransaction({display: false});
			this.updateXButton({display: false});
			this.updateTransactionList({ display: false, duration: 200 });
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateCamera({ display: true });
		} catch (e) {
			console.log(e);
		}
	};

	//Handles the series of animations necessary when the user taps the Settings icon.
	onSettingsPress = async () => {
		try {
			//Open Receive State
			this.updateCameraRow({display: false});
			this.updatePriceHeader({display: false, duration: 350});
			this.updateTextInput({display: false});
			this.updateReceiveTransaction({display: false});
			this.updateXButton({display: false});
			this.updateCamera({ display: false });
			this.updateTransactionList({ display: false, duration: 200 });
			this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateSettings({ display: true, duration: 50 });
		} catch (e) {
			console.log(e);
		}
	};

	//Handles the series of animations necessary to transition the view to handle Biometrics.
	onBiometricsPress = async () => {
		try {
			this.updateReceiveTransaction({display: false });
			this.updateSettings({display: false });
			this.updateTransactionDetail({ display: false });
			this.updateSelectCoin({display: false});
			this.updateCameraRow({display: false});
			this.updatePriceHeader({display: false });
			this.updateTextInput({display: false});
			this.updateXButton({display: false});
			this.updateCamera({ display: false });
			this.updateLoading({display: false});
			this.updateTransactionList({ display: false });
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updateBiometrics({ display: true });
		} catch (e) {
			console.log(e);
		}
	};

	//Handles the series of animations necessary to transition the view to handle Pin.
	onPinPress = async () => {
		try {
			this.updateReceiveTransaction({display: false });
			this.updateSettings({display: false });
			this.updateTransactionDetail({ display: false });
			this.updateSelectCoin({display: false}); //Maybe messing it up?
			this.updateCameraRow({display: false});
			this.updatePriceHeader({display: false });
			this.updateTextInput({display: false});
			this.updateXButton({display: false});
			this.updateCamera({ display: false });
			this.updateLoading({display: false});
			this.updateTransactionList({ display: false });
			this.updateBiometrics({ display: false });
			await this.updateFlex({upperContentFlex: 1, lowerContentFlex: 0});
			this.updatePin({ display: true });
		} catch (e) {
			console.log(e);
		}
	};

	//Handles the series of animations necessary to revert the view back to it's original layout.
	resetView = async () => {
		this.updateTransactionList({ display: true });
		if (!this.state.displayCameraRow) this.updateCameraRow({display: true});
		if (this.state.displayCamera) this.updateCamera({ display: false });
		if (this.state.displayXButton) this.updateXButton({display: false, duration: 100});
		if (this.state.displayTextInput) this.updateTextInput({display: false, duration: 200});
		if (this.state.displayLoading) this.updateLoading({display: false, duration: 200});
		if (this.state.displayReceiveTransaction) this.updateReceiveTransaction({display: false, duration: 200});
		if (this.state.displaySettings) this.updateSettings({display: false, duration: 200});
		if (this.state.displayTransactionDetail) this.updateTransactionDetail({ display: false, duration: 200 });
		if (this.state.displaySelectCoin) this.updateSelectCoin({display: false, duration: 200});
		if (!this.state.displayPriceHeader) this.updatePriceHeader({display: true, duration: 600});
		this.updateFlex({ duration: 400 });
		InteractionManager.runAfterInteractions(() => {
			this.props.updateWallet({ selectedTransaction: "" });
			this.setState({optionSelected: "", transactionsAreExpanded: false, loadingAnimationName: "loader"});
		});
	};

	//Handles the series of animations necessary for the user to expand the transaction list.
	expandTransactions = () => {
		this.setState({ transactionsAreExpanded: true });
		this.updateXButton({display: true});
		this.updateCameraRow({display: false, duration: 200});
		this.updatePriceHeader({display: false, duration: 350});
		this.updateTextInput({display: false});
		this.updateFlex({upperContentFlex: 0, lowerContentFlex: 1});
		//this.updateReceiveTransaction({display: false, duration: 200});
		//this.updateSelectCoin({display: false, duration: 200});
	};

	//Handles any action that requires the Keyboard to be dismissed.
	dismissKeyboard = async () => {
		Keyboard.dismiss();
	};

	//Handles any action that requires a private key to be swept.
	//This function will auto-sweep the funds of any private key into the user's currently selected wallet.
	//TODO: Add ability for user to specify the fee when sweeping. Disable this method until a custom fee can be applied.
	sweepPrivateKey = async ({ privateKey = "", network = "bitcoin" } = {}) => {
		return new Promise(async (resolve) => {
			try {
				//Switch to the specified network in order to sweep the coins
				if (network !== this.props.wallet.selectedCrypto) {
					await this.props.updateWallet({selectedCrypto: network});
					//Disconnect from the current electurm server.
					await electrum.stop();
					await electrum.start({coin: network, customPeers: this.props.settings.customPeers[network]});
				}

				//Get addresses from the private key
				const keyPair = bitcoin.ECPair.fromWIF(privateKey, networks[network]);
				const bech32Address = await getAddress(keyPair, networks[network], "bech32"); //Bech32
				const p2shAddress = await getAddress(keyPair, networks[network], "p2sh"); //(3) Address
				const p2pkhAddress = await getAddress(keyPair, networks[network], "p2pkh");//(1) Address

				//Get the balance for each address.
				const bech32BalanceResult = await Promise.all([
					electrum.getAddressScriptHashBalance({address: bech32Address, id: 6, network: networks[network]}), //Bech32 format demands we use the scriptHash variant of the getAddressBalance function
					electrum.getAddressScriptHashMempool({address: bech32Address, id: 5, network: networks[network]})
				]);
				const p2shBalanceResult = await Promise.all([
					electrum.getAddressBalance({address: p2shAddress, id: 1}),
					electrum.getMempool({address: p2shAddress, id: 3}),
				]);
				const p2pkhBalanceResult = await Promise.all([
					electrum.getAddressBalance({address: p2pkhAddress, id: 2}),
					electrum.getMempool({address: p2pkhAddress, id: 4})
				]);

				let balance = 0;
				let bech32Balance = 0;
				let p2shBalance = 0;
				let p2pkhBalance = 0;
				const selectedWallet = this.props.wallet.selectedWallet;
				const selectedCrypto = this.props.wallet.selectedCrypto;
				const changeAddressIndex = this.props.wallet[selectedWallet].changeAddressIndex[selectedCrypto];
				const changeAddress = this.props.wallet[selectedWallet].changeAddresses[selectedCrypto][changeAddressIndex].address;
				//Add up and store all balances from each address
				await Promise.all(
					bech32BalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								bech32Balance = Number(unconfirmed) + Number(confirmed) + Number(bech32Balance);
							} catch (e) {
							}
						}
					}),
					p2shBalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								p2shBalance = Number(unconfirmed) + Number(confirmed) + Number(p2shBalance);
							} catch (e) {
							}
						}
					}),
					p2pkhBalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								p2pkhBalance = Number(unconfirmed) + Number(confirmed) + Number(p2pkhBalance);
							} catch (e) {
							}
						}
					})
				);

				console.log("Logging Address Balances...");
				console.log(`${bech32Address}: ${bech32Balance}`);
				console.log(`${p2shAddress}: ${p2shBalance}`);
				console.log(`${p2pkhAddress}: ${p2pkhBalance}`);
				console.log(`Total Balance: ${balance}`);

				//Setup transaction builder for the given network
				let txb = new bitcoin.TransactionBuilder(networks[network]);

				//Set the target to the current wallet's next available changeAddress.
				let targets = [{address: changeAddress, value: balance}];

				//Fetch the utxos for each address
				let bech32Utxos, p2shUtxos, p2pkhUtxos = [];
				try {
					if (bech32Balance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							address: bech32Address,
							network: networks[selectedCrypto]
						});
						if (utxoResponse.error === false) bech32Utxos = utxoResponse.data;
					}
				} catch (e) {
					bech32Utxos = []
				}
				try {
					if (p2shBalance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							address: p2shAddress,
							network: networks[selectedCrypto]
						});
						if (utxoResponse.error === false) p2shUtxos = utxoResponse.data;
					}
				} catch (e) {
					p2shUtxos = []
				}
				try {
					if (p2pkhBalance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							address: p2pkhAddress,
							network: networks[selectedCrypto]
						});
						if (utxoResponse.error === false) p2pkhUtxos = utxoResponse.data;
					}
				} catch (e) {
					p2pkhUtxos = []
				}

				//Start adding the inputs for each address if any utxo's are available
				try {
					//Add Inputs
					await Promise.all(
						bech32Utxos.map((utxo) => {
							const p2wpkh = bitcoin.payments.p2wpkh({
								pubkey: keyPair.publicKey,
								network: networks[network]
							});
							txb.addInput(utxo.tx_hash, utxo.tx_pos, null, p2wpkh.output);
						})
					);
				} catch (e) {}
				try {
					//Add Inputs
					await Promise.all(
						p2shUtxos.map((utxo) => {
							txb.addInput(utxo.tx_hash, utxo.tx_pos)
						})
					);
				} catch (e) {}
				try {
					//Add Inputs
					await Promise.all(
						p2pkhUtxos.map((utxo) => {
							txb.addInput(utxo.tx_hash, utxo.tx_pos)
						})
					);
				} catch (e) {}

				//Add our next available changeAddress for the given wallet as an output minus whatever the user decides the fee to be.
				await Promise.all(
					targets.map((target) => {
						try {
							txb.addOutput(target.address, target.value - 500);
						} catch (e) {
						}
					})
				);

				//Loop through and sign
				try {
					if (bech32Utxos.length > 0) {
						await Promise.all(
							bech32Utxos.map((utxo, i) => {
								try {
									txb.sign(i, keyPair, null, null, utxo.value);
								} catch (e) {
								}
							})
						);
					}
				} catch (e) {}
				try {
					if (p2shUtxos.length > 0) {
						let utxoLength = 0;
						try {
							utxoLength = bech32Utxos.length;
						} catch (e) {}
						await Promise.all(
							p2shUtxos.map((utxo, i) => {
								try {
									const p2wpkh = bitcoin.payments.p2wpkh({
										pubkey: keyPair.publicKey,
										network: networks[network]
									});
									const p2sh = bitcoin.payments.p2sh({redeem: p2wpkh, network: networks[network]});
									txb.sign(utxoLength+i, keyPair, p2sh.redeem.output, null, utxo.value);
								} catch (e) {
									console.log(e);
									console.log(i);
								}
							})
						);
					}
				} catch (e) {
					console.log(e);
				}
				try {
					if (p2pkhUtxos.length > 0) {
						let utxoLength = 0;
						try {
							utxoLength = bech32Utxos.length;
						} catch (e) {}
						try {
							utxoLength = utxoLength + p2shUtxos.length;
						} catch (e) {}
						await Promise.all(
							p2pkhUtxos.map((utxo, i) => {
								try {
									txb.sign(utxoLength+i, keyPair);
								} catch (e) {
									console.log(e);
								}
							})
						);
					}
				} catch (e) {}

				//Create the raw transaction hex
				const rawTx = txb.build().toHex();
				console.log(rawTx);

				//Reset the user's view
				this.resetView();

				resolve({error: false, data: rawTx});
				//alert(`Private Key Detected with a balance of ${balance}:\n${privateKey}\nApologies, but private key sweep functionality has not been implemented yet. I'm getting there, I promise!  :-)`);
			} catch (e) {
				console.log(e);
			}
		})
	};

	//Handles any BarCodeRead action.
	onBarCodeRead = async ({ data }) => {
		try {
			//Determine if we need to import a mnemonic phrase
			if (bip39.validateMnemonic(data)) {
				await this.updateCamera({ display: false });
				this.createNewWallet({ mnemonic: data });
				return;
				//const result = await importWallet({ updateWallet: this.props.updateWallet, wallets: this.props.wallet.wallets, createWallet: this.createNewWallet, mnemonic: data });
			}

			//Determine if we need to sweep a private key
			const validatePrivateKeyResults = await validatePrivateKey(data);
			if (validatePrivateKeyResults.isPrivateKey === true) {

				//Remove Camera View
				await this.updateCamera({ display: false });

				alert("Private Key Detected. Unfortunately, Bitbip is not able to sweep this key into your wallet just yet, but we're getting there!");
				//Auto sweep the data.
				//TODO: Add ability for user to specify the fee when sweeping. Disable this method until a custom fee can be applied.
				//this.sweepPrivateKey({ privateKey: data, network: validatePrivateKeyResults.network });

				return;
			}

			//Check if this is a BitId Request
			//TODO: Complete this BitId function.
			if (data.substr(0, 5).toLowerCase() === "bitid") {
				//Present user with the option to sign and send the request.
				//Remove Camera View
				await this.updateCamera({ display: false });
				//Reveal Sign Message View
				//await this.updateSignMessage({ display: true });
			}

			const qrCodeData = await parsePaymentRequest(data);
			//Throw error if unable to interpret the qrcode data.
			if (qrCodeData.error) {
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
					await electrum.stop();
					//Connect to the relevant electrum server as per the qrcode data.
					await electrum.start({coin, customPeers: this.props.settings.customPeers[coin]});
				}

				//Pass the transaction data forward for use.
				this.props.updateTransaction(qrCodeData.data);
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
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const confirmedBalance = Number(this.props.wallet[selectedWallet].confirmedBalance[selectedCrypto]);
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
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			return Number(this.props.wallet[selectedWallet].confirmedBalance[selectedCrypto]) || 0;
		} catch (e) {}
		return confirmedBalance;
	};

	//Returns the next available empty address of the selected crypto.
	getQrCodeAddress = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			return this.props.wallet[selectedWallet].addresses[selectedCrypto][this.props.wallet[selectedWallet].addressIndex[selectedCrypto]].address;
		} catch (e) {
			//console.log(e);
			return "";
		}
	};

	//Returns all transactions for the selected crypto.
	getTransactions = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const transactions = this.props.wallet[selectedWallet].transactions[selectedCrypto];
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

	createNewWallet = async ({ mnemonic = "" }) => {
		try {
			//Get highest wallet number
			let highestNumber = 0;
			await Promise.all(
				this.props.wallet.wallets.map((wallet) => {
					let walletNumber = wallet.replace("wallet","");
					walletNumber = Number(walletNumber);
					if (walletNumber > highestNumber) highestNumber = walletNumber;
				})
			);
			//Add wallet name to wallets array;
			const walletName = `wallet${highestNumber+1}`;
			const wallets = this.props.wallet.wallets.concat(walletName);
			//Set Loading Message
			await this.setState({loadingMessage: `Creating ${walletName.split('wallet').join('Wallet ')} & Generating Addresses`, loadingProgress: 0.5});

			//Close Receive State
			this.updateSelectCoin({display: false});
			this.updateSettings({display: false});
			this.updateXButton({display: false, duration: 100});
			await this.updateLoading({ display: true });

			//Set the selectedWallet accordingly and update the wallets array.
			await this.props.updateWallet({ selectedWallet: walletName, wallets });

			await this.props.createWallet({ wallet: walletName, mnemonic, generateAllAddresses: mnemonic === "" });

			const { selectedCrypto } = this.props.wallet;
			await electrum.stop();
			await electrum.start({ coin: selectedCrypto, customPeers: this.props.settings.customPeers[selectedCrypto] });
			//Get Current Block Height
			this.props.updateBlockHeight({ selectedCrypto });

			//There's no need to check address/transaction history for new, random mnemonics.
			if (mnemonic !== "") {
				await this.refreshWallet({ignoreLoading: false});
			}

			this.resetView();
		} catch (e) {
			console.log(e);
		}
	};

	render() {
		//return <ElectrumTesting />;
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar backgroundColor={colors.darkPurple} barStyle="light-content" animated={true} />
				<Animated.View style={[styles.upperContent, { flex: this.state.upperContentFlex }]}>
					<LinearGradient style={styles.linearGradient} colors={["#8e45bf", "#7931ab","#5e1993", "#59158e"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>

						<TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={this.dismissKeyboard}>

							{this.state.displayPriceHeader &&
							<Animated.View style={[styles.settingsContainer, { opacity: this.state.priceHeaderOpacity, zIndex: 200 }]}>
								<TouchableOpacity style={{ paddingTop: 10, paddingRight: 10, paddingLeft: 30, paddingBottom: 30 }} onPress={this.onSettingsPress}>
									<Ionicons name={"ios-cog"} size={30} color={colors.white}/>
								</TouchableOpacity>
							</Animated.View>}

							{this.state.displayBiometrics &&
							<Animated.View style={[styles.settings, { opacity: this.state.biometricsOpacity }]}>
								<Biometrics
									biometricTypeSupported={this.props.settings.biometricTypeSupported}
									retryAuthentication={this.state.displayBiometricAuthenticationRetry ? this.authenticateUserWithBiometrics : null}
								/>
							</Animated.View>}

							{this.state.displayPin &&
							<Animated.View style={[styles.settings, { opacity: this.state.pinOpacity }]}>
								<PinPad onSuccess={this.launchDefaultFuncs} onFailure={this.onPinFailure} />
							</Animated.View>}

							{this.state.displayLoading &&
							<Loading
								loadingOpacity={this.state.loadingOpacity}
								loadingMessage={this.state.loadingMessage}
								loadingProgress={this.state.loadingProgress}
								width={width/2}
								animationName={this.state.loadingAnimationName}
							/>}

							{this.state.displayCamera &&
							<Animated.View style={[styles.camera, { opacity: this.state.cameraOpacity }]}>
								<Camera onClose={this.state.optionSelected === "send" ? this.onSendPress : this.resetView} onBarCodeRead={this.onBarCodeRead} />
							</Animated.View>}

							{this.state.displaySettings &&
							<Animated.View style={[styles.settings, { opacity: this.state.settingsOpacity }]}>
								<Settings createNewWallet={this.createNewWallet} onBack={this.resetView} refreshWallet={this.refreshWallet} />
							</Animated.View>}

							<Animated.View style={[styles.priceHeader, { opacity: this.state.priceHeaderOpacity }]}>
								<TouchableOpacity onPress={this.onSelectCoinPress} style={{ position: "absolute",top: 0, paddingTop: 10, paddingBottom: 20, paddingHorizontal: 30 }}>
									<Text style={styles.cryptoValue}>{this.props.wallet.selectedWallet.split('wallet').join('Wallet ')}</Text>
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
							<Animated.View style={[styles.ReceiveTransaction, { opacity: this.state.receiveTransactionOpacity }]}>
								<ReceiveTransaction address={this.getQrCodeAddress()} amount={0.005} size={200} />
							</Animated.View>}

							{this.state.displayTextInput &&
							<Animated.View style={[styles.textFormContainer, { opacity: this.state.textInputOpacity }]}>

								<SendTransaction onCameraPress={this.onCameraPress} refreshWallet={this.refreshWallet} onClose={this.resetView} />

							</Animated.View>}

							{this.state.displayCameraRow &&
							<Animated.View style={[styles.cameraRow, { opacity: this.state.cameraRowOpacity }]}>
								<CameraRow onSendPress={this.onSendPress} onReceivePress={this.onReceivePress} onCameraPress={this.onCameraPress} />
							</Animated.View>}
						</TouchableOpacity>

						{this.state.displaySelectCoin &&
						<Animated.View style={[styles.selectCoin, { opacity: this.state.selectCoinOpacity }]}>
							<SelectCoin
								onCoinPress={this.onCoinPress}
								onClose={() => {
									this.resetView();
									this.refreshWallet();
								}}
								createNewWallet={this.createNewWallet}
							/>
						</Animated.View>}

					</LinearGradient>
				</Animated.View>

				<Animated.View style={[styles.lowerContent, { flex: this.state.lowerContentFlex }]}>

					<View style={{ flex: 1 }}>

						{this.state.displayTransactionList &&
						<LinearGradient style={{ flex: 1 }} colors={[ colors.white, "#f1f3f4", colors.white, colors.white]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
							<Animated.View style={{ flex: 1, opacity: this.state.transactionListOpacity }} >
								<View style={styles.transactionListHeader}>
									{!this.state.loadingTransactions &&
									<TouchableOpacity onPress={this.refreshWallet} style={styles.refresh}>
										<Ionicons name={"ios-refresh"} size={18} color={colors.darkPurple}/>
									</TouchableOpacity>}
									{this.state.loadingTransactions && this.state.displayTransactionList &&
									<View style={styles.refresh}>
										<ActivityIndicator size="small" color={colors.lightPurple} />
									</View>}
									<TouchableOpacity onPress={this.state.transactionsAreExpanded ? this.resetView : this.expandTransactions} style={styles.centerContent}>
										<Text style={styles.boldText}>Transactions</Text>
									</TouchableOpacity>

									<TouchableOpacity onPress={this.state.transactionsAreExpanded ? this.resetView : this.expandTransactions} style={styles.expand}>
										{this.state.transactionsAreExpanded &&
										<EvilIcon name={"chevron-down"} size={30} color={colors.darkPurple}/>}
										{!this.state.transactionsAreExpanded &&
										<EvilIcon name={"chevron-up"} size={30} color={colors.darkPurple}/>}
									</TouchableOpacity>
								</View>
								<TransactionList onTransactionPress={this.onTransactionPress} transactions={this.getTransactions()} selectedCrypto={this.props.wallet.selectedCrypto} cryptoUnit={this.props.settings.cryptoUnit} exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]} blockHeight={this.props.wallet.blockHeight[this.props.wallet.selectedCrypto]} onRefresh={this.resetView} />
							</Animated.View>
						</LinearGradient>}

						{this.state.displayTransactionDetail &&
						<Animated.View style={[styles.transactionDetail, { opacity: this.state.transactionDetailOpacity }]}>
							<TransactionDetail blacklistTransaction={() => this.props.blacklistTransaction({ transaction: this.props.wallet.selectedTransaction.hash, wallet: this.props.wallet.selectedWallet, selectedCrypto: this.props.wallet.selectedCrypto })} transaction={this.props.wallet.selectedTransaction} selectedCrypto={this.props.wallet.selectedCrypto} cryptoUnit={this.props.settings.cryptoUnit} exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]} currentBlockHeight={this.props.wallet.blockHeight[this.props.wallet.selectedCrypto]} />
						</Animated.View>}

					</View>

				</Animated.View>

				{this.state.displayXButton &&
				<Animated.View style={[styles.xButton, { opacity: this.state.xButtonOpacity }]}>
					<XButton
						style={{ borderColor: this.state.displayTransactionList ? "transparent": colors.white }}
						onPress={this.resetView}/>
				</Animated.View>}
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
		flex: 2,
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
		...systemWeights.bold,
		color: colors.purple,
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
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("./src/actions/user");
const walletActions = require("./src/actions/wallet");
const settingsActions = require("./src/actions/settings");
const transactionActions = require("./src/actions/transaction");

const mapStateToProps = ({...state}, props) => ({
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