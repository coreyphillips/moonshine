import React, {memo} from "react";
import {
	StyleSheet,
	FlatList,
	RefreshControl
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import TransactionRow from "./TransactionRow";
import { View, Text } from "../styles/components";

interface DisplayItemComponent {
	transaction: {
		item: Transaction
	},
	selectedCrypto: string,
	fiatSymbol: string,
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
		fiatSymbol = "$",
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
					fiatSymbol={fiatSymbol}
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
			prevProps.exchangeRate === nextProps.exchangeRate &&
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
	fiatSymbol: string,
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
		fiatSymbol = "$",
		blockHeight = 0,
		exchangeRate = 0,
		cryptoUnit = "satoshi",
		onRefresh,
		onTransactionPress = () => null
	}: TransactionListComponent) => {

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
				<Text style={styles.text}>No transactions to display...</Text>
			</View>
			}
			{hasTransactions() &&
			<FlatList
				contentContainerStyle={{ paddingBottom: 60 }}
				data={transactions}
				extraData={getTransactions()}
				keyExtractor={(transaction) => `${transaction.hash}`}
				renderItem={(transaction): any => {
					let isBlacklisted = false;
					try { isBlacklisted = blacklistedUtxos.includes(transaction.item.hash); } catch (e) {}
					return (
						<DisplayItem
							transaction={transaction}
							selectedCrypto={selectedCrypto}
							fiatSymbol={fiatSymbol}
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
						progressViewOffset={1000} //This is a dirty hack to hide the refresh icon for Android
						tintColor={"transparent"}
						progressBackgroundColor={"transparent"}
						colors={["transparent"]}
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
		flex: 1
	},
	transaction: {
		flex: 1
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		textAlign: "center"
	},
	emptyComponentContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 50
	}
});

//ComponentShouldNotUpdate
const TransactionList = memo(
	_TransactionList,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps &&
			prevProps.blockHeight === nextProps.blockHeight &&
			prevProps.exchangeRate === nextProps.exchangeRate &&
			prevProps.cryptoUnit === nextProps.cryptoUnit &&
			prevProps.transactions === nextProps.transactions &&
			prevProps.blacklistedUtxos === nextProps.blacklistedUtxos &&
			prevProps.selectedCrypto === nextProps.selectedCrypto;
	}
);

export default TransactionList;
