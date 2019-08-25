import React, { useEffect, memo } from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	LayoutAnimation,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const moment = require("moment");
const {
	formatNumber
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

interface TransactionRowComponent {
	id: string,
	coin: string,
	address: string,
	amount: number,
	label: string,
	date: number,
	transactionBlockHeight: number,
	exchangeRate: number | string,
	currentBlockHeight: number,
	cryptoUnit: string,
	type: string,
	onTransactionPress: Function,
	messages: [],
	isBlacklisted: boolean
}
const _TransactionRow = ({ id = "", coin = "bitcoin", address = "", amount = 0, label = "", date = 0, transactionBlockHeight = 0, exchangeRate = "0", currentBlockHeight = 0, cryptoUnit = "satoshi", type = "received", onTransactionPress = () => null, messages = [], isBlacklisted = false}: TransactionRowComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const getCryptoAmountLabel = () => {
		try {
			//This prevents the view from displaying 0 BTC
			if (amount < 50000 && cryptoUnit === "BTC") {
				return `${formatNumber(Number((amount * 0.00000001).toFixed(8)))} BTC`;
			} else {
				return `${formatNumber(bitcoinUnits(amount, "satoshi").to(cryptoUnit).value())} ${getCoinData({selectedCrypto: coin, cryptoUnit}).acronym}`;
			}
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	const getFiatAmountLabel = () => {
		try {
			const cryptoRate = Number(exchangeRate) * 0.00000001;
			let label = (Number(amount)*cryptoRate).toFixed(2);
			label = type === "sent" ? `-$${formatNumber(Math.abs(Number(label)).toFixed(2))}` : `+$${formatNumber(label)}`;
			return label;
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	const getConfirmations = () => {
		try {
			if (transactionBlockHeight === null || currentBlockHeight === null) return "?";
			return transactionBlockHeight !== 0 ? formatNumber(Math.abs(Number(currentBlockHeight)) - (Math.abs(Number(transactionBlockHeight - 1)))) : 0;
		} catch (e) {
			console.log(e);
			return "?";
		}
	};

	const getMessages = () => {
		try {
			let message = "";
			const messageLength = messages.length;
			messages.forEach((item, i) => {
				if (i+1 === messageLength) {
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

	if (!address || !amount) return <View />;

	if (!label) label = address;
	if (label.length > 18) label = `${label.substr(0, 18)}...`;
	const fontWeight = type === "sent" ? "normal" : "bold";
	const backgroundColor = isBlacklisted ? colors.red : "transparent";
	const textColor = isBlacklisted ? colors.white : colors.darkPurple;
	return (
		<TouchableOpacity onPress={() => onTransactionPress(id)} style={[styles.container, { backgroundColor }]}>
			<View style={styles.header}>
				{isBlacklisted &&<Text style={[styles.text, { fontWeight: "bold", fontSize: 16, color: colors.red  }]}>UTXO Blacklisted</Text>}
				<Text style={[styles.smallText, { color: isBlacklisted ? colors.red : colors.darkPurple }]}>{moment.unix(date).format('l @ h:mm a')}</Text>
			</View>
			<View style={styles.row}>
				<View style={styles.col1}>
					<Text style={[styles.text, { fontWeight, fontSize: 14, color: textColor  }]}>{label}</Text>
					<Text style={[styles.smallText, { fontWeight, fontSize: 14, color: textColor  }]}>Confirmations: {getConfirmations()}</Text>
				</View>
				<View style={styles.col2}>
					<Text style={[styles.text, { fontWeight, color: textColor  }]}>{getFiatAmountLabel()}</Text>
					<Text style={[styles.text, { fontWeight, color: textColor  }]}>{type === "received" ? "+" : "-"}{getCryptoAmountLabel()}</Text>
				</View>
			</View>
			{messages.length > 0 &&
			<View style={styles.row}>
				<View style={[styles.col1, { flex: 0.6 }]}>
					<Text style={[styles.text, { fontWeight, fontSize: 16, color: textColor  }]}>Message:</Text>
				</View>
				<View style={[styles.col2, { flex: 1 }]}>
					<Text style={[styles.text, { fontWeight, color: textColor  }]}>{getMessages()}</Text>
				</View>
			</View>}
		</TouchableOpacity>
	);
};

_TransactionRow.propTypes = {
	id: PropTypes.string.isRequired,
	coin: PropTypes.string.isRequired,
	address: PropTypes.string.isRequired,
	amount: PropTypes.number.isRequired,
	label: PropTypes.string,
	date: PropTypes.number.isRequired,
	transactionBlockHeight: PropTypes.number.isRequired,
	exchangeRate: PropTypes.string.isRequired,
	currentBlockHeight: PropTypes.number.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired,
	onTransactionPress: PropTypes.func.isRequired,
	messages: PropTypes.arrayOf(PropTypes.string).isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	header: {
		flex: 1,
		backgroundColor: colors.gray,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 2,
		paddingHorizontal: 10
	},
	row: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 8,
		paddingTop: 2
	},
	col1: {
		flex: 1,
		alignItems: "flex-start",
		justifyContent: "center",
		paddingLeft: 10
	},
	col2: {
		flex: 0.9,
		alignItems: "flex-end",
		justifyContent: "center",
		paddingRight: 10
	},
	text: {
		...systemWeights.light,
		color: colors.darkPurple,
		fontSize: 16,
		textAlign: "center"
	},
	smallText: {
		...systemWeights.thin,
		color: colors.darkPurple,
		fontSize: 14,
		textAlign: "center"
	}
});

//ComponentShouldNotUpdate
const TransactionRow = memo(
	_TransactionRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default TransactionRow;
