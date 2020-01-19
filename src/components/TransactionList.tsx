import React, {useEffect, memo} from "react";
import {
	StyleSheet,
	Text,
	View,
	FlatList,
	RefreshControl,
	LayoutAnimation,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import TransactionRow from "./TransactionRow";
import LottieView from "lottie-react-native";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface DisplayItemComponent {
	transaction: {
		item: Transaction
	},
	selectedCrypto: string,
	exchangeRate: number | string,
	blockHeight: number,
	onTransactionPress: Function,
	cryptoUnit: string,
	isBlacklisted: boolean
}
const _DisplayItem = (
	{
		transaction = {
			item: { hash: "", timestamp: 0, type: "", status: "sent", block: 0, messages: [], sentAmount: 0, amount: 0 }
		},
		selectedCrypto = "bitcoin",
		exchangeRate = "0",
		blockHeight = 0,
		onTransactionPress = () => null,
		cryptoUnit = "satoshi",
		isBlacklisted = false
	}: DisplayItemComponent) => {
	
	try {
		const hash = transaction.item.hash;
		const timestamp = transaction.item.timestamp;
		const type = transaction.item.type;
		const block = transaction.item.block;
		//Include the fee in the amount if the user sent the transaction.
		const amount = type === "sent" ? transaction.item.sentAmount : transaction.item.amount;
		const messages = transaction.item.messages;
		return (
			<View style={styles.transaction}>
				<TransactionRow
					id={hash}
					coin={selectedCrypto}
					address={hash}
					amount={amount}
					messages={messages}
					label=""
					date={timestamp}
					type={type}
					cryptoUnit={cryptoUnit}
					exchangeRate={exchangeRate}
					transactionBlockHeight={block}
					currentBlockHeight={blockHeight}
					onTransactionPress={onTransactionPress}
					isBlacklisted={isBlacklisted}
				/>
			</View>
		);
		
	} catch (e) {
		console.log(e);
	}
};

const DisplayItem = memo(
	_DisplayItem,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.blockHeight === nextProps.blockHeight &&
			prevProps.cryptoUnit === nextProps.cryptoUnit &&
			prevProps.transaction.item.hash === nextProps.transaction.item.hash &&
			prevProps.transaction.item.messages === nextProps.transaction.item.messages &&
			prevProps.transaction.item.amount === nextProps.transaction.item.amount &&
			prevProps.transaction.item.sentAmount === nextProps.transaction.item.sentAmount &&
			prevProps.transaction.item.status === nextProps.transaction.item.status &&
			prevProps.transaction.item.type === nextProps.transaction.item.type &&
			prevProps.transaction.item.timestamp === nextProps.transaction.item.timestamp &&
			prevProps.isBlacklisted === nextProps.isBlacklisted;
	}
);


type Transaction = {
	hash: string,
	timestamp: number,
	type: string,
	status: string,
	block: number,
	sentAmount: number,
	messages: [],
	amount: number
}
interface TransactionListComponent {
	transactions: [Transaction],
	blacklistedUtxos: string[],
	selectedCrypto: string,
	blockHeight: number,
	exchangeRate: number | string,
	cryptoUnit: string,
	onRefresh: Function,
	onTransactionPress: Function
}

const _TransactionList = (
	{
		transactions = [{ hash: "", timestamp: 0, type: "", status: "sent", block: 0, messages: [], sentAmount: 0, amount: 0 }],
		blacklistedUtxos = [],
		selectedCrypto = "",
		blockHeight = 0,
		exchangeRate = 0,
		cryptoUnit = "satoshi",
		onRefresh,
		onTransactionPress = () => null
	}: TransactionListComponent) => {
	
	//if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const displayEmptyComponent = () => {
		try {
			return (
				<View style={{ position: "absolute", alignItems: "center", justifyContent: "center", top: 0, bottom: 0, left: 0, right: 0, borderWidth: 1, borderColor: "blue" }}>
					<Text style={[styles.boldPurpleText, { marginTop: 20 }]}>No items to display...</Text>
					<LottieView
						source={require("../assets/lottie/empty_list")}
						autoPlay={true}
						loop={true}
						style={{ width: 150, height: 150, marginTop: 10 }}
					/>
				</View>
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	//Returns all transactions for the selected crypto.
	const getTransactions = () => {
		try {
			if (Array.isArray(transactions)) {
				return transactions;
			}
			return [];
		} catch (e) {
			//console.log(e);
			return [];
		}
	};

	const hasTransactions = () => {
		try {
			return transactions.length > 0;
		} catch (e) {
			return false;
		}
	};
	
	return (
		<View style={styles.container}>
			{!hasTransactions() &&
			<View style={styles.emptyComponentContainer}>
				<Text style={styles.purpleText}>No transactions to display...</Text>
			</View>
			}
			{hasTransactions() &&
			<FlatList
				contentContainerStyle={{ paddingBottom: 60 }}
				data={transactions}
				extraData={getTransactions()}
				keyExtractor={(transaction) => `${transaction.hash}`}
				ListEmptyComponent={displayEmptyComponent()}
				renderItem={(transaction): any => {
					let isBlacklisted = false;
					try { isBlacklisted = blacklistedUtxos.includes(transaction.item.hash); } catch (e) {}
					return (
						<DisplayItem
							transaction={transaction}
							selectedCrypto={selectedCrypto}
							exchangeRate={exchangeRate}
							blockHeight={blockHeight}
							onTransactionPress={onTransactionPress}
							cryptoUnit={cryptoUnit}
							isBlacklisted={isBlacklisted}
						/>
						);
				}}
				refreshControl={
					<RefreshControl
						refreshing={false}
						enabled={true}
						// @ts-ignore
						onRefresh={onRefresh}
						tintColor={"transparent"}
						progressBackgroundColor={"transparent"}
						colors={[colors.white]}
					/>
				}
			/>}
		</View>
	);
};

_TransactionList.propTypes = {
	exchangeRate: PropTypes.string.isRequired || PropTypes.number.isRequired,
	blockHeight: PropTypes.number.isRequired,
	blacklistedUtxos: PropTypes.array.isRequired,
	selectedCrypto: PropTypes.string.isRequired,
	transactions: PropTypes.array.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	onRefresh: PropTypes.func.isRequired,
	onTransactionPress: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white
	},
	transaction: {
		flex: 1,
		backgroundColor: colors.white
	},
	boldPurpleText: {
		...systemWeights.bold,
		color: colors.purple,
		fontSize: 20,
		textAlign: "center"
	},
	purpleText: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	},
	emptyComponentContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 50,
		backgroundColor: colors.white
	}
});

//ComponentShouldNotUpdate
const TransactionList = memo(
	_TransactionList,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps &&
			prevProps.blockHeight === nextProps.blockHeight &&
			prevProps.cryptoUnit === nextProps.cryptoUnit &&
			prevProps.transactions === nextProps.transactions &&
			prevProps.blacklistedUtxos === nextProps.blacklistedUtxos &&
			prevProps.selectedCrypto === nextProps.selectedCrypto;
	}
);

export default TransactionList;
