/**
 * @format
 * @flow strict-local
 */
import * as React from "react";
import {useState, useEffect, memo} from "react";
import {
	StyleSheet
} from 'react-native';
import {
	View,
	Text,
	ActivityIndicator,
	TouchableOpacity
} from "../styles/components";
const {
	walletHelpers
} = require("../utils/walletApi");
import bitcoinUnits from "bitcoin-units";
import {systemWeights} from "react-native-typography";

const {
	cryptoToFiat
} = require("../utils/helpers");
const {
	getCoinData
} = require("../utils/networks");

interface FeeEstimateComponent {
	selectedCrypto: string,
	exchangeRate: number | string,
	transactionSize: number,
	updateFee: (number) => void,
	onClose: () => void,
	fiatSymbol: string,
	cryptoUnit: string
}

interface EstimateData {
	label: string,
	sats: number,
	fiat: number
}

const _FeeEstimate = (
	{
		selectedCrypto = "bitcoin",
		exchangeRate = 0,
		transactionSize = 0,
		updateFee = () => null,
		onClose = () => null,
		fiatSymbol = "$",
		cryptoUnit = "sats"
	}: FeeEstimateComponent) => {
	const [feeEstimates, setFeeEstimates] = useState([{ label: "", sats: 0, fiat: 0 }]);
	const coinData = getCoinData({ selectedCrypto, cryptoUnit });

	const blocks = [
		{label: `Next Block (${coinData.blockTime} minutes)`, blocksWillingToWait: 1},
		{label: "1 hour", blocksWillingToWait: 6},
		{label: "6 hours", blocksWillingToWait: 36},
		{label: "12 hours", blocksWillingToWait: 72},
		{label: "1 day", blocksWillingToWait: 144},
		{label: "3 days", blocksWillingToWait: 432},
		{label: "1 week", blocksWillingToWait: 1008}
	];

	const getEstimates = async () => {
		try {
			const DIVIDE_RECOMMENDED_FEE_BY = 10;
			const estimates: EstimateData[] = [];
			let estimateData: EstimateData = { label: "", sats: 0, fiat: 0 };
			await Promise.all(blocks.map(async ({ label, blocksWillingToWait }, i) => {
				const response = await walletHelpers.feeEstimate.default({ selectedCrypto, blocksWillingToWait });
				if (!response.error) {
					let sats = 1;
					let fiat = 0;
					try {
						sats = Number((bitcoinUnits(response.data, "BTC").to("satoshi").value()/transactionSize).toFixed(0));
						try {sats = Math.round(sats / DIVIDE_RECOMMENDED_FEE_BY);} catch (e) {}
						if (sats < 1) sats = 1;

						fiat = cryptoToFiat({ amount: sats*transactionSize, exchangeRate });
					} catch (e) {}
					estimateData = { label, sats, fiat };
					estimates[i] = estimateData;
				}
			}));
			setFeeEstimates(estimates);
		} catch (e) {}
	};

	const componentDidMount = () => {
		try {getEstimates();} catch {}
	};

	const componentWillUnmount = () => {};

	useEffect(() => {
		componentDidMount();
		return () => {
			componentWillUnmount();
		};
	}, []);

	const onFeePress = (sats) => {
		updateFee(sats);
		onClose();
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Current Fee Estimates</Text>
			</View>
			<View style={styles.content}>
				{feeEstimates && feeEstimates.length > 5 && feeEstimates.map(({ label, sats, fiat}) => (
					<TouchableOpacity type="transparent" onPress={() => onFeePress(sats)} key={label}>
						<Text style={[styles.text, { textAlign: "left", fontSize: 19, paddingTop: 5, ...systemWeights.semibold }]}>{label}</Text>
						<View style={styles.row}>
							<Text style={[styles.text, { flex: 1.2, textAlign: "left" }]}>{sats} {coinData.oshi}/B</Text>
							<Text style={[styles.text, { flex: 1 }]}>{sats*transactionSize} sats</Text>
							<Text style={[styles.text, { flex: 1, textAlign: "right" }]}>{fiatSymbol}{fiat}</Text>
						</View>
						<View type="text2" style={styles.divider} />
					</TouchableOpacity>
				))}
				{feeEstimates && feeEstimates.length > 5 &&
					<View style={{ height: 150 }} />
				}
			</View>
			{feeEstimates.length <= 5 &&
			<View style={{ marginTop: "30%" }}><ActivityIndicator size="large"  /></View>}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	header: {
		paddingVertical: 25,
		alignSelf: "center",
		justifyContent: "center"
	},
	content: {
		justifyContent: "center"
	},
	title: {
		...systemWeights.bold,
		fontSize: 21,
		textAlign: "center"
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		textAlign: "center"
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 12
	},
	divider: {
		height: 1,
		width: "100%"
	}
});

//ComponentShouldNotUpdate
const FeeEstimate = memo(
	_FeeEstimate,
	(prevProps, nextProps) => {
		return prevProps === nextProps;
	}
);

export default FeeEstimate;
