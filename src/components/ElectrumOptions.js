import React, { PureComponent } from 'react';
import {
	StyleSheet,
	View,
	TextInput,
	Dimensions,
	Animated,
	TouchableOpacity,
	ScrollView,
	Text,
	FlatList
} from 'react-native';
import {systemWeights} from "react-native-typography/dist/index";
import XButton from "./XButton";
import Button from "./Button";
import * as electrum from "../utils/electrum";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	availableCoins
} = require("../utils/networks");
const {
	capitalize
} = require("../utils/helpers");
const { height } = Dimensions.get("window");

class ElectrumInput extends PureComponent {
	testConnection = () => {
		this.props.testConnection(this.props.coin);
	};
	
	savePeer = () => {
		this.props.savePeer(this.props.coin);
	};
	
	clearPeer = () => {this.props.clearPeer(this.props.coin);};
	
	getDefaultPort = () => {
		try {return this.props.coin.toLowerCase().includes("testnet") ? "51002" : "50002";} catch (e) {return "50002";}
	};
	
	render() {
		let savedHost = "";
		let savedPort = "";
		try {
			savedHost = this.props.customPeers[this.props.coin][0].host;
			savedPort = this.props.customPeers[this.props.coin][0].port;
		} catch (e) {}
		return (
			<View style={styles.textInputContainer}>
				<Text style={styles.title}>{this.props.title}</Text>
				<View style={styles.textInputRow}>
					<Text style={styles.textInputTitle}>Host: </Text>
					<TextInput
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						onChangeText={(host) => this.props.onChangeText({coin: this.props.coin, value: { host, port: this.props.port } })}
						value={this.props.host}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						multiline={false}
						placeholder={this.props.hostPlaceholder}
					/>
				</View>
				<View style={styles.textInputRow}>
					<Text style={styles.textInputTitle}>Port: </Text>
					<TextInput
						style={styles.textInput}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						selectionColor={colors.lightPurple}
						keyboardType="decimal-pad"
						onChangeText={(port) =>  {if (!isNaN(port) || port === "") this.props.onChangeText({coin: this.props.coin, value: { port, host: this.props.host } });}}
						value={this.props.port}
						multiline={false}
						placeholder={this.getDefaultPort()}
					/>
				</View>
				<View style={styles.row}>
					<Button
						title="Clear"
						onPress={this.clearPeer}
						style={styles.leftButton}
						titleStyle={{ fontSize: 14 }}
					/>
					<Button
						loading={this.props.loading === this.props.coin}
						title="Test"
						onPress={this.testConnection}
						style={styles.leftButton}
						titleStyle={{ fontSize: 14 }}
					/>
					<Button
						loading={this.props.saving === this.props.coin}
						title={this.props.port === savedPort && this.props.host === savedHost ? "Saved" : "Save"}
						onPress={this.savePeer}
						style={styles.rightButton}
						titleStyle={{ fontSize: 14 }}
					/>
				</View>
			</View>
		);
	}
}

ElectrumInput.defaultProps = {
	coin: "",
	title: "",
	host: "",
	port: "",
	loading: "",
	saving: "",
	hostPlaceholder: "",
	portPlaceholder: "",
	customPeers: {},
	onChangeText: () => null,
	testConnection: () => null,
	savePeer: () => null
};

const validateInput = ({ host = "", port = "" } = {}) => {
	try {
		//Ensure the user passed in a host & port to test.
		let data = "";
		if (host === "" && port === "") {
			data = "Please specify a host and port to connect to.";
		} else if (host === "") {
			data = "Please specify a host to connect to.";
		} else if (port === "") {
			data = "Please specify a port to connect to.";
		} else if (isNaN(port)) {
			data = "Invalid port.";
		}
		return ({ error: data !== "", data });
	} catch (e) {console.log(e);}
};

class ElectrumOptions extends PureComponent {
	
	constructor(props) {
		super(props);
		let coins = {};
		const availableCoinsLength = availableCoins.length;
		for (let i = 0; i < availableCoinsLength; i++) {
			const coin = availableCoins[i];
			let host = "";
			let port = "";
			try { host = props.settings.customPeers[coin][0].host; } catch (e) {}
			try { port = props.settings.customPeers[coin][0].port; } catch (e) {}
			coins[coin] = { host, port };
		}
		this.state = {
			availableCoins,
			...coins,
			loading: ""
		};
	}
	
	updateState = ({ coin, value }) => {
		this.setState({ [coin]: value });
	};
	
	testConnection = async (coin) => {
		try {
			await this.setState({ loading: coin });
			const host = this.state[coin].host.trim();
			const port = this.state[coin].port.trim();
			
			const inputIsValid = await validateInput({ host, port });
			if (inputIsValid.error) {
				await this.setState({ loading: "", saving: "" });
				alert(inputIsValid.data);
				return;
			}
			
			const result = await electrum.start({ coin, customPeers: [{ host, port }]});
			if (result.error === false) {
				alert(`Success!!\nSuccessfully connect to:\n${host}:${port}`);
			} else {
				alert(`Failure\nUnable to connect to:\n${host}:${port}`);
			}
			await this.setState({ loading: "" });
		} catch (e) {
			this.setState({ loading: "" });
		}
	};
	
	clearPeer = async (coin) => {
		try {
			const currentPeers = this.props.settings.customPeers;
			await this.props.updateSettings({ customPeers: {...currentPeers, [coin]: [] } });
			await this.setState({ saving: "", loading: "", [coin]: { host: "", port: "" } });
		} catch (e) {}
	};
	
	savePeer = async (coin) => {
		try {
			await this.setState({ saving: coin });
			const host = this.state[coin].host.trim();
			const port = this.state[coin].port.trim();
			
			//Remove any customPeer if host and port are blank.
			if (host === "" && port === "") {
				const currentPeers = this.props.settings.customPeers;
				await this.props.updateSettings({ customPeers: {...currentPeers, [coin]: [] } });
				await this.setState({ saving: "", loading: "" });
				return;
			}
			
			const inputIsValid = await validateInput({ host, port });
			if (inputIsValid.error) {
				await this.setState({ loading: "", saving: "" });
				alert(inputIsValid.data);
				return;
			}
			
			//Attempt to connect to the customPeer before saving.
			//try {electrum.stop({ coin });} catch (e) {}
			const result = await electrum.start({ coin, customPeers: [{ host, port }]});
			if (result.error === false) {
				const currentPeers = this.props.settings.customPeers;
				await this.props.updateSettings({ customPeers: {...currentPeers, [coin]: [{ host, port }] } });
				alert(`Success!!\nSuccessfully connected to and saved:\n${host}:${port}`);
			} else {
				alert(`Failure\nUnable to connect to:\n${host}:${port}`);
			}
			
			this.setState({ saving: "" });
		} catch (e) {
			console.log(e);
			this.setState({ saving: "" });
		}
	};
	
	render() {
		return (
			<View style={styles.container}>
				<ScrollView style={styles.container} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
					<TouchableOpacity activeOpacity={1} style={styles.container}>
						<FlatList
							contentContainerStyle={{ paddingBottom: height * 0.3 }}
							data={this.state.availableCoins}
							extraData={this.state}
							keyExtractor={(coin, index) => `${index}`}
							renderItem={({ item }) => {
								if (!this.props.settings.testnet && item.toLowerCase().includes("testnet")) return;
								return (
									<ElectrumInput
										coin={item}
										title={capitalize(item)}
										host={this.state[item].host}
										port={this.state[item].port}
										onChangeText={this.updateState}
										testConnection={this.testConnection}
										loading={this.state.loading}
										clearPeer={this.clearPeer}
										savePeer={this.savePeer}
										saving={this.state.saving}
										customPeers={this.props.settings.customPeers}
										portPlaceholder="50002"
									/>
								);
							}}
						/>
					</TouchableOpacity>
				
				</ScrollView>
				<Animated.View style={styles.xButton}>
					<XButton style={{ borderColor: "transparent" }} onPress={this.props.onBack} />
				</Animated.View>
			</View>
		);
	}
}

ElectrumOptions.defaultProps = {
	data: {},
	onBack: () => null
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
		borderRadius: 20
	},
	title: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 20,
		textAlign: "left"
	},
	textInputTitle: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left",
		paddingLeft: 10
	},
	textInputContainer: {
		marginVertical: 10,
		alignItems: "center",
		justifyContent: "center"
	},
	textInput: {
		width: "80%",
		minHeight: 40,
		backgroundColor: colors.white,
		borderRadius: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		color: colors.purple,
		fontWeight: "bold",
		borderColor: colors.darkPurple,
		borderWidth: 2,
		paddingLeft: 12
	},
	row: {
		flexDirection: "row",
		width: "80%",
		minHeight: 40,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 3
	},
	textInputRow: {
		flexDirection: "row",
		width: "80%",
		minHeight: 40,
		backgroundColor: colors.white,
		borderRadius: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 3
	},
	leftButton: {
		minWidth: "20%",
		paddingVertical: 8,
		marginRight: 2,
		backgroundColor: colors.purple
	},
	rightButton: {
		minWidth: "26%",
		paddingVertical: 8,
		marginLeft: 2,
		backgroundColor: colors.purple
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(ElectrumOptions);
