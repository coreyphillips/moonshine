import React, { memo } from "react";
import {
	StyleSheet,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import { View, Text, EvilIcon, Ionicons, ActivityIndicator } from "../styles/components";
import {systemWeights} from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface TransactionsComponent {
	loadingTransactions: boolean,
	refreshWallet: () => void,
	displayTransactionList: boolean,
	transactionsAreExpanded: boolean,
	resetView: () => void,
	expandTransactions: () => void
}

const _TransactionListHeader = (
	{
		loadingTransactions = false,
		refreshWallet = () => null,
		displayTransactionList = false,
		transactionsAreExpanded = false,
		resetView = () => null,
		expandTransactions = () => null
	}: TransactionsComponent) => {
	return (
		<View style={styles.container}>
			<View style={styles.transactionListHeader}>
				{!loadingTransactions &&
				<TouchableOpacity onPress={refreshWallet} style={styles.refresh}>
					<Ionicons type="text2" name={"ios-refresh"} size={18} />
				</TouchableOpacity>}
				{loadingTransactions && displayTransactionList &&
				<View style={styles.refresh}>
					<ActivityIndicator type="text" size="small" />
				</View>}
				<TouchableOpacity
					onPress={transactionsAreExpanded ? resetView : expandTransactions}
					style={[styles.centerContent, { flex: 2 }]}
				>
					<Text style={styles.boldText}>Transactions</Text>
				</TouchableOpacity>
				
				<TouchableOpacity
					onPress={transactionsAreExpanded ? resetView : expandTransactions}
					style={styles.expand}
				>
					{transactionsAreExpanded &&
					<EvilIcon name={"chevron-down"} size={30} color={colors.darkPurple} />}
					{!transactionsAreExpanded &&
					<EvilIcon name={"chevron-up"} size={30} color={colors.darkPurple} />}
				</TouchableOpacity>
			</View>
		</View>
	);
};

_TransactionListHeader.propTypes = {
	loadingTransactions: PropTypes.bool.isRequired,
	refreshWallet: PropTypes.func.isRequired,
	displayTransactionList: PropTypes.bool.isRequired,
	transactionsAreExpanded: PropTypes.bool.isRequired,
	resetView: PropTypes.func.isRequired,
	expandTransactions: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
	container: {
		flex: 0
	},
	transactionListHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: colors.gray
	},
	refresh: {
		flex: 0.5,
		alignItems: "flex-start",
		justifyContent: "center",
		paddingLeft: 15
	},
	centerContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center"
	},
	boldText: {
		...systemWeights.semibold,
		fontSize: 20,
		textAlign: "center"
	},
	expand: {
		flex: 0.5,
		alignItems: "flex-end",
		justifyContent: "center",
		paddingRight: 10
	},
});

//ComponentShouldNotUpdate
const TransactionListHeader = memo(
	_TransactionListHeader,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default TransactionListHeader;
