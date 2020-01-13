import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Animated,
	LayoutAnimation,
	ScrollView,
	ActivityIndicator,
	Platform,
	TextInput,
	Easing,
	Linking,
} from 'react-native';
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import DefaultModal from "./DefaultModal";
import XButton from "./XButton";
import PinPad from "./PinPad";
import ImportPhrase from "./ImportPhrase";
import ElectrumOptions from "./ElectrumOptions";
import SettingSwitch from "./SettingSwitch";
import SettingGeneral from "./SettingGeneral";
import SignMessage from "./SignMessage";
import VerifyMessage from "./VerifyMessage";
import * as electrum from "../utils/electrum";
import BackupPhrase from './BackupPhrase';

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	resetKeychainValue,
	getKeychainValue,
	capitalize,
	getExchangeRate,
	openUrl,
	setKeychainValue
} = require("../utils/helpers");
const {
	getCoinData,
	defaultWalletShape
} = require("../utils/networks");
const moment = require("moment");

const generalHelpItems = [
	{
		title: "Enable Pin:",
		text: "This option allows you to toggle the Pin on/off as a form of authentication when opening this app. Please be warned, if you enable this option and forget your pin the app's data will be wiped after 5 failed attempts. Make sure to write down your mnemonic phrase prior to enabling this option."
	},
	{
		title: "Enable Testnet:",
		text: "This option allows you to toggle the Testnet coins on/off from the coin selection menu. If you do not require the use of any Testnet coins feel free to disable this option."
	},
	{
		title: "Enable RBF (Replace-By-Fee):",
		text: "This option allows you to toggle RBF (Replace-By-Fee) on/off for Bitcoin & Bitcoin Testnet. By enabling this option you are able to increase the fee of a sent, 0-confirmation transaction. This ultimately allows you to decrease the amount of time you have to wait for the transaction to confirm. Note: You are only able to increase the fee of 0-confirmation transactions that were sent while this option was enabled."
	},
	{
		title: "Send Transaction Fallback:",
		text: "If Electrum fails to broadcast a transaction for any reason this option, if enabled, will allow the app to use either Blockstream's api for Bitcoin or Chain.so's api for Litecoin to broadcast the transaction instead."
	},
	{
		title: "Exchange Rate Source:",
		text: `This option allows you to select where the app sources its data to determine the fiat price of Bitcoin & Litecoin.`
	},
	{
		title: "Crypto Units:",
		text: `This option allows you to select the specific crypto unit used to display the amount of Bitcoin & Litecoin in your wallet. Ex:\n1 BTC = 100,000,000 Satoshi\n1 Satoshi = 0.00000001 BTC`
	},
	{
		title: "Import Mnemonic Phrase:",
		text: "This option allows you to import a mnemonic seed or phrase. It can be commonly referred to as a seed phrase, seed recovery phrase or backup seed phrase and is usually a series of 12-24 words which store all the information needed to recover your wallet. This phrase is meant to be kept secret and should be written down and stored in a safe place in case you lose access to your wallet and need to recover your funds."
	},
	{
		title: "Electrum Options:",
		text: "This option allows you to input and connect to an electrum server of your choosing. Once added the app will utilize this server for all electrum related queries and cease using the default random servers."
	}
];

const walletHelpItems = [
	{
		title: "Wallet Name:",
		text: `This option allows you to either set or update the name of the currently selected wallet.`
	},
	{
		title: "Connected To:",
		text: `This option displays the Electrum server that you are currently connected to. At the time of this writing, tapping this option will connect you to a new Electrum server at random. If you have added a custom Electrum server via the "Electrum Options" menu for this coin the app will simply attempt to disconnect and reconnect to the specified server.`
	},
	{
		title: "Address Type:",
		text: `This option allows you to toggle between multiple address types for Bitcoin & Litecoin. At the time of this writing, the default is "Bech32" which will generate bc1 addresses for Bitcoin, tb1 addresses for Bitcoin Testnet, ltc1 addresses for Litecoin & tltc1 addresses for Litecoin Testnet.`
	},
	{
		title: "Key Derivation Path:",
		text: "This option allows you to toggle between common derivation paths used by other wallets and is most helpful to those with imported mnemonic phrases from wallets utilizing a different path."
	},
	{
		title: "BIP39 Passphrase:",
		text: "A BIP39 passphrase is completely optional. When included, the passphrase is mixed with the selected wallet's mnemonic phrase to create a unique master seed. Including a passphrase significantly increases the security of your wallet as an attacker would not only need to know what your mnemonic phrase is they would also need to know the passphrase in order to gain access to your funds. However, this also works the other way around. In order to recover funds you will need both the mnemonic phrase and the passphrase. So long as you understand and are comfortable with this, adding a passphrase is highly recommended."
	},
	{
		title: "Sign & Verify Messages:",
		text: "This option allows you to sign and share messages using any address from your currently selected wallet and also allows you to verify messages by providing the proper address, message and signature."
	},
	{
		title: "Wallet Backup:",
		text: "Tapping this item displays the mnemonic phrase for the currently selected wallet. This phrase is meant to be kept secret and should be written down and stored in a safe place in case you lose access to your wallet and need to recover your funds."
	},
	{
		title: "Rescan Wallet:",
		text: `Tapping this item prompts the wallet to rescan all addresses based on the selected "Key Derivation Path" starting at 0.`
	},
];

class Settings extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			displaySettings: true,
			settingsOpacity: new Animated.Value(1),
			
			displayPin: false,
			pinOpacity: new Animated.Value(0),
			
			displayBackupPhrase: false,
			backupPhraseOpacity: new Animated.Value(0),
			backupPhrase: "",
			
			displayImportPhrase: false,
			importPhraseOpacity: new Animated.Value(0),
			
			displaySignMessage: false,
			signMessageOpacity: new Animated.Value(0),
			
			displayVerifyMessage: false,
			verifyMessageOpacity: new Animated.Value(0),
			
			displayElectrumOptions: false,
			electrumOptionsOpacity: new Animated.Value(0),
			
			rescanningWallet: false,
			connectingToElectrum: false,
			
			displayGeneralHelp: false,
			displayWalletHelp: false,
			
			bip39PassphraseIsSet: false,
			bip39Passphrase: "",
			
			walletName: ""
		};
	}
	
	async componentDidMount() {
		//Attempt to determine if the bip39Passphrase is set
		try {
			const key = `${this.props.wallet.selectedWallet}passphrase`;
			const bip39PassphraseResult = await getKeychainValue({ key });
			if (bip39PassphraseResult.error === false && bip39PassphraseResult.data.password) {
				this.setState({ bip39PassphraseIsSet: true });
			}
		} catch (e) {}
		//Set walletName
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			if (this.props.wallet.wallets[selectedWallet].name) {
				this.setState({ walletName: this.props.wallet.wallets[selectedWallet].name });
			}
		} catch (e) {}
	}
	
	componentDidUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}
	
	HeaderRow({ header = "", title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", onPress = () => null, headerStyle = {}, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
					<View style={styles.row}>
						
						<View style={{ flex: 1 }}>
							<View style={{ alignItems: "center", justifyContent: "center" }}>
								{!col1Loading && col1Image === "" &&
								<View style={[styles.header, col1Style]}>
									<Text style={[styles.title, headerStyle]}>{header}</Text>
								</View>}
							</View>
							<View style={{ flexDirection: "row" }}>
								{!col1Loading && col1Image === "" &&
								<View style={[styles.col1, col1Style]}>
									<Text style={[styles.title, titleStyle]}>{title}</Text>
								</View>}
								{col1Loading &&
								<View style={[styles.col1, col1Style]}>
									<ActivityIndicator size="large" color={colors.lightPurple} />
								</View>}
								{!col1Loading && col1Image !== "" &&
								<View style={[styles.col1, col1Image]}>
									<MaterialCommunityIcons name={col1Image} size={50} color={col1ImageColor} />
								</View>
								}
								
								{!col2Loading && col2Image === "" &&
								<View style={[styles.col2, col2Style]}>
									<Text style={[styles.text, valueStyle]}>{value}</Text>
								</View>}
								{col2Loading &&
								<View style={[styles.col2, col2Style]}>
									<ActivityIndicator size="large" color={colors.lightPurple} />
								</View>}
								
								{!col2Loading && col2Image !== "" &&
								<View style={[styles.col2, col2Style]}>
									<MaterialCommunityIcons name={col2Image} size={50} color={colors.purple} />
								</View>
								}
							</View>
						</View>
					
					</View>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}
	
	_displayOption({ value = "", key = "", currentValue = "", onPress = () => null, optionsLength = 1 } = {}) {
		let width = 90/(optionsLength).toFixed(0);
		width = width.toString();
		width = `${width}%`;
		let isMatch = false;
		if (key) {
			isMatch = key.toLowerCase() === currentValue.toLowerCase();
		} else {
			isMatch = currentValue.toLowerCase() === value.toLowerCase();
		}
		return (
			<TouchableOpacity key={value} onPress={onPress} style={[styles.cryptoUnitButton, { width, backgroundColor: isMatch ? colors.lightPurple : colors.white }]}>
				<Text style={[styles.text, { color: isMatch ? colors.white : colors.purple}]}>{value}</Text>
			</TouchableOpacity>
		);
	}
	MultiOptionRow({ title = "", subTitle = "", currentValue = "", options = [{ key: "", value: "", onPress: () => null }], subTitleIsLink = false } = {}) {
		const optionsLength = options.length;
		try {
			return (
				<View style={styles.rowContainer}>
					<View style={styles.row}>
						<View>
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
								<Text style={styles.title}>{title}</Text>
								{subTitle !== "" && !subTitleIsLink && <Text style={styles.subTitle}>{subTitle}</Text>}
								{subTitle !== "" && subTitleIsLink &&
								<TouchableOpacity onPress={() => openUrl(`https://${subTitle}`)} style={{ alignItems: "center", justifyContent: "center" }}>
									<Text style={styles.subTitle}>{subTitle}</Text>
								</TouchableOpacity>}
							</View>
							<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 20 }}>
								{options.map((option) => this._displayOption({ ...option, optionsLength, currentValue}))}
							</View>
						</View>
					</View>
				</View>
			);
		} catch (e) {}
	}
	
	TextInputRow({ title = "", subTitle = "", currentValue = "", onChangeText = () => null, onPress = () => null, secureTextEntry = true, submitText = "Add Passphrase" } = {}) {
		try {
			return (
				<View style={styles.rowContainer}>
					<View style={styles.row}>
						<View>
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
								<Text style={styles.title}>{title}</Text>
								<TextInput
									style={styles.textInput}
									secureTextEntry={secureTextEntry}
									autoCapitalize="none"
									autoCompleteType="off"
									autoCorrect={false}
									selectionColor={colors.lightPurple}
									onChangeText={onChangeText}
									value={currentValue}
									placeholder={subTitle}
								/>
							</View>
							<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 20 }}>
								{this._displayOption({ value: submitText, optionsLength: 1, currentValue: submitText, onPress})}
							</View>
						</View>
					</View>
				</View>
			);
		} catch (e) {}
	}
	
	updateItems = (items = []) => {
		return new Promise(async (resolve) => {
			try {
				let itemsToDisplay = {};
				let itemsToHide = {};
				let animations = [];
				let onCompleteFuncs = [];
				
				await Promise.all(items.map(async ({ stateId = "", opacityId = "", display = false, duration = 400, onComplete = null } = {}) => {
					try {
						//Return if the desired value is already set for the given stateId
						if (this.state[stateId] === display) return;
						
						//Push all onComplete functions into an array to call once the animation completes
						try {if (typeof onComplete === "function") onCompleteFuncs.push(onComplete);} catch (e) {}
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
						} catch (e) {console.log(e);}
					} catch (e) {}
				}));
				//Display necessary items
				if (Object.entries(itemsToDisplay).length !== 0 && itemsToDisplay.constructor === Object) this.setState(itemsToDisplay);
				//Start Animations.
				Animated.parallel(animations).start(async() => {
					//Perform any other action after the update has been completed.
					//Hide necessary items
					if (Object.entries(itemsToHide).length !== 0 && itemsToHide.constructor === Object) this.setState(itemsToHide);
					
					//Call all onComplete functions
					onCompleteFuncs.map((onComplete) => {try {onComplete();} catch (e) {}});
					resolve({ error: false });
				});
				
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};
	
	toggleTestnet = async () => {
		try {
			this.props.updateSettings({ testnet: !this.props.settings.testnet });
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleRBF = async () => {
		try {
			this.props.updateSettings({ rbf: !this.props.settings.rbf });
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleSendTransactionFallback = async () => {
		try {
			this.props.updateSettings({ sendTransactionFallback: !this.props.settings.sendTransactionFallback });
		} catch (e) {
			console.log(e);
		}
	};
	
	togglePin = async () => {
		try {
			if (this.props.settings.pin) {
				//Reset Previous Pin & Set Pin To False In Settings.
				await resetKeychainValue({ key: "pin" });
				this.props.updateSettings({ pin: false });
			} else {
				//Prompt User To Set A Pin.
				this.props.updateSettings({ pin: true });
				const items = [
					{ stateId: "displayPin", opacityId: "pinOpacity", display: true },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: false },
				];
				this.updateItems(items);
				
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleSetting = (setting = "") => {
		this.props.updateSettings({ [setting]: !this.props.settings[setting] });
	};
	
	onPinSuccess = () => {
		try {
			//Hide the PinPad View
			//Show the Settings View
			const items = [
				{ stateId: "displayPin", opacityId: "pinOpacity", display: false },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true },
			];
			this.updateItems(items);
		} catch (e) {
			console.log(e);
		}
	};
	
	onBack = () => {
		try {
			//If the user cancels out of the PinPad view
			if (this.state.displayPin) {
				//Remove Saved Pin
				resetKeychainValue({ key: "pin" });
				//Hide the PinPad View
				//Show the Settings View
				const items = [
					{ stateId: "displayPin", opacityId: "pinOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true },
				];
				this.updateItems(items);
				
				//Set pin to false in settings.
				this.props.updateSettings({ pin: false });
				return;
			}
			if (this.state.displayBackupPhrase) {
				this.toggleBackupPhrase({ selectedWallet: this.props.wallet.selectedWallet, display: false });
				return;
			}
			if (this.state.displayImportPhrase) {
				//Hide ImportPhrase component
				//Show the Settings View
				const items = [
					{ stateId: "displayImportPhrase", opacityId: "importPhraseOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			if (this.state.displaySignMessage) {
				//Hide SignMessage component
				//Show the Settings View
				const items = [
					{ stateId: "displaySignMessage", opacityId: "signMessageOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			if (this.state.displayVerifyMessage) {
				//Hide VerifyMessage component
				//Show the Settings View
				const items = [
					{ stateId: "displayVerifyMessage", opacityId: "verifyMessageOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			if (this.state.displayElectrumOptions) {
				//Hide ElectrumOptions component
				//Show the Settings View
				const items = [
					{ stateId: "displayElectrumOptions", opacityId: "electrumOptionsOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			this.props.onBack();
		} catch (e) {}
	};
	
	getBackupWalletValue = () => {
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			const walletIndex = this.props.wallet.walletOrder.indexOf(selectedWallet);
			const walletName = `Wallet ${walletIndex}`;
			try {
				if (this.hasBackedUpWallet()) {
					return `${walletName} last backed up on\n${moment(this.props.wallet.wallets[selectedWallet].walletBackupTimestamp).format('l @ h:mm a')}.`;
				}
				return "Wallet has not\nbeen backed up.";
			} catch (e) {return "Wallet has not\nbeen backed up.";}
		} catch (e) {
			console.log(e);
			return "Wallet has not\nbeen backed up.";
		}
	};
	
	toggleBackupPhrase = async ({ selectedWallet = "", display = false }) => {
		try {
			if (!selectedWallet) return;
			const items = [
				{ stateId: "displayBackupPhrase", opacityId: "backupPhraseOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			if (display) {
				//Fetch Recovery Phrase
				const keychainResult = await getKeychainValue({key: selectedWallet});
				if (keychainResult.error === true) return;
				const mnemonic = keychainResult.data.password;
				await this.setState({ backupPhrase: mnemonic });
				this.updateItems(items);
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
				this.setState({backupPhrase: ""});
				this.updateItems(items);
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleImportPhrase = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displayImportPhrase", opacityId: "importPhraseOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {
		
		}
	};
	
	toggleSignMessage = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displaySignMessage", opacityId: "signMessageOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {
		
		}
	};
	
	toggleVerifyMessage = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displayVerifyMessage", opacityId: "verifyMessageOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {
		
		}
	};
	
	toggleElectrumOptions = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displayElectrumOptions", opacityId: "electrumOptionsOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {
			console.log(e);
		}
	};
	
	_resetWalletForPassphrase = async () => {
		try {
			const { selectedWallet } = this.props.wallet;
			const { lastUpdated, hasBackedUpWallet, walletBackupTimestamp, keyDerivationPath, addressType } = this.props.wallet.wallets[selectedWallet];
			this.props.updateWallet({
				wallets: {
					...this.props.wallet.wallets,
					[selectedWallet]: {
						...defaultWalletShape,
						lastUpdated,
						hasBackedUpWallet,
						walletBackupTimestamp,
						keyDerivationPath,
						addressType,
					}
				}
			});
		} catch (e) {}
	};
	
	addWalletName = async () => {
		try {
			const walletName = this.state.walletName;
			if (!walletName) return;
			const wallet = this.props.wallet.selectedWallet;
			this.props.updateWallet({
				...this.props.wallet,
				wallets: {
					...this.props.wallet.wallets,
					[wallet]: {
						...this.props.wallet.wallets[wallet],
						name: walletName
					}
				}
			});
		} catch (e) {}
	};
	
	addBip39Passphrase = async () => {
		try {
			const passphrase = this.state.bip39Passphrase;
			if (!passphrase) return;
			const wallet = this.props.wallet.selectedWallet;
			const key = `${wallet}passphrase`;
			await setKeychainValue({ key, value: passphrase });
			this.setState({ bip39PassphraseIsSet: true });
			await this._resetWalletForPassphrase();
			this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	removeBip39Passphrase = async () => {
		try {
			const wallet = this.props.wallet.selectedWallet;
			const key = `${wallet}passphrase`;
			this.setState({ bip39PassphraseIsSet: false, bip39Passphrase: "" });
			await resetKeychainValue({ key });
			await this._resetWalletForPassphrase();
			this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateKeyDerivationPath = async ({ keyDerivationPath = "84", rescanWallet = true } = {}) => {
		try {
			await this.updateWallet({ data: [{ key: "keyDerivationPath", value: keyDerivationPath }] });
			if (rescanWallet) this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateAddressType = async ({ addressType = "bech32", rescanWallet = true } = {}) => {
		try {
			let keyDerivationPath = "84";
			switch (addressType) {
				case "bech32":
					keyDerivationPath = "84";
					break;
				case "segwit":
					keyDerivationPath = "49";
					break;
				case "legacy":
					keyDerivationPath = "44";
					break;
				default:
					keyDerivationPath = "84";
					break;
			}
			await this.updateWallet({
				data:
					[
						{key: "addressType", value: addressType},
						{key: "keyDerivationPath", value: keyDerivationPath}
					]
			});
			if (rescanWallet) this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateWallet = async ({ data = [{ key: "", value: "" }] } = {}) => {
		try {
			if (!data) return;
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			
			let newData = {};
			await Promise.all(data.map(({ key = undefined, value = undefined } = {}) => {
					if (key && value) newData[key] = {...this.props.wallet.wallets[selectedWallet][key], [selectedCrypto]: value};
				})
			);
			await this.props.updateWallet({
				wallets: {
					...this.props.wallet.wallets,
					[selectedWallet]: {
						...this.props.wallet.wallets[selectedWallet],
						...newData
					}
				}
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	reconnectToPeer = async () => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			await this.setState({ connectingToElectrum: true });
			await electrum.stop({ coin: selectedCrypto });
			const start = await electrum.start({
				coin: selectedCrypto,
				peers: this.props.settings.peers[selectedCrypto],
				customPeers: this.props.settings.customPeers[selectedCrypto]
			});
			if (start.error === false) {
				//Set the new electrum peer.
				this.props.updateSettings({ currentPeer: start.data });
			}
			await this.setState({ connectingToElectrum: false });
		} catch (e) {
			console.log(e);
		}
	};
	
	rescanWallet = async () => {
		try {
			await this.setState({ rescanningWallet: true });
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const wallet = this.props.wallet.wallets[selectedWallet];
			await this.props.updateWallet({
				wallets: {
					...this.props.wallet.wallets,
					[selectedWallet]: {
						...wallet,
						addressIndex: {
							...wallet.addressIndex,
							[selectedCrypto]: 0
						},
						changeAddressIndex: {
							...wallet.changeAddressIndex,
							[selectedCrypto]: 0
						},
						addresses: {
							...wallet.addresses,
							[selectedCrypto]: []
						},
						changeAddresses: {
							...wallet.changeAddresses,
							[selectedCrypto]: []
						},
						transactions: {
							...wallet.transactions,
							[selectedCrypto]: []
						},
						utxos: {
							...wallet.utxos,
							[selectedCrypto]: []
						},
						confirmedBalance: {
							...wallet.confirmedBalance,
							[selectedCrypto]: 0
						},
						unconfirmedBalance: {
							...wallet.unconfirmedBalance,
							[selectedCrypto]: 0
						}
					}
				}
			});
			await this.props.refreshWallet();
			await this.setState({ rescanningWallet: false });
		} catch (e) {
			console.log(e);
		}
	};
	
	getPeerInfo = () => {
		try {
			return { host: this.props.settings.currentPeer.host, port: this.props.settings.currentPeer.port };
		} catch (e) {
			return { host: "No peer connected", port: "" };
		}
	};
	
	updateCryptoUnit = (cryptoUnit = "satoshi") => {
		try {
			this.props.updateSettings({ cryptoUnit });
		} catch (e) {
			console.log(e);
		}
	};
	
	updateExchangeRateService = async ({ selectedService = "coingecko" } = {}) => {
		try {
			await this.props.updateSettings({ selectedService });
			const { selectedWallet, selectedCrypto, selectedCurrency } = this.props.wallet;
			const exchangeRate = await getExchangeRate({ selectedCrypto, selectedCurrency, selectedService });
			if (exchangeRate.error === false) {
				await this.props.updateWallet({
					exchangeRate: {
						...this.props.wallet.exchangeRate,
						[selectedCrypto]: exchangeRate.data
					}
				});
				
				try {
					const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto] || [];
					const blacklistedUtxos = this.props.wallet.wallets[selectedWallet].blacklistedUtxos[selectedCrypto];
					this.props.updateBalance({ utxos, blacklistedUtxos, selectedCrypto, selectedWallet, wallet: selectedWallet });
				} catch (e) {
					//console.log(e);
				}
			}
		} catch (e) {
			//console.log(e);
		}
	};
	
	getExchangeRateSourceUrl = ({ selectedService = "coingecko"} = {}) => {
		try {
			switch (selectedService) {
				case "coingecko":
					return "coingecko.com";
				case "coincap":
					return "coincap.io";
				default: return "?";
			}
		} catch (e) {
			return "?";
		}
	};
	
	getBackupPhrase = () => {
		const backupPhrase = this.state.backupPhrase.split(" ");
		let phrase = [];
		backupPhrase.forEach((word, i) => phrase.push({ id: i+1, word: backupPhrase[i] }));
		return phrase;
	};
	
	getWalletName = () => {
		try {
			try { if (this.props.wallet.wallets[this.props.wallet.selectedWallet].name.trim() !== "") return this.props.wallet.wallets[this.props.wallet.selectedWallet].name; } catch (e) {}
			try { return `Wallet ${this.props.wallet.walletOrder.indexOf(this.props.wallet.selectedWallet)}`; } catch (e) {}
		} catch (e) {
			return "?";
		}
	};
	
	hasBackedUpWallet = () => {
		try {
			return this.props.wallet.wallets[this.props.wallet.selectedWallet].hasBackedUpWallet;
		} catch (e) {return false;}
	};
	
	render() {
		const { selectedWallet, selectedCrypto } = this.props.wallet;
		const coinTypePath = defaultWalletShape.coinTypePath[selectedCrypto];
		let coinDataLabel = "?";
		try {coinDataLabel = getCoinData({ selectedCrypto, cryptoUnit: "BTC" });} catch (e) {}
		let keyDerivationPath = "84";
		try {keyDerivationPath = this.props.wallet.wallets[selectedWallet].keyDerivationPath[selectedCrypto];} catch (e) {}
		let addressType = "bech32";
		try {addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];} catch (e) {}
		const cryptoLabel = capitalize(selectedCrypto);
		return (
			<View style={styles.container}>
				
				<Animated.View style={{ flex: 1, opacity: this.state.settingsOpacity }}>
					<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{flexGrow:1}} style={{ flex: 1, paddingTop: 20 }}>
						<TouchableOpacity activeOpacity={1} style={styles.container}>
							
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
								<View style={[styles.header, { marginBottom: 5 }]}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold" }]}>General Settings</Text>
									
									<TouchableOpacity onPress={() => this.setState({ displayGeneralHelp: true })} style={{ marginLeft: 10, alignItems: "center", justifyContent: "center" }}>
										<MaterialCommunityIcons name={"help-circle-outline"} size={26} color={colors.white} />
									</TouchableOpacity>
								
								</View>
								<View style={{ height: 1.5, backgroundColor: colors.white, width: "80%" }} />
							</View>
							
							{this.props.settings.biometricsIsSupported &&
								<SettingSwitch setting="biometrics" value={this.props.settings["biometrics"]} title={`Enable ${this.props.settings.biometricTypeSupported}`} onPress={() => this.toggleSetting("biometrics")} />
							}
							<SettingSwitch setting="pin" value={this.props.settings["pin"]} title="Enable Pin" onPress={this.togglePin} />
							<SettingSwitch setting="testnet" value={this.props.settings["testnet"]} title="Enable Testnet" onPress={this.toggleTestnet} />
							<SettingSwitch setting="rbf" value={this.props.settings["rbf"]} title="Enable RBF" onPress={this.toggleRBF} />
							<SettingSwitch setting="sendTransactionFallback" value={this.props.settings["sendTransactionFallback"]} title="Send Transaction Fallback" onPress={this.toggleSendTransactionFallback} />
							
							{this.MultiOptionRow({
								title: "Exchange Rate Source",
								subTitle: this.getExchangeRateSourceUrl({ selectedService: this.props.settings.selectedService}),
								subTitleIsLink: true,
								currentValue: this.props.settings.selectedService,
								options:[
									{value: "Coingecko", onPress: () => this.updateExchangeRateService({ selectedService: "coingecko" }) },
									{value: "CoinCap", onPress: () => this.updateExchangeRateService({ selectedService: "coincap" }) }
								]
							})}
							
							{this.MultiOptionRow({
								title: "Crypto Units",
								currentValue: this.props.settings.cryptoUnit,
								options:[
									{key: "BTC", value: coinDataLabel.acronym, onPress: () => this.updateCryptoUnit("BTC") },
									{key: "satoshi", value: coinDataLabel.satoshi, onPress: () => this.updateCryptoUnit("satoshi") }
								]
							})}
							
							<SettingGeneral
								title=""
								value="Import Mnemonic Phrase"
								onPress={() => this.toggleImportPhrase({ display: true })}
								col1Image={<MaterialCommunityIcons name="import" size={50} color={colors.purple} />}
								col2Style={{flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10}}
								titleStyle={{color: colors.purple}}
								valueStyle={{color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold"}}
							/>
							
							<SettingGeneral
								title=""
								value="Electrum Options"
								onPress={() => this.toggleElectrumOptions({ display: true })}
								col1Image={<MaterialCommunityIcons name="alpha-e-box" size={50} color={colors.purple} />}
								col2Style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 }}
								titleStyle={{ color: colors.purple }}
								valueStyle={{ color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }}
							/>
							
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
								<View style={styles.header}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold", textAlign: "center" }]}>{this.getWalletName()}</Text>
									
									<TouchableOpacity onPress={() => this.setState({ displayWalletHelp: true })} style={{ marginLeft: 10, alignItems: "center", justifyContent: "center" }}>
										<MaterialCommunityIcons name={"help-circle-outline"} size={26} color={colors.white} />
									</TouchableOpacity>
								
								</View>
								<View style={[styles.header, { marginBottom: 5 }]}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold", textAlign: "center" }]}>{`${cryptoLabel} Settings`}</Text>
								
								</View>
								<View style={{ height: 1.5, backgroundColor: colors.white, width: "80%" }} />
							</View>
							
							{this.TextInputRow({
								title: `Wallet Name (${this.state.walletName.length}/16)`,
								subTitle: `Wallet ${this.props.wallet.walletOrder.indexOf(selectedWallet)}`,
								currentValue: this.state.walletName || "",
								onChangeText: (walletName) => walletName.length < 17 ? this.setState({walletName}) : null,
								onPress: this.addWalletName,
								secureTextEntry: false,
								submitText: "Add Name"
							})}
							
							{this.HeaderRow({
								header: "Connected To:",
								value: `${this.getPeerInfo().host}:${this.getPeerInfo().port}`,
								onPress: this.reconnectToPeer,
								col2Loading: this.state.connectingToElectrum || !this.getPeerInfo().host,
								col1Style: { flex: 0 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 10, marginTop: 5 }
							})}
							
							{this.MultiOptionRow({
								title: "Address Type",
								currentValue: addressType,
								options:[
									{value: "Legacy", onPress: () => this.updateAddressType({ addressType: "legacy" }) },
									{value: "Segwit", onPress: () => this.updateAddressType({ addressType: "segwit" }) },
									{value: "Bech32", onPress: () => this.updateAddressType({ addressType: "bech32" }) },
								]
							})}
							
							{this.MultiOptionRow({
								title: "Key Derivation Path",
								subTitle: `m/${keyDerivationPath}'/${coinTypePath}'/0'/0/0`,
								currentValue: keyDerivationPath,
								options:[
									{value: "0", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "0" }) },
									{value: "44", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "44" }) },
									{value: "49", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "49" }) },
									{value: "84", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "84" }) },
								]
							})}
							
							{!this.state.bip39PassphraseIsSet &&
							this.TextInputRow({
								title: "BIP39 Passphrase",
								subTitle: "Enter your passphrase here...",
								currentValue: this.state.bip39Passphrase,
								onChangeText: (bip39Passphrase) => this.setState({bip39Passphrase}),
								onPress: this.addBip39Passphrase
							})
							}
							
							{this.state.bip39PassphraseIsSet &&
							this.MultiOptionRow({
								title: "BIP39 Passphrase",
								subTitle: "o-o-o-o",
								currentValue: "Remove Passphrase",
								options:[
									{value: "Remove Passphrase", onPress: this.removeBip39Passphrase }
								]
							})}
							
							{this.MultiOptionRow({
								title: "Sign & Verify Messages",
								currentValue: addressType,
								options:[
									{value: "Sign", onPress: () => this.toggleSignMessage({ display: true }) },
									{value: "Verify", onPress: () => this.toggleVerifyMessage({ display: true }) }
								]
							})}
							
							<SettingGeneral
								title="Backup Wallet"
								value={this.getBackupWalletValue()}
								onPress={() => this.toggleBackupPhrase({ selectedWallet, display: true })}
								rowStyle={this.hasBackedUpWallet() ? { backgroundColor: colors.white } : { backgroundColor: colors.red }}
								col1Image={<MaterialCommunityIcons name="wallet" size={50} color={this.hasBackedUpWallet() ? colors.purple : colors.white} />}
								col2Style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 }}
								titleStyle={{ color: this.hasBackedUpWallet() ? colors.purple : colors.white }}
								valueStyle={{ color: this.hasBackedUpWallet() ? colors.purple : colors.white, fontSize: 16, textAlign: "center", fontWeight: this.hasBackedUpWallet() ? "normal" : "bold" }}
							/>
							
							<SettingGeneral
								value={`Rescan ${this.getWalletName()}\n${cryptoLabel} Wallet`}
								col1Loading={this.state.rescanningWallet}
								col1Image={<MaterialCommunityIcons name="radar" size={50} color={colors.purple} />}
								onPress={this.rescanWallet}
								valueStyle={{ color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }}
								col2Style={{ flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" }}
							/>
							
							<SettingGeneral
								value={`Need Some Help?\nsupport@ferrymanfin.com`}
								col1Image={<FontAwesome name="support" size={50} color={colors.purple} />}
								onPress={() => Linking.openURL("mailto:support@ferrymanfin.com?subject=Requesting Some Help").catch((e) => console.log(e))}
								valueStyle={{ color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }}
								col2Style={{ flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" }}
							/>

							<View style={{ paddingVertical: 70 }} />
						</TouchableOpacity>
					
					</ScrollView>
				</Animated.View>
				
				{this.state.displayPin &&
					<Animated.View style={[styles.settingContainer, { opacity: this.state.pinOpacity }]}>
						<PinPad onSuccess={this.onPinSuccess} pinSetup={true} updateSettings={this.props.updateSettings} />
					</Animated.View>
				}
				
				{this.state.displayBackupPhrase &&
				<Animated.View style={[styles.settingContainer, { opacity: this.state.backupPhraseOpacity }]}>
					<Text style={[styles.headerText, { position: "absolute", top: 20, left: 0, right: 0 }]}>{this.getWalletName()}</Text>
					<BackupPhrase
						phrase={this.getBackupPhrase()}
						onPress={() => this.toggleBackupPhrase({ selectedWallet, display: false })}
					/>
				</Animated.View>
				}
				
				{this.state.displayImportPhrase &&
				<Animated.View style={[styles.settingContainer, { opacity: this.state.importPhraseOpacity, zIndex: 500 }]}>
					<ImportPhrase onBack={this.onBack} createNewWallet={this.props.createNewWallet} />
				</Animated.View>
				}
				
				{this.state.displaySignMessage &&
				<Animated.View style={[styles.settingContainer, { opacity: this.state.signMessageOpacity, zIndex: 500 }]}>
					<SignMessage
						selectedCrypto={selectedCrypto}
						selectedWallet={selectedWallet}
						derivationPath={this.props.wallet.wallets[selectedWallet].keyDerivationPath[selectedCrypto]}
						addressType={this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto]}
						onBack={this.onBack}
						addresses={this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto]}
					/>
				</Animated.View>
				}
				
				{this.state.displayVerifyMessage &&
				<Animated.View style={[styles.settingContainer, { opacity: this.state.verifyMessageOpacity, zIndex: 500 }]}>
					<VerifyMessage
						selectedCrypto={selectedCrypto}
						onBack={this.onBack}
					/>
				</Animated.View>
				}
				
				{this.state.displayElectrumOptions &&
				<Animated.View style={[styles.settingContainer, { opacity: this.state.electrumOptionsOpacity, zIndex: 500 }]}>
					<ElectrumOptions onBack={this.onBack} />
				</Animated.View>
				}
				
				{!this.state.displayImportPhrase &&
				<Animated.View style={styles.xButton}>
					<XButton style={{ borderColor: "transparent", zIndex: 1000 }} onPress={this.onBack} />
				</Animated.View>}
				
				<DefaultModal
					isVisible={this.state.displayGeneralHelp}
					onClose={() => this.setState({ displayGeneralHelp: false })}
					contentStyle={styles.modalContent}
				>
					{this.props.settings.biometricsIsSupported &&
					<View style={styles.helpRow}>
						<Text style={styles.helpTitle}>Enable FaceID:</Text>
						<Text style={styles.helpText}>This option allows you to toggle FaceID on/off as a form of authentication when opening this app.</Text>
					</View>}
					{generalHelpItems.map(({ title, text }) => (
						<View key={title} style={styles.helpRow}>
							<Text style={styles.helpTitle}>{title}</Text>
							<Text style={styles.helpText}>{text}</Text>
						</View>
					))}
					<View style={{ paddingVertical: "40%" }} />
				</DefaultModal>
				
				<DefaultModal
					isVisible={this.state.displayWalletHelp}
					onClose={() => this.setState({ displayWalletHelp: false })}
					contentStyle={styles.modalContent}
				>
					{walletHelpItems.map(({ title, text }) => (
						<View key={title} style={styles.helpRow}>
							<Text style={styles.helpTitle}>{title}</Text>
							<Text style={styles.helpText}>{text}</Text>
						</View>
					))}
					<View style={{ paddingVertical: "40%" }} />
				</DefaultModal>
			
			</View>
		);
	}
}

Settings.defaultProps = {
	createNewWallet: () => null,
	onBack: () => null,
	refreshWallet: () => null
};

Settings.propTypes = {
	createNewWallet: PropTypes.func.isRequired,
	onBack: PropTypes.func.isRequired,
	refreshWallet: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	rowContainer: {
		width: "100%",
		backgroundColor: "transparent",
		alignItems: "center",
		marginBottom: 20
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.white,
		borderRadius: 11.5,
		width: "80%",
		minHeight: 80,
		paddingVertical: 10
	},
	cryptoUnitButton: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 5,
		width: "40%",
		borderWidth: 1,
		borderColor: colors.lightPurple,
		marginHorizontal: 5,
		paddingVertical: 4
	},
	settingContainer: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	col1: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
	},
	col2: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	helpRow: {
		marginBottom: 10,
	},
	helpTitle: {
		...systemWeights.semibold,
		color: colors.darkPurple,
		fontSize: 22,
		textAlign: "left"
	},
	helpText: {
		...systemWeights.regular,
		color: colors.darkPurple,
		fontSize: 18,
		textAlign: "left"
	},
	title: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 20,
		textAlign: "left"
	},
	text: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left"
	},
	subTitle: {
		...systemWeights.light,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left"
	},
	header: {
		flexDirection: "row",
		alignItems: "center"
	},
	headerText: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 24,
		textAlign: "center"
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
	},
	modalContent: {
		borderWidth: 5,
		borderRadius: 20,
		borderColor: colors.lightGray
	},
	textInput: {
		flex: 1,
		height: 30,
		width: "90%",
		borderRadius: 5,
		padding: 5,
		backgroundColor: colors.white,
		borderColor: colors.lightPurple,
		borderWidth: 1,
		color: colors.purple,
		fontWeight: "bold"
	},
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("../actions/user");
const walletActions = require("../actions/wallet");
const transactionActions = require("../actions/transaction");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...userActions,
		...walletActions,
		...transactionActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(Settings);
