import React, {memo} from "react";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import bitcoinUnits from "bitcoin-units";
import {systemWeights} from "react-native-typography";
import { Text } from "../styles/components";

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

interface GetCryptoUnitLabel {
	cryptoUnit: string,
	selectedCrypto: string
}
const getCryptoUnitLabel = (
	{ cryptoUnit = "satoshi", selectedCrypto = "bitcoin" }:
		GetCryptoUnitLabel = {
		cryptoUnit: "satoshi", selectedCrypto: "bitcoin"
	}) => {
	try {
		return getCoinData({ cryptoUnit, selectedCrypto }).acronym;
	} catch (e) {
		console.log(e);
	}
};

interface HeaderComponent {
	compress: boolean,
	fiatSymbol: string,
	selectedCrypto: string,
	selectedWallet: string,
	onSelectCoinPress: Function,
	isOnline: boolean,
	exchangeRate: number | string,
	walletName: string,
	selectedCryptoStyle: object,
	activeOpacity: number,
	fontSize: number,
	fiatValue: number,
	cryptoValue: number | string,
	cryptoUnit: string
}
const _Header = ({compress = false, fiatSymbol = "$", selectedCrypto = "bitcoin", onSelectCoinPress = () => null, isOnline = true, exchangeRate = 0, walletName = "", selectedCryptoStyle = {}, activeOpacity = 0.6, fontSize = 60, fiatValue = 0, cryptoValue = 0, cryptoUnit = "satoshi"}: HeaderComponent) => {
	try {
		if (isNaN(fiatValue)) fiatValue = 0;
		if (cryptoValue === 0 && cryptoUnit === "BTC") {
			cryptoValue = 0;
		} else {
			//This prevents the view from displaying 0 for values less than 50000 BTC
			if (cryptoValue < 50000 && cryptoUnit === "BTC") {
				if (typeof cryptoValue !== "number") cryptoValue = Number(cryptoValue);
				cryptoValue = `${(cryptoValue * 0.00000001).toFixed(8)}`;
			} else {
				cryptoValue = bitcoinUnits(cryptoValue, "satoshi").to(cryptoUnit).value();
			}
		}
	} catch (e) {}

	const _onSelectCoinPress = () => onSelectCoinPress();

	return (
		<TouchableOpacity style={styles.container} activeOpacity={activeOpacity} onPress={_onSelectCoinPress}>
			{walletName !== "" &&
			<Text type="white" style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{walletName}{compress && `: ${getCryptoLabel({selectedCrypto})}`}</Text>}
			{!compress && <Text type="white" style={[styles.cryptoValue, { fontSize: fontSize/2.5, ...selectedCryptoStyle }]}>{getCryptoLabel({selectedCrypto})}</Text>}
			<View style={styles.row}>
				<View style={{ flexDirection: "row", alignItems: "center", left: -4 }}>
					<Text type="white" style={[styles.fiatSymbol, { fontSize: fontSize/1.5 }]}>{fiatSymbol} </Text>
					<Text type="white" style={[styles.fiatValue, { fontSize: fontSize }]}>{formatNumber(fiatValue)}</Text>
				</View>
			</View>
			<View style={styles.cryptoValueRow}>
				<Text type="white" style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{formatNumber(cryptoValue)}  {getCryptoUnitLabel({ cryptoUnit, selectedCrypto })}</Text>
			</View>
			{isOnline !== false &&
			<View style={styles.cryptoValueRow}>
				<Text type="white" style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${fiatSymbol}${formatNumber(exchangeRate)}`}</Text>
			</View>}
			{isOnline !== true &&
			<Text type="white" style={[styles.cryptoValue, { marginTop: 10, fontSize: fontSize/2.5 }]}>Currently Offline</Text>
			}
		</TouchableOpacity>
	);
};

_Header.propTypes = {
	compress: PropTypes.bool,
	fiatValue: PropTypes.number,
	fiatSymbol: PropTypes.string,
	cryptoValue: PropTypes.number,
	cryptoUnit: PropTypes.string,
	selectedCrypto: PropTypes.string,
	selectedWallet: PropTypes.string,
	onSelectCoinPress: PropTypes.func,
	isOnline: PropTypes.bool,
	exchangeRate: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]),
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
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	fiatValue: {
		...systemWeights.thin,
		textAlign: "center",
		left: -4,
		backgroundColor: "transparent"
	},
	cryptoValue: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent"
	},
	exchangeRate: {
		...systemWeights.light,
		textAlign: "center",
		backgroundColor: "transparent"
	}
});

//ComponentShouldNotUpdate
const Header = memo(
	_Header,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.exchangeRate === prevProps.exchangeRate &&
			nextProps.fiatValue === prevProps.fiatValue &&
			nextProps.cryptoValue === prevProps.cryptoValue &&
			nextProps.isOnline === prevProps.isOnline &&
			nextProps.selectedWallet === prevProps.selectedWallet &&
			nextProps.selectedCrypto === prevProps.selectedCrypto &&
			nextProps.cryptoUnit === prevProps.cryptoUnit &&
			nextProps.compress === prevProps.compress
		);
	}
);

export default Header;
