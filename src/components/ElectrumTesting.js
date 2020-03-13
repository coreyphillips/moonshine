/**
 * @format
 * @flow
 */

import React, {PureComponent} from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ScrollView,
	ActivityIndicator
} from "react-native";

const {
	getVersion,
	getPeers,
	getAvailablePeers,
	getNewBlockHeadersSubscribe,
	getAddressScriptHashHistory,
	getAddressScriptHashMempool,
	listUnspentAddressScriptHash,
	getBlockHeader,
	broadcastTransaction,
	getFeeEstimate,
	getAddressScriptHashesBalance,
	getAddressScriptHashesHistory,
	getAddressScriptHashesMempool,
	listUnspentAddressScriptHashes,
	pingServer
} = require("../utils/electrum");
import * as electrum from "../utils/electrum";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

type Props = {};

class ElectrumTesting extends PureComponent<Props> {
	
	constructor(props) {
		super(props);
		this.state = {
			output: "",
			selectedCrypto: "",
			defaultError: { error: true, errorTitle: "Unable to connect to electrum node", errorMsg: "" },
			loading: {
				getAddressBalance: false,
				getAddressScriptHashBalance: false,
				getAddressScriptHashesBalance: false,
				getAddressScriptHashMempool: false,
				getAddressScriptHashesMempool: false,
				listUnspentAddressScriptHash: false,
				listUnspentAddressScriptHashes: false,
				getMempool: false,
				listUnspentAddress: false,
				getFeeEstimate: false,
				getAddressHistory: false,
				getAddressScriptHashHistory: false,
				getAddressScriptHashesHistory: false,
				getTransactionHex: false,
				getDonationAddress: false,
				disconnectFromPeer: false,
				getAvailablePeers: false,
				getPeers: false,
				getNewBlockHeightSubscribe: false,
				getNewBlockHeadersSubscribe: false,
				getTransactionMerkle: false,
				getAddressUtxo: false,
				broadcastTransaction: false,
				getBlockChunk: false,
				getBlockHeader: false,
				getBanner: false,
				pingServer: false,
				getAddressProof: false,
				getVersion: false
			}
		};
	}
	
	async componentDidMount(): void {
		//Spin up the nodejs thread
		//await Promise.all(nodejs.start("main.js"));
		this.onCryptoButtonPress("bitcoin");
	}
	
	cryptoButton = ({ label = "", key = "" }) => {
		const backgroundColor = this.state.selectedCrypto === key ? colors.white : colors.darkPurple;
		const borderRadius = this.state.selectedCrypto === key ? 20 : 0;
		const textColor = this.state.selectedCrypto === key ? colors.darkPurple : colors.white;
		return (
			<TouchableOpacity
				onPress={() => this.onCryptoButtonPress(key)}
				style={[styles.cryptoButton, { backgroundColor, borderRadius }]}
			>
				<Text style={[styles.cryptoButtonText, { color: textColor }]}>
					{label}
				</Text>
			</TouchableOpacity>
		);
	};
	
	onCryptoButtonPress = async (key = "") => {
		try {
			if (this.state.selectedCrypto === key) return;
			let output = this.state.output;
			output = `${output}\n\nConnecting to ${key}...`;
			
			const loadingKeys = Object.keys(this.state.loading);
			
			//Reset loading state when switching between coins.
			let loading = {};
			await Promise.all(loadingKeys.map((key) => loading = {...loading, [key]: false} ));
			
			await this.setState({ selectedCrypto: key, output, loading });
			try {
				let hasPeers = false;
				let hasCustomPeers = false;
				try {if (Array.isArray(this.props.settings.peers[key]) && this.props.settings.peers[key].length) hasPeers = true;} catch (e) {}
				try {if (Array.isArray(this.props.settings.customPeers[key]) && this.props.settings.customPeers[key].length) hasCustomPeers = true;} catch (e) {}
				
				if (!hasPeers && !hasCustomPeers) {
					//Attempt to retrieve a list of peers from the default servers.
					const startResponse = await electrum.start({
						coin: key,
						peers: [],
						customPeers: []
						
					});
					if (startResponse.error === false) {
						const peers = await electrum.getPeers({coin: key});
						await this.props.updatePeersList({peerList: peers.data, coin: key});
					}
				}
			} catch (e) {}
			
			//await electrum.stop({ coin: key });
			let result = await electrum.start({
				coin: key,
				peers: this.props.settings.peers[key],
				customPeers: this.props.settings.customPeers[key]
				
			});
			
			result = JSON.stringify(result);
			output = `${output}\n${result}`;
			await this.setState({ output });
		} catch (e) {
			console.log(e);
		}
	};
	
	clearButton = () => {
		if (this.state.output) {
			return (
				<TouchableOpacity
					onPress={() => this.setState({ output: "" })}
					style={styles.clearButton}
				>
					<Text style={{ color: colors.white, fontSize: 12 }}>
						Clear
					</Text>
				</TouchableOpacity>
			);
		}
	};
	
	getAddresses = (type = "array") => {
		const addresses = {
			bitcoin: ["bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "bc1q6f6l84dd07g2478ggvwc8h0cyszz9m4j3kjzjz"],
			bitcoinTestnet: ["tb1qlffxly3zuc8prf8l4v54z8ddsequz77j3s8q8l"],
			litecoin: ["ltc1qmz65daz7dxqueuwznd3qrrjnudzs3xkgf7kwql", "ltc1qvn4euzcmjn6lqw56seru32rvjh5y03jgde4pgn", "ltc1qh8uyuuk560qgalmshh3fttp8m4n9cjpjyu5dpt"],
			litecoinTestnet: ["tltc1qlffxly3zuc8prf8l4v54z8ddsequz77jgc97hk", "tltc1q6q3u7tureyx0c5m9y4exfqynl626sppu56u7w3"]
		};
		if (type === "array") {
			return this.props.wallet.wallets[this.props.wallet.selectedWallet].addresses[this.state.selectedCrypto] || addresses[this.state.selectedCrypto];
		} else if (type === "single") {
			return this.props.wallet.wallets[this.props.wallet.selectedWallet].addresses[this.state.selectedCrypto][0].address || addresses[this.state.selectedCrypto][0];
		} else {
			return addresses["bitcoin"];
		}
	};
	
	MethodButton ({ method = "", label = "", onPress = () => null, afterOnPress = () => null } = {}) {
		return (
			<TouchableOpacity
				disabled={this.state.loading[method]}
				onPress={async () => {
					let output = this.state.output;
					output = `${output}\n\nRunning ${method} on ${this.state.selectedCrypto}...`;
					await this.setState({ loading: { ...this.state.loading, [method]: true }});
					let result = { error: true, errorTitle: "Unable to connect to electrum node", errorMsg: "" };
					try { result = await onPress(); } catch (e) {}
					result = JSON.stringify(result);
					output = `${output}\n${result}`;
					await this.setState({ loading: { ...this.state.loading, [method]: false }, output});
					afterOnPress();
				}}
				style={styles.button}
			>
				<ActivityIndicator style={styles.activityIndicator} animating={this.state.loading[method]} size="small" color="#157efb" />
				<Text style={[styles.text, { opacity: this.state.loading[method] ? 0 : 1 }]}>
					{label}
				</Text>
			</TouchableOpacity>
		);
	}
	
	
	render() {
		return (
			<View style={{ flex: 1 }}>
				
				{this.clearButton()}
				
				<View style={styles.upperContent}>
					<ScrollView
						ref={ref => this.scrollView = ref}
						onContentSizeChange={() => {
							this.scrollView.scrollToEnd({animated: true});
						}}
						contentContainerStyle={{ alignItems: "flex-start", justifyContent: "flex-end", marginHorizontal: 10, paddingBottom: 10 }}
					>
						<Text style={{ color: colors.white, fontWeight: "bold", fontSize: 12 }}>{this.state.output}</Text>
					</ScrollView>
				</View>
				<View style={{ flexDirection: "row", backgroundColor: colors.darkPurple, paddingBottom: 5 }}>
					
					{this.cryptoButton({ label: "BTC", key: "bitcoin" })}
					{this.cryptoButton({ label: "BTCt", key: "bitcoinTestnet" })}
					{this.cryptoButton({ label: "LTC", key: "litecoin" })}
					{this.cryptoButton({ label: "LTCt", key: "litecoinTestnet" })}
				
				</View>
				<View style={styles.lowerContent}>
					<ScrollView style={{ flex: 1, paddingTop: 10 }}>
						<View style={styles.methodContainer}>
							
							{/*
							Get Address Script Hashes Balance
							 */}
							{this.MethodButton({
								method: "getAddressScriptHashesBalance",
								label: "1 Get Address Script Hashes Balance",
								onPress: () => getAddressScriptHashesBalance({ addresses: this.getAddresses(), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Address Script Hash History
							 */}
							{this.MethodButton({
								method: "getAddressScriptHashHistory",
								label: "2 Get Address Script Hash History",
								onPress: () => getAddressScriptHashHistory({ address: this.getAddresses("single"), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Address Script Hashes History
							 */}
							{this.MethodButton({
								method: "getAddressScriptHashesHistory",
								label: "3 Get Address Script Hashes History",
								onPress: () => getAddressScriptHashesHistory({ addresses: this.getAddresses("array"), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Address Script Hash Mempool
							 */}
							{this.MethodButton({
								method: "getAddressScriptHashMempool",
								label: "4 Get Address Script Hash Mempool",
								onPress: () => getAddressScriptHashMempool({ address: this.getAddresses("single"), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Address Script Hashes Mempool
							 */}
							{this.MethodButton({
								method: "getAddressScriptHashesMempool",
								label: "5 Get Address Script Hashes Mempool",
								onPress: () => getAddressScriptHashesMempool({ addresses: this.getAddresses("array"), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get UTXO's for Address Script Hash
							 */}
							{this.MethodButton({
								method: "listUnspentAddressScriptHash",
								label: "6 Get UTXO's for Address Script Hash",
								onPress: () => listUnspentAddressScriptHash({ address: this.getAddresses("single"), coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get UTXO's for Address Script Hashes
							 */}
							{this.MethodButton({
								method: "listUnspentAddressScriptHashes",
								label: "7 Get UTXO's for Address Script Hashes",
								onPress: () => listUnspentAddressScriptHashes({ addresses: this.getAddresses("array"), coin: this.state.selectedCrypto })
							})}

							{/*
							Get Fee Estimate
							 */}
							{this.MethodButton({
								method: "getFeeEstimate",
								label: "8 Get Fee Estimate",
								onPress: () => getFeeEstimate({ blocksWillingToWait: 8, coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Version
							 */}
							{this.MethodButton({
								method: "getVersion",
								label: "9 Get Version",
								onPress: () => getVersion({ coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Available Peers
							 */}
							{this.MethodButton({
								method: "getAvailablePeers",
								label: "10 Get Available Peers",
								onPress: () => getAvailablePeers({ coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get Peers
							 */}
							{this.MethodButton({
								method: "getPeers",
								label: "11 Get Peers",
								onPress: () => getPeers({ coin: this.state.selectedCrypto })
							})}
							
							{/*
							Disconnect From Peer
							 */}
							{this.MethodButton({
								method: "disconnectFromPeer",
								label: "12 Disconnect From Peer",
								onPress: async () => await electrum.stop({ coin: this.state.selectedCrypto }),
								afterOnPress: () => this.setState({ selectedCrypto: "" })
							})}
							
							{/*
							Subscribe: Get New Block Headers
							 */}
							{this.MethodButton({
								method: "getNewBlockHeadersSubscribe",
								label: "13 Subscribe: Get New Block Headers",
								onPress: async () => await getNewBlockHeadersSubscribe({ coin: this.state.selectedCrypto })
							})}
							
							{/*
							Get A Specific Block Header
							 */}
							{this.MethodButton({
								method: "getBlockHeader",
								label: "14 Get A Specific Block Header",
								onPress: async () => await getBlockHeader({ height: 1, coin: this.state.selectedCrypto })
							})}
							
							{/*
							Broadcast Transaction
							 */}
							{this.MethodButton({
								method: "broadcastTransaction",
								label: "15 Broadcast Transaction",
								onPress: async () => await broadcastTransaction({ rawTx: "", coin: this.state.selectedCrypto })
							})}
							
							{/*
							Ping Server
							 */}
							{this.MethodButton({
								method: "pingServer",
								label: "16 Ping Server",
								onPress: async () => await pingServer()
							})}
						</View>
					</ScrollView>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	upperContent: {
		flex: 0.5
	},
	lowerContent: {
		flex: 0.5,
		backgroundColor: colors.white
	},
	methodContainer: {
		flex: 0.6,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.white,
		paddingBottom: 20
	},
	cryptoButton: {
		width: "25%",
		paddingHorizontal: 10,
		paddingVertical: 8
	},
	cryptoButtonText: {
		textAlign: "center",
		fontSize: 14,
		fontWeight: "bold"
	},
	clearButton: {
		position: "absolute",
		zIndex: 100,
		top: 5,
		right: 10,
		color: colors.white,
		borderColor: colors.white,
		borderWidth: 0.5,
		borderRadius: 20,
		padding: 5
	},
	activityIndicator: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center"
	},
	text: {
		textAlign: "center",
		fontSize: 14,
		color: colors.darkPurple,
		fontWeight: "bold"
	},
	button: {
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 0.5,
		borderColor: colors.darkPurple,
		borderRadius: 5,
		paddingHorizontal: 15,
		paddingVertical: 5,
		marginBottom: 15
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(ElectrumTesting);
