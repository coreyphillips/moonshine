import React, { memo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Image
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	formatNumber
} = require("../utils/helpers");

const {
	getCoinImage,
	getCoinData
} = require("../utils/networks");


interface FormatBalance {
	coin: string,
	cryptoUnit: string,
	balance: number
}
const formatBalance = ({ coin = "", cryptoUnit = "satoshi", balance = 0 }: FormatBalance): string => {
	try {
		let formattedBalance = "0";
		if (balance === 0 && cryptoUnit === "BTC") {
			formattedBalance = "0";
		} else {
			//This prevents the view from displaying 0 for values less than 50000 BTC
			if (balance < 50000 && cryptoUnit === "BTC") {
				formattedBalance = `${(Number(balance) * 0.00000001).toFixed(8)}`;
			} else {
				formattedBalance = bitcoinUnits(balance, "satoshi").to(cryptoUnit).value();
			}
		}
		formattedBalance = formatNumber(formattedBalance);
		return `${formattedBalance} ${getCoinData({ selectedCrypto: coin, cryptoUnit }).acronym}`;
	} catch (e) {
		return "0";
	}
};

interface CoinButtonComponent {
	onCoinPress: Function,
	cryptoUnit: string,
	coin: string,
	label: string,
	walletId: string,
	balance: number
}
const _CoinButton = ({ onCoinPress, cryptoUnit = "satoshi", coin = "bitcoin", label = "Bitcoin", walletId = "wallet0", balance = 0 }: CoinButtonComponent) => {
	return (
		<TouchableOpacity key={`${coin}${walletId}`} onPress={() => onCoinPress({coin, walletId})} style={styles.button}>
			<View style={styles.buttonContent}>
				
				<Image
					style={styles.buttonImage}
					source={getCoinImage(coin)}
				/>
				
				<Text style={styles.text}>{label}</Text>
				<Text style={styles.subText}>{formatBalance({ balance, coin, cryptoUnit })}</Text>
			
			</View>
		</TouchableOpacity>
	);
};

_CoinButton.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	coin: PropTypes.string.isRequired,
	label: PropTypes.string.isRequired,
	walletId: PropTypes.string.isRequired,
	balance: PropTypes.number.isRequired
};

const styles = StyleSheet.create({
	button: {
		width: "82%",
		minHeight: 80,
		flexDirection: "row",
		backgroundColor: "transparent",
		marginBottom: 15
	},
	buttonContent: {
		flex: 1,
		alignItems: "center",
		borderRadius: 40,
		justifyContent: "center",
		backgroundColor: colors.white
	},
	buttonImage: {
		width: 48,
		height: 48,
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		left: 10
	},
	text: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	},
	subText: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	}
});


//ComponentShouldNotUpdate
const CoinButton = memo(
	_CoinButton,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.label === nextProps.label && prevProps.balance === nextProps.balance;
	}
);

export default CoinButton;
