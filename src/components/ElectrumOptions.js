import React, { PureComponent } from 'react';
import {
	StyleSheet,
	Dimensions,
	Animated,
	TouchableOpacity,
	ScrollView,
	FlatList
} from 'react-native';
import {systemWeights} from "react-native-typography/dist/index";
import XButton from "./XButton";
import Button from "./Button";
import * as electrum from "../utils/electrum";
import { View, Text, TextInput, MaterialCommunityIcons } from "../styles/components";

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
		try {
			if (this.props.protocol === "ssl"){
				try {return this.props.coin.toLowerCase().includes("testnet") ? "51002" : "50002";} catch (e) {return "50002";}
			} else {
				try {return this.props.coin.toLowerCase().includes("testnet") ? "51001" : "50001";} catch (e) {return "50001";}
			}
		} catch (e) {return "50002";}
	};
	
	updateProtocol = (protocol = "ssl") => {
		try {
			const data = { host: this.props.host, port: this.props.port, protocol };
			this.props.updateState({coin: this.props.coin, value: data });
		} catch (e) {}
	};
	
	getSavedProtocol = () => {
		try {
			const protocol = this.props.customPeers[this.props.coin][0].protocol;
			if (protocol === "ssl" || protocol === "tcp") return protocol;
			return "ssl";
		} catch (e) {
			return "ssl";
		}
	};
	
	render() {
		let savedHost = "";
		let savedPort = "";
		let protocol = "ssl";
		try {savedHost = this.props.customPeers[this.props.coin][0].host;} catch (e) {}
		try {savedPort = this.props.customPeers[this.props.coin][0].port;} catch (e) {}
		try {protocol = this.props.protocol;} catch (e) {}
		return (
			<View style={styles.textInputContainer}>
				<Text style={styles.title}>{this.props.title}</Text>
				
				<View style={[styles.textInputRow, { width: "70%", justifyContent: "space-around" }]}>
					<TouchableOpacity onPress={() => this.updateProtocol("tcp")} style={{ flexDirection: "row" }}>
						<Text style={styles.textInputTitle}>TCP: </Text>
						<MaterialCommunityIcons
							name={protocol === "tcp" ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
							size={20}
							color={colors.darkPurple}
						/>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => this.updateProtocol("ssl")} style={{ flexDirection: "row" }}>
						<Text style={styles.textInputTitle}>TLS: </Text>
						<MaterialCommunityIcons
							name={protocol === "ssl" ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
							size={20}
							color={colors.darkPurple}
						/>
					</TouchableOpacity>
				</View>
				
				<View style={styles.textInputRow}>
					<Text style={styles.textInputTitle}>Host: </Text>
					<TextInput
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						onChangeText={(host) => this.props.onChangeText({coin: this.props.coin, value: { host, port: this.props.port, protocol } })}
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
						onChangeText={(port) =>  {if (!isNaN(port) || port === "") this.props.onChangeText({coin: this.props.coin, value: { port, host: this.props.host, protocol } });}}
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
						title={this.props.port === savedPort && this.props.host === savedHost && this.props.protocol === this.getSavedProtocol() ? "Saved" : "Save"}
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
			let protocol = "ssl";
			try { host = props.settings.customPeers[coin][0].host; } catch (e) {}
			try { port = props.settings.customPeers[coin][0].port; } catch (e) {}
			try { protocol = props.settings.customPeers[coin][0].protocol; } catch (e) {}
			coins[coin] = { host, port, protocol };
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
			const protocol = this.state[coin].protocol;
			
			const inputIsValid = await validateInput({ host, port });
			if (inputIsValid.error) {
				await this.setState({ loading: "", saving: "" });
				alert(inputIsValid.data);
				return;
			}
			
			const result = await electrum.start({ coin, customPeers: [{ host, port, protocol }]});
			if (result.error === false) {
				/*
				Attempt to ping the server to ensure we are properly connected.
				A response from either getVersion or getFeeEstimate should do.
				*/
				//const versionResponse = await electrum.getVersion({ coin });
				const feeEstimateResponse = await electrum.getFeeEstimate({ coin });
				if (feeEstimateResponse.error === false) {
					alert(`Success!!\nSuccessfully connect to:\n${host}:${port}`);
				} else {
					alert(`Failure\nUnable to connect to:\n${host}:${port}`);
				}
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
			await this.setState({ saving: "", loading: "", [coin]: { host: "", port: "", protocol: "ssl" } });
		} catch (e) {}
	};
	
	savePeer = async (coin) => {
		try {
			await this.setState({ saving: coin });
			const host = this.state[coin].host.trim();
			const port = this.state[coin].port.trim();
			const protocol = this.state[coin].protocol;
			
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
			
			const result = await electrum.start({ coin, customPeers: [{ host, port, protocol }]});
			if (result.error === false) {
				/*
				Attempt to ping the server to ensure we are properly connected.
				A response from either getVersion or getFeeEstimate should do.
				*/
				//const versionResponse = await electrum.getVersion({ coin });
				const feeEstimateResponse = await electrum.getFeeEstimate({ coin });
				if (feeEstimateResponse.error === false) {
					const currentPeers = this.props.settings.customPeers;
					await this.props.updateSettings({ customPeers: {...currentPeers, [coin]: [{ host, port, protocol }] }, currentPeer: { host, port, protocol } });
					alert(`Success!!\nSuccessfully connected to and saved:\n${host}:${port}`);
				} else {
					alert(`Failure\nUnable to connect to:\n${host}:${port}`);
				}
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
						<Text style={styles.header}>Custom Electrum Servers</Text>
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
										protocol={this.state[item].protocol}
										onChangeText={this.updateState}
										updateState={this.updateState}
										testConnection={this.testConnection}
										loading={this.state.loading}
										clearPeer={this.clearPeer}
										savePeer={this.savePeer}
										saving={this.state.saving}
										customPeers={this.props.settings.customPeers}
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
		borderRadius: 20
	},
	header: {
		...systemWeights.semibold,
		fontSize: 20,
		textAlign: "center",
		marginVertical: 20
	},
	title: {
		...systemWeights.semibold,
		fontSize: 20,
		textAlign: "left"
	},
	textInputTitle: {
		...systemWeights.semibold,
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
		borderRadius: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: "bold",
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
