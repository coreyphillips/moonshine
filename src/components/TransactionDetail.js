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
import * as Progress from 'react-native-progress';
import bitcoinUnits from "bitcoin-units";

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

	async componentDidMount() {
		try {
			//this.updateLoading({ display: false });
		} catch (e) {
			console.log(e);
		}
	}

	updateLoading = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ loading: display });
				Animated.parallel([
					Animated.timing(
						this.state.loadingOpacity,
						{
							toValue: display ? 1 : 0,
							duration
						}
					),
					Animated.timing(
						this.state.transactionOpacity,
						{
							toValue: display ? 0 : 1,
							duration
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
			)
		} catch (e) {
			console.log(e)
		}
	};

	openTxId = (txid) => {
		let url = "";
		if (this.props.selectedCrypto === "bitcoin") url = `https://blockstream.info/tx/${txid}`;
		if (this.props.selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/tx/${txid}`;
		if (this.props.selectedCrypto === "litecoin") url = `https://chain.so/tx/LTC/${txid}`;
		if (this.props.selectedCrypto === "litecoinTestnet") url = `https://chain.so/tx/LTCTEST/${txid}`;
		openUrl(url);
	};

	openBlock = (block) => {
		let url = "";
		if (this.props.selectedCrypto === "bitcoin") url = `https://blockstream.info/block-height/${block}`;
		if (this.props.selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/block-height/${block}`;
		if (this.props.selectedCrypto === "litecoin") url = `https://chain.so/block/LTC/${block}`;
		if (this.props.selectedCrypto === "litecoinTestnet") url = `https://chain.so/block/LTC/${block}`;
		openUrl(url);
	};

	openAddress = (address = "") => {
		let url = "";
		if (this.props.selectedCrypto === "bitcoin") url = `https://blockstream.info/address/${address}`;
		if (this.props.selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/address/${address}`;
		if (this.props.selectedCrypto === "litecoin") url = `https://chain.so/address/LTC/${address}`;
		if (this.props.selectedCrypto === "litecoinTestnet") url = `https://chain.so/address/LTCTEST/${address}`;
		openUrl(url);
	};

	openMessage = (tx = "") => {
		let url = "";
		switch (this.props.selectedCrypto) {
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
		const cryptoUnit = this.props.cryptoUnit;
		const selectedCrypto = this.props.selectedCrypto;
		const exchangeRate = this.props.exchangeRate;
		amount = Number(amount);
		const crypto = cryptoUnit === "satoshi" ? amount : bitcoinUnits(amount, "satoshi").to(cryptoUnit).value();
		bitcoinUnits.setFiat("usd", exchangeRate);
		let fiat = bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
		fiat = amount < 0 ? `-$${formatNumber(Math.abs(fiat).toFixed(2))}` : `$${formatNumber(fiat)}`;
		return `${fiat}\n${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}`;
	};

	getConfirmations = () => {
		try {
			if (this.props.transaction.block === null || this.props.transaction.block === 0) return 0;
			return formatNumber(Number(this.props.currentBlockHeight) - (Number(this.props.transaction.block) - 1));
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	getMessages = () => {
		try {
			let message = "";
			const messageLength = this.props.transaction.messages.length;
			this.props.transaction.messages.forEach((item, i) => {
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

	/*
	blacklistTransaction = async () => {
		try {
			const result = await this.props.blacklistTransaction();
		} catch (e) {
			console.log(e);
		}
	};

	getBlacklistValue = () => {
		try {
			const result = this.props.blacklistedTransactions.indexOf(this.props.transaction.hash);
			alert(result);
			return result > -1 ? "Blacklist" : "Whitelist"
		} catch (e) {
			console.log(e);
		}
	};
	*/

	render() {
		if (!this.props.transaction) return <View/>;
		const { block, type, hash, timestamp, fee, address } = this.props.transaction;

		const confirmations = getConfirmations();
		const status = block === 0 || block === null || confirmations === 0 ? "Pending" : "Confirmed";
		const blockHeight = block === 0 ? "?" : block;
		const messagesLength = this.props.transaction.messages.length;
		let amount = Number(this.props.transaction.amount)-Number(fee);

		return (
			<View style={styles.container}>
				{this.state.loading &&
				<Animated.View style={[styles.loading, { opacity: this.state.loadingOpacity }]}>
					<Progress.CircleSnail size={80} animated={true} color={[colors.purple, colors.lightPurple, colors.darkPurple]} />
				</Animated.View>}
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
					<Animated.View style={[styles.transactionData, { opacity: this.state.transactionOpacity }]}>
						<Text style={styles.header}>Transaction Details</Text>

						{this.Row({ title: "Network:", value: capitalize(this.props.selectedCrypto) })}
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

					</Animated.View>
				</ScrollView>
			</View>
		)
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
	loading: {
		position: "absolute",
		zIndex: 100,
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
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
	}
});


module.exports = TransactionDetail;