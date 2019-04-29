import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import bitcoinUnits from "bitcoin-units";
import { systemWeights } from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	formatNumber,
	capitalize
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

const getCryptoLabel = ({ selectedCrypto = "bitcoin" } = {}) => {
	try {
		return capitalize(selectedCrypto);
	} catch (e) {
		console.log(e);
	}
};

const getCryptoUnitLabel = ({ cryptoUnit = "satoshi", selectedCrypto = "bitcoin" } = {}) => {
	try {
		return getCoinData({ cryptoUnit, selectedCrypto }).acronym;
	} catch (e) {
		console.log(e);
	}
};

class Header extends PureComponent {
	render() {

		const { fiatSymbol = "$", selectedCrypto = "bitcoin", selectedWallet = "wallet0", onSelectCoinPress = () => null, isOnline = true, exchangeRate = 0, displayWalletName = false, selectedCryptoStyle = {}, activeOpacity, fontSize } = this.props;
		let { fiatValue = 0, cryptoValue = 0, cryptoUnit = "satoshi" } = this.props;
		try {
			if (isNaN(fiatValue)) fiatValue = 0;
			//This prevents the view from displaying 0 BTC
			if (cryptoValue < 50000 && cryptoUnit === "BTC") {
				cryptoValue = `${Number((cryptoValue * 0.00000001).toFixed(8))}`;
			} else {
				cryptoValue = bitcoinUnits(cryptoValue, "satoshi").to(cryptoUnit).value();
			}
		} catch (e) {}

		return (
			<TouchableOpacity style={styles.container} activeOpacity={activeOpacity} onPress={onSelectCoinPress}>
				{displayWalletName &&
				<Text style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{selectedWallet.split('wallet').join('Wallet ')}</Text>}
				<Text style={[styles.cryptoValue, { fontSize: fontSize/2.5, ...selectedCryptoStyle }]}>{getCryptoLabel({selectedCrypto})}</Text>
				<View style={styles.row}>
					<View style={{ flexDirection: "row", alignItems: "center", left: -4 }}>
						<Text style={[styles.fiatSymbol, { fontSize: fontSize/1.5 }]}>{fiatSymbol} </Text>
						<Text style={[styles.fiatValue, { fontSize: fontSize }]}>{formatNumber(fiatValue)}</Text>
					</View>
				</View>
				<View style={styles.cryptoValueRow}>
					<Text style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{formatNumber(cryptoValue)}  {getCryptoUnitLabel({ cryptoUnit, selectedCrypto })}</Text>
				</View>
				{isOnline !== false &&
				<View style={styles.cryptoValueRow}>
					<Text style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${formatNumber(exchangeRate)}`}</Text>
				</View>}
				{isOnline !== true &&
				<Text style={[styles.cryptoValue, { marginTop: 10, fontSize: fontSize/2.5 }]}>Currently Offline</Text>
				}
			</TouchableOpacity>
		);
	}
}

Header.defaultProps = {
	fiatValue: 0,
	fiatSymbol: "$",
	cryptoValue: 0,
	cryptoUnit: "satoshi",
	selectedCrypto: "bitcoin",
	selectedWallet: "wallet0",
	onSelectCoinPress: () => null,
	isOnline: true,
	exchangeRate: "0",
	displayWalletName: false,
	selectedCryptoStyle: {},
	activeOpacity: 0.6,
	fontSize: 60
};

Header.propTypes = {
	fiatValue: PropTypes.number,
	fiatSymbol: PropTypes.string,
	cryptoValue: PropTypes.number,
	cryptoUnit: PropTypes.string,
	selectedCrypto: PropTypes.string,
	selectedWallet: PropTypes.string,
	onSelectCoinPress: PropTypes.func,
	isOnline: PropTypes.bool,
	exchangeRate: PropTypes.string,
	displayWalletName: PropTypes.bool,
	selectedCryptoStyle: PropTypes.object,
	activeOpacity: PropTypes.number,
	fontSize: PropTypes.number
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent"
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	cryptoValueRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		marginTop: 5
	},
	fiatSymbol: {
		...systemWeights.light,
		color: colors.white,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	fiatValue: {
		...systemWeights.thin,
		color: colors.white,
		textAlign: "center",
		left: -4,
		backgroundColor: "transparent"
	},
	cryptoValue: {
		...systemWeights.thin,
		color: colors.white,
		textAlign: "center",
		backgroundColor: "transparent"
	},
	exchangeRate: {
		...systemWeights.light,
		color: colors.white,
		textAlign: "center",
		backgroundColor: "transparent"
	}
});


module.exports = Header;