import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Animated,
	LayoutAnimation,
	ScrollView,
	Switch,
	ActivityIndicator,
	Platform,
	InteractionManager
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import XButton from "./XButton";
import Fade from "./Fade";
import PinPad from "./PinPad";
import ImportPhrase from "./ImportPhrase";
import ElectrumOptions from "./ElectrumOptions";
import * as electrum from "../utils/electrum";
import nodejs from "nodejs-mobile-react-native";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	resetKeychainValue,
	getKeychainValue
} = require("../utils/helpers");
const {
	getCoinData
} = require("../utils/networks");
const moment = require("moment");

class Settings extends PureComponent<Props> {
	constructor(props) {
		super(props);
		this.state = {
			displaySettings: true,
			settingsOpacity: new Animated.Value(0),

			displayPin: false,
			pinOpacity: new Animated.Value(0),

			displayBackupPhrase: false,
			backupPhraseOpacity: new Animated.Value(0),
			backupPhrase: "",

			displayImportPhrase: false,
			importPhraseOpacity: new Animated.Value(0),

			displayElectrumOptions: false,
			electrumOptionsOpacity: new Animated.Value(0),

			rescanningWallet: false
		};
	}

	async componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			try {
				this.updateSettings({ display: true, duration: 800 });
			} catch (e) {
				console.log(e);
			}
		});
	}

	componentDidUpdate() {
		Platform.OS === "ios" ? LayoutAnimation.easeInEaseOut() : null;
	}

	HeaderRow({ header = "", title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", gradientColors = ["#ffffff", "#ffffff"], onPress = () => null, headerStyle = {}, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
					<LinearGradient style={styles.row} colors={gradientColors} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>

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

					</LinearGradient>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}

	Row({ title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", gradientColors = ["#ffffff", "#ffffff"], onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
					<LinearGradient style={styles.row} colors={gradientColors} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
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

					</LinearGradient>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}

	SwitchRow({ title = "", value = "", onPress = () => null, setting = "", col1Style = {}, col2Style = {}, titleStyle = {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(setting)} activeOpacity={1} style={styles.rowContainer}>
					<View style={[styles.row, { paddingHorizontal: 10 }]}>
						<View style={[styles.col1, { flex: 0.6, alignItems: "flex-start" }, col1Style]}>
							<Text style={[styles.title, titleStyle]}>{title}</Text>
						</View>
						<TouchableOpacity onPress={() => onPress(value)} style={[styles.col2, { flex: 0.4, alignItems: "flex-end" }, col2Style]}>
							<Switch ios_backgroundColor={colors.gray} thumbColor={colors.purple} trackColor={{false: colors.gray, true: colors.gray}} value={this.props.settings[setting]} onValueChange={() => onPress(setting)} />
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}

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
				).start(() => {
					//Perform any other action after the update has been completed.
					resolve({ error: false });
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

	updateBackupPhrase = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayBackupPhrase: display });
				Animated.timing(
					this.state.backupPhraseOpacity,
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

	updateImportPhrase = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayImportPhrase: display });
				Animated.timing(
					this.state.importPhraseOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					//if (display === false) this.setState({ displayImportPhrase: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	updateElectrumOptions = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayElectrumOptions: display });
				Animated.timing(
					this.state.electrumOptionsOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					//if (display === false) this.setState({ displayImportPhrase: display });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
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
				this.updatePin({ display: true });
				this.updateSettings({ display: false });

			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleSetting = (setting = "") => {
		//alert(this.props.settings[setting]);
		this.props.updateSettings({ [setting]: !this.props.settings[setting] });
	};

	onPinSuccess = () => {
		try {
			//Hide the PinPad View
			this.updatePin({ display: false });
			//Show the Settings View
			this.updateSettings({ display: true });
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
				this.updatePin({ display: false });
				//Show the Settings View
				this.updateSettings({ display: true });
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
				this.updateImportPhrase({ display: false });
				//Show the Settings View
				this.updateSettings({ display: true });
				return;
			}
			if (this.state.displayElectrumOptions) {
				//Hide ImportPhrase component
				this.updateElectrumOptions({ display: false });
				//Show the Settings View
				this.updateSettings({ display: true });
				return;
			}
			this.props.onBack();
		} catch (e) {}
	};

	getBackupWalletValue = () => {
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			if (this.props.wallet[selectedWallet].hasBackedUpWallet) {
				return `Wallet last backed up on\n${moment(this.props.wallet[selectedWallet].walletBackupTimestamp).format('l @ h:mm a')}.`;
			} else {
				return "Wallet has not\nbeen backed up.";
			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleBackupPhrase = async ({ selectedWallet = "", display = false }) => {
		try {
			if (!selectedWallet) return;
			if (display) {
				//Fetch Recovery Phrase
				const keychainResult = await getKeychainValue({key: selectedWallet});
				if (keychainResult.error === true) return;
				const mnemonic = keychainResult.data.password;
				await this.setState({ backupPhrase: mnemonic });
				this.updateSettings({ display: false });
				await this.updateBackupPhrase({display: true});
				this.props.updateWallet({
					[selectedWallet]: {
						...this.props.wallet[selectedWallet],
						hasBackedUpWallet: true,
						walletBackupTimestamp: moment()
					}
				});
			} else {
				this.setState({backupPhrase: ""});
				this.updateSettings({ display: true });
				this.updateBackupPhrase({display: false});
			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleImportPhrase = async ({ display = false }) => {
		try {
			if (display) {
				this.updateSettings({ display: false });
				await this.updateImportPhrase({ display: true });
			} else {
				this.updateSettings({ display: true });
				this.updateImportPhrase({display: false});
			}
		} catch (e) {

		}
	};

	toggleElectrumOptions = async ({ display = false }) => {
		try {
			if (display) {
				this.updateSettings({ display: false });
				await this.updateElectrumOptions({ display: true });
			} else {
				this.updateSettings({ display: true });
				this.updateElectrumOptions({display: false});
			}
		} catch (e) {
			console.log(e);
		}
	};

	reconnectToPeer = async () => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			await electrum.stop({ coin: selectedCrypto });
			await electrum.start({
				coin: selectedCrypto,
				peers: this.props.settings.peers[selectedCrypto],
				customPeers: this.props.settings.customPeers[selectedCrypto]
			});
		} catch (e) {
			console.log(e);
		}
	};


	rescanWallet = async () => {
		await nodejs.start("main.js");
		try {
			await this.setState({ rescanningWallet: true });
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			await electrum.stop({ coin: selectedCrypto });
			await electrum.start({
				coin: selectedCrypto,
				peers: this.props.settings.peers[selectedCrypto],
				customPeers: this.props.settings.customPeers[selectedCrypto]
			});


			await this.props.updateWallet({
				[selectedWallet]: {
					...this.props.wallet[selectedWallet],
					addressIndex: {
						...this.props.wallet[selectedWallet].addressIndex,
						[selectedCrypto]: 0
					},
					changeAddressIndex: {
						...this.props.wallet[selectedWallet].changeAddressIndex,
						[selectedCrypto]: 0
					},
					addresses: {
						...this.props.wallet[selectedWallet].addresses,
						[selectedCrypto]: []
					},
					transactions: {
						...this.props.wallet[selectedWallet].transactions,
						[selectedCrypto]: []
					},
					utxos: {
						...this.props.wallet[selectedWallet].utxos,
						[selectedCrypto]: []
					},
					confirmedBalance: {
						...this.props.wallet[selectedWallet].confirmedBalance,
						[selectedCrypto]: 0
					},
					unconfirmedBalance: {
						...this.props.wallet[selectedWallet].unconfirmedBalance,
						[selectedCrypto]: 0
					}
				}
			});


			await this.props.getNextAvailableAddress({ addresses: [], changeAddresses: [], addressIndex: 0, changeAddressIndex: 0, indexThreshold: 1, selectedCrypto, selectedWallet, wallet: selectedWallet });
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

	getBackupPhrase = () => {
		const backupPhrase = this.state.backupPhrase.split(" ");
		let phrase = "";
		for (let i = 0; i < backupPhrase.length; i++) {
			try { if (backupPhrase[i]) phrase = phrase.concat(`${i + 1}.   ${backupPhrase[i]}\n`); } catch (e) {}
		}
		return phrase;
	};

	render() {
		const coinDataLabel = getCoinData({ selectedCrypto: this.props.wallet.selectedCrypto, cryptoUnit: "BTC" });
		return (
			<View style={styles.container}>

				<Animated.View style={{ flex: 1, opacity: this.state.settingsOpacity }}>
					<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{flexGrow:1}} style={{ flex: 1, paddingTop: 20 }}>
						<TouchableOpacity activeOpacity={1} style={styles.container}>
							{this.props.settings.biometricsIsSupported &&
							this.SwitchRow({ setting: "biometrics", title: `Enable ${this.props.settings.biometricTypeSupported}`, onPress: this.toggleSetting })
							}
							{this.SwitchRow({ setting: "pin", title: "Enable Pin", onPress: this.togglePin })}

							<View style={styles.rowContainer}>
								<LinearGradient style={styles.row} colors={["#ffffff", "#ffffff"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
									<View>
										<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
											<Text style={styles.title}>Crypto Units</Text>
										</View>
										<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
											<TouchableOpacity onPress={() => this.updateCryptoUnit("BTC")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "BTC" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "BTC" ? colors.white : colors.purple}]}>{coinDataLabel.acronym}</Text>
											</TouchableOpacity>
											{/*
											<TouchableOpacity onPress={() => this.updateCryptoUnit("mBTC")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "mBTC" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "mBTC" ? colors.white : colors.purple}]}>{`m${coinDataLabel}`}</Text>
											</TouchableOpacity>
											<TouchableOpacity onPress={() => this.updateCryptoUnit("μBTC")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "μBTC" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "μBTC" ? colors.white : colors.purple}]}>{`μ${coinDataLabel}`}</Text>
											</TouchableOpacity>*/}
											<TouchableOpacity onPress={() => this.updateCryptoUnit("satoshi")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "satoshi" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "satoshi" ? colors.white : colors.purple}]}>{coinDataLabel.satoshi}</Text>
											</TouchableOpacity>
										</View>
									</View>
								</LinearGradient>
							</View>

							{this.HeaderRow({
								header: "Connected To:",
								value: `${this.getPeerInfo().host}:${this.getPeerInfo().port}`,
								onPress: this.reconnectToPeer,
								col1Style: { flex: 0 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 10, marginTop: 5 }
							})}


							{this.Row({
								title: "",
								value: "Electrum Options",
								onPress: () => this.toggleElectrumOptions({ display: true }),
								gradientColors: [colors.white, colors.white],
								col1Image: "alpha-e-box",
								col1ImageColor: colors.purple,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: colors.purple },
								valueStyle: { color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }
							})}

							{this.Row({
								title: "",
								value: "Import Mnemonic Phrase",
								onPress: () => this.toggleImportPhrase({ display: true }),
								gradientColors: [colors.white, colors.white],
								col1Image: "import",
								col1ImageColor: colors.purple,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: colors.purple },
								valueStyle: { color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }
							})}

							{this.Row({
								title: "Backup Wallet",
								value: this.getBackupWalletValue(),
								onPress: () => this.toggleBackupPhrase({ selectedWallet: this.props.wallet.selectedWallet, display: true }),
								gradientColors: this.props.wallet[this.props.wallet.selectedWallet].hasBackedUpWallet ? [colors.white, colors.white] : ["#fb6f73", "#fb6f73", "#fd676a", "#fd676a"],
								col1Image: "wallet",
								col1ImageColor: this.props.wallet[this.props.wallet.selectedWallet].hasBackedUpWallet ? colors.purple : colors.white,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: this.props.wallet[this.props.wallet.selectedWallet].hasBackedUpWallet ? colors.purple : colors.white },
								valueStyle: { color: this.props.wallet[this.props.wallet.selectedWallet].hasBackedUpWallet ? colors.purple : colors.white, fontSize: 16, textAlign: "center", fontWeight: this.props.settings.hasBackedUpWallet ? "normal" : "bold" }
							})}

							{this.Row({
								title: "Rescan Wallet",
								col2Loading: this.state.rescanningWallet,
								col2Image: "radar",
								onPress: this.rescanWallet,
								col1Style: { flex: 1, alignItems: "flex-start", justifyContent: "center", paddingHorizontal: 10 },
								col2Style: { flex: 0.5, alignItems: "center", justifyContent: "center" }
							})}

							<View style={{ paddingVertical: 70 }} />
						</TouchableOpacity>

					</ScrollView>
					<View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
						<Fade size={100} />
					</View>
				</Animated.View>

				{this.state.displayPin &&
					<View style={styles.pinPad}>
						<PinPad onSuccess={this.onPinSuccess} pinSetup={true} />
					</View>
				}

				{this.state.displayBackupPhrase &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.backupPhraseOpacity }]}>
					<Text style={[styles.headerText, { position: "absolute", top: 25, left: 0, right: 0 }]}> {this.props.wallet.selectedWallet.split('wallet').join('Wallet ')} </Text>
					{this.Row({
						value: this.getBackupPhrase(),
						onPress: () => this.toggleBackupPhrase({ selectedWallet: this.props.wallet.selectedWallet, display: false }),
						col1Style: { flex: 0.1 },
						col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
						valueStyle: { color: colors.purple, textAlign: "left", paddingHorizontal: 20, fontWeight: "bold" }
					})}
				</Animated.View>
				}

				{this.state.displayImportPhrase &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.importPhraseOpacity, zIndex: 500 }]}>
					<ImportPhrase onBack={this.onBack} createNewWallet={this.props.createNewWallet} />
				</Animated.View>
				}

				{this.state.displayElectrumOptions &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.electrumOptionsOpacity, zIndex: 500 }]}>
					<ElectrumOptions onBack={this.onBack} />
				</Animated.View>
				}

				{!this.state.displayImportPhrase &&
				<Animated.View style={styles.xButton}>
					<XButton style={{ borderColor: "transparent" }} onPress={this.onBack} />
				</Animated.View>}

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
		minHeight: 80
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
	pinPad: {
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
	}
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