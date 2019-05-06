import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	View,
	Animated,
	ScrollView,
	TouchableOpacity
} from "react-native";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
import Button from "./Button";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	capitalize,
	openUrl,
	formatNumber
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

const moment = require("moment");

class TransactionDetail extends PureComponent <Props> {

	state = {
		transactionOpacity: new Animated.Value(1),
		transactionData: {},
		loadingOpacity: new Animated.Value(0),
		loading: false
	};

	Row = ({ title = "", value = "", onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) => {
		try {
			return (
				<View style={styles.row}>
					<View style={[styles.col1, col1Style]}>
						<Text style={[styles.title, titleStyle]}>{title}</Text>
					</View>
					<TouchableOpacity onPress={onPress} style={[styles.col2, col2Style]}>
						<Text style={[styles.text, valueStyle]}>{value}</Text>
					</TouchableOpacity>
				</View>
			);
		} catch (e) {
			console.log(e);
		}
	};

	openTxId = (txid) => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/tx/${txid}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/tx/${txid}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/tx/LTC/${txid}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/tx/LTCTEST/${txid}`;
		openUrl(url);
	};

	openBlock = (block) => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/block-height/${block}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/block-height/${block}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/block/LTC/${block}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/block/LTC/${block}`;
		openUrl(url);
	};

	openAddress = (address = "") => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/address/${address}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/address/${address}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/address/LTC/${address}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/address/LTCTEST/${address}`;
		openUrl(url);
	};

	openMessage = (tx = "") => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		switch (selectedCrypto) {
			case "bitcoin":
				url = `https://chain.so/tx/BTC/${tx}`;
				break;
			case "bitcoinTestnet":
				url = `https://chain.so/tx/BTCTEST/${tx}`;
				break;
			case "litecoin":
				url = `https://chain.so/tx/LTC/${tx}`;
				break;
			case "litecoinTestnet":
				url = `https://chain.so/tx/LTCTEST/${tx}`;
				break;
			default:
				return;
		}
		openUrl(url);
	};

	getAmount = (amount) => {
		const cryptoUnit = this.props.settings.cryptoUnit;
		const selectedCrypto = this.props.wallet.selectedCrypto;
		const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
		amount = Number(amount);
		const crypto = cryptoUnit === "satoshi" ? amount : bitcoinUnits(amount, "satoshi").to(cryptoUnit).value();
		bitcoinUnits.setFiat("usd", exchangeRate);
		let fiat = bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
		fiat = amount < 0 ? `-$${formatNumber(Math.abs(fiat).toFixed(2))}` : `$${formatNumber(fiat)}`;
		return `${fiat}\n${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}`;
	};

	getConfirmations = () => {
		try {
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			if (transaction.block === null || transaction.block === 0) return 0;
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			return formatNumber(Number(currentBlockHeight) - (Number(transaction.block) - 1));
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	getMessages = () => {
		try {
			let message = "";
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			const messageLength = transaction.messages.length;
			transaction.messages.forEach((item, i) => {
				if (messageLength === 1 && i+1 === messageLength) {
					message = message.concat(`${item}`);
				} else {
					message = message.concat(`${item}\n`);
				}
			});
			return message;
		} catch (e) {
			console.log(e);
			return "";
		}
	};
	
	toggleUtxoBlacklist = async () => {
		try {
			const transaction = this.props.wallet.selectedTransaction.hash;
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto];
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			await this.props.toggleUtxoBlacklist({ transaction, selectedWallet, selectedCrypto });
			await this.props.updateBalance({ utxos, blacklistedUtxos, selectedCrypto, wallet: selectedWallet });
		} catch (e) {}
	};

	/*
	getBlacklistValue = () => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			let transacationHash = "";
			try { transacationHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			const result = blacklistedUtxos.includes(transacationHash);
			return result ? "Whitelist UTXO" : "Blacklist UTXO";
		} catch (e) {
			console.log(e);
			return "Blacklist UTXO";
		}
	};
	 */
	
	isBlacklisted = () => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			let transacationHash = "";
			try { transacationHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			return blacklistedUtxos.includes(transacationHash);
		} catch (e) {
			console.log(e);
			return false;
		}
	};
	
	isActiveUtxo = () => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto];
			let transactionHash = "";
			try { transactionHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			let txHashes = utxos.map((utxo) => utxo.tx_hash);
			return txHashes.includes(transactionHash);
		} catch (e) {
			return false;
		}
	};

	render() {
		
		if (!this.props.wallet.selectedTransaction) return <View />;
		const { block, type, hash, timestamp, fee, address } = this.props.wallet.selectedTransaction;

		const confirmations = getConfirmations();
		const status = block === 0 || block === null || confirmations === 0 ? "Pending" : "Confirmed";
		const blockHeight = block === 0 ? "?" : block;
		const messagesLength = this.props.wallet.selectedTransaction.messages.length;
		const isBlacklisted = this.isBlacklisted();
		let amount = Number(this.props.wallet.selectedTransaction.amount)-Number(fee);

		return (
			<View style={styles.container}>
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
					<Animated.View style={[styles.transactionData, { opacity: this.state.transactionOpacity }]}>
						<Text style={styles.header}>Transaction Details</Text>

						{this.Row({ title: "Network:", value: capitalize(this.props.wallet.selectedCrypto) })}
						<View style={styles.separator} />

						{messagesLength > 0 && this.Row({ title: "Message:", value: this.getMessages(), onPress: () => this.openMessage(hash), valueStyle: { textDecorationLine: "underline" } })}
						{messagesLength > 0 && <View style={styles.separator} />}

						{type === "sent" && this.Row({ title: "Amount Sent:", value: this.getAmount(amount) })}
						{type === "received" && this.Row({ title: "Amount \n Received:", value: this.getAmount(amount) })}
						<View style={styles.separator} />

						{this.Row({ title: "Transaction\nFee:", value: this.getAmount(fee) })}
						<View style={styles.separator} />

						{type === "sent" && this.Row({ title: "Total Sent:", value: this.getAmount(amount+fee) })}
						{type === "sent" && <View style={styles.separator} />}

						{this.Row({ title: "Type:", value: capitalize(type) })}
						<View style={styles.separator} />

						{this.Row({ title: "Confirmations:", value: this.getConfirmations() })}
						<View style={styles.separator} />

						{this.Row({ title: "Status:", value: capitalize(status) })}
						<View style={styles.separator} />

						{this.Row({ title: `Date \n ${capitalize(type)}:`, value: moment.unix(timestamp).format('l @ h:mm a') })}
						<View style={styles.separator} />

						{this.Row({ title: "Block:", value: formatNumber(blockHeight), onPress: () => this.openBlock(blockHeight), valueStyle: { textDecorationLine: "underline" } })}
						<View style={styles.separator} />

						{type === "received" && this.Row({ title: "Received By\nAddress:", onPress: () => this.openAddress(address), value: address, valueStyle: { textDecorationLine: "underline" } })}
						{type === "received" && <View style={styles.separator} />}

						{this.Row({ title: "TxId:", value: hash, onPress: () => this.openTxId(hash), valueStyle: { textDecorationLine: "underline" } })}
						<View style={styles.separator} />
						
						{this.isActiveUtxo() &&
						<Button style={{ ...styles.button, backgroundColor: isBlacklisted ? colors.red : "#813fb1" }} text={isBlacklisted ? "Whitelist UTXO" : "Blacklist UTXO"} onPress={this.toggleUtxoBlacklist} />}

					</Animated.View>
				</ScrollView>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	separator: {
		height: 1.5,
		backgroundColor: colors.purple,
		width: "100%",
		marginVertical: 8
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
	transactionData: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		paddingHorizontal: 5
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	title: {
		...systemWeights.bold,
		color: colors.darkPurple,
		fontSize: 16,
		textAlign: "center"
	},
	text: {
		...systemWeights.light,
		color: colors.darkPurple,
		fontSize: 16,
		textAlign: "left"
	},
	header: {
		...systemWeights.bold,
		color: colors.darkPurple,
		fontSize: 20,
		textAlign: "center",
		marginVertical: 20
	},
	button: {
		minWidth: "20%",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const walletActions = require("../actions/wallet");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...walletActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(TransactionDetail);