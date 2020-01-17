import React, {memo} from "react";
import PropTypes from "prop-types";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	FlatList
} from "react-native";
import { systemWeights } from "react-native-typography";
import Ionicons from "react-native-vector-icons/Ionicons";
const {
	getCoinData
} = require("../utils/networks");
const {
	getFiatBalance,
	openTxId,
	sortArrOfObjByKey
} = require("../utils/helpers");
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const _utxo = {
	tx_hash: "",
	value: 0,
	address: "",
	path: "",
	confirmations: ""
};

type UTXO = {
	tx_hash: string,
	value: number,
	address: string,
	path: string,
	confirmations: string
}

interface UtxoRowComponent {
	utxo: UTXO,
	fiatBalance: number,
	onPress: ({tx_hash: string, value: number}) => null,
	whiteListedUtxos: [string],
	coinData: Object,
	selectedCrypto: string
}

const _UtxoRow = (
	{
		utxo = _utxo,
		fiatBalance = 0,
		onPress = () => null,
		whiteListedUtxos = [""],
		coinData = { crypto: "", acronym: "" },
		selectedCrypto = "bitcoin"
	}: UtxoRowComponent) => {
	try {
		const { tx_hash, value, address, path, confirmations } = utxo;
		return (
			<TouchableOpacity
				activeOpacity={1}
				onPress={() => onPress({ tx_hash, value })}
			>
				<View style={{ flexDirection: "row" }}>
					<View style={{ flex: 1 }}>
						
						<View style={styles.row}>
							<Text style={[styles.header, { fontSize: 20 }]}>
								{`${coinData["crypto"]}: `}
							</Text>
							<Text style={[styles.text, { fontSize: 18 }]}>{value} {coinData["acronym"]}</Text>
						</View>
						
						<View style={[styles.row, {  marginBottom: 5 }]}>
							<Text style={[styles.header, { fontSize: 20 }]}>
								{`Fiat: `}
							</Text>
							<Text style={[styles.text, { fontSize: 18 }]}>${fiatBalance}</Text>
						</View>
						
						<View style={styles.row}>
							<Text style={styles.header}>
								{"Address: "}
							</Text>
							<Text style={styles.text}>{address.substring(0, 6)}...{address.substring(address.length-6, address.length)}</Text>
						</View>
						
						<View style={styles.row}>
							<Text style={styles.header}>
								{"Path: "}
							</Text>
							<Text style={styles.text}>{path}</Text>
						</View>
						
						<View style={styles.row}>
							<Text style={styles.header}>
								{"Confirmations: "}
							</Text>
							<Text style={styles.text}>{confirmations}</Text>
						</View>
						
						<TouchableOpacity
							onPress={() => openTxId(tx_hash, selectedCrypto)}
							style={{ paddingVertical: 2 }}
						>
							<Text style={[styles.header, { textDecorationLine: "underline" }]}>
								View Transaction
							</Text>
						</TouchableOpacity>
					
					</View>
					<View style={{ flex: 0.2, justifyContent: "center", alignItems: "center" }}>
						{whiteListedUtxos.includes(tx_hash) &&
						<Ionicons name="ios-checkmark-circle-outline" size={40} color={colors.green} />}
					</View>
				</View>
			</TouchableOpacity>
		);
	} catch (e) {}
};

const UtxoRow = memo(
	_UtxoRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.utxo === nextProps.utxo &&
			prevProps.fiatBalance === nextProps.fiatBalance &&
			prevProps.coinData === nextProps.coinData &&
			prevProps.selectedCrypto === nextProps.selectedCrypto &&
			prevProps.whiteListedUtxos === nextProps.whiteListedUtxos;
	}
);

interface CoinControlComponent {
	whiteListedUtxos: [string],
	whiteListedUtxosBalance: number,
	onPress: ({tx_hash: string, value: number}) => null,
	utxos: [UTXO],
	selectedCrypto: string,
	cryptoUnit: string,
	exchangeRate: number,
	style?: object,
}

const Separator = () => {
	return <View style={styles.separator} />;
};

const _CoinControl = (
	{
		whiteListedUtxos = [""],
		whiteListedUtxosBalance = 0,
		onPress = () => null,
		utxos = [_utxo],
		selectedCrypto = "bitcoin",
		cryptoUnit = "satoshi",
		exchangeRate = 0,
		style = {}
	}: CoinControlComponent) => {
	
	const coinData = getCoinData({selectedCrypto, cryptoUnit });
	
	const getAvailableToSpendText = () => {
		try {
			return `${coinData.crypto}: ${whiteListedUtxosBalance} ${coinData.acronym}`;
		} catch (e) {return "BTC: 0 sats";}
	};
	
	//Sort utxos by confirmations.
	utxos = sortArrOfObjByKey(utxos, "confirmations");
	
	return (
		<View style={[styles.container, { ...style }]}>
			
			<Text style={styles.coinControlText}>
				Amount available to spend:
			</Text>
			<Text style={[styles.coinControlHeader, { marginTop: 10, marginBottom: 2 }]}>
				{getAvailableToSpendText()}
			</Text>
			<Text style={[styles.coinControlHeader, { marginBottom: 10 }]}>
				{`Fiat: $${getFiatBalance({ balance: whiteListedUtxosBalance, exchangeRate })}`}
			</Text>
			<Text style={[styles.coinControlText, { fontSize: 20 }]}>What coins would you like to use in this transaction?</Text>
			<View style={{ width: "100%", height: 1.5, backgroundColor: colors.darkPurple, marginVertical: 5 }} />
			
			<FlatList
				contentContainerStyle={{ paddingBottom: 60 }}
				data={utxos}
				extraData={whiteListedUtxosBalance}
				keyExtractor={(utxo) => `${utxo["tx_hash"]}`}
				ItemSeparatorComponent={Separator}
				renderItem={({ item: utxo }): any => {
					try {
						const fiatBalance = getFiatBalance({ balance: utxo["value"], exchangeRate });
						return (
							<UtxoRow
								coinData={coinData}
								utxo={utxo}
								fiatBalance={fiatBalance}
								onPress={onPress}
								whiteListedUtxos={whiteListedUtxos}
								selectedCrypto={selectedCrypto}
							/>
						);
					} catch (e) {}
				}}
			/>
		</View>
	);
};

_CoinControl.protoTypes = {
	whiteListedUtxos: PropTypes.array.isRequired,
	whiteListedUtxosBalance: PropTypes.number.isRequired,
	onPress: PropTypes.func.isRequired,
	utxos: PropTypes.array.isRequired,
	selectedCrypto: PropTypes.string.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	exchangeRate: PropTypes.number.isRequired,
	style: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	header: {
		...systemWeights.thin,
		color: colors.purple,
		textAlign: "left",
		backgroundColor: "transparent",
		fontSize: 18,
		fontWeight: "bold"
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-end"
	},
	separator: {
		width: "100%",
		height: 2,
		backgroundColor: colors.gray,
		marginVertical: 15
	},
	text: {
		...systemWeights.semibold,
		color: colors.purple,
		textAlign: "left",
		backgroundColor: "transparent",
		fontSize: 16
	},
	coinControlText: {
		color: colors.darkPurple,
		...systemWeights.regular,
		fontSize: 22,
		textAlign: "center"
	},
	coinControlHeader: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent",
		fontWeight: "bold",
		color: colors.darkPurple,
		fontSize: 18
	}
});

//ComponentShouldNotUpdate
const CoinControl = memo(
	_CoinControl,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.whiteListedUtxosBalance === prevProps.whiteListedUtxosBalance
		);
	}
);

export default CoinControl;
