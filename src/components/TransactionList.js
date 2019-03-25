import React, {PureComponent} from "react";
import {
	StyleSheet,
	Text,
	View,
	FlatList,
	RefreshControl
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography"
import TransactionRow from "./TransactionRow";
import LottieView from "lottie-react-native";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const FONT_SIZE = 60;

//transactions = [], selectedCrypto = "bitcoin", exchangeRate = 0, blockHeight = 0, onRefresh = () => null, onTransactionPress = () => null
class TransactionList extends PureComponent {

	displayItem = ({ transaction = {}, selectedCrypto = "bitcoin", exchangeRate = 0, blockHeight = 0, onTransactionPress = () => null, cryptoUnit = "satoshi" } = {}) => {
		try {
			const hash = transaction.item.hash;
			const timestamp = transaction.item.timestamp;
			const type = transaction.item.type;
			const status = transaction.item.status;
			const confirmations = transaction.item.confirmations;
			const block = transaction.item.block;
			const amount = transaction.item.amount;
			const messages = transaction.item.messages;
			//const { amount, confirmations, data, hash, status, timestamp, type } = transaction;
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
						confirmations={confirmations}
						status={status}
						type={type}
						cryptoUnit={cryptoUnit}
						exchangeRate={exchangeRate}
						transactionBlockHeight={block}
						currentBlockHeight={blockHeight}
						onTransactionPress={onTransactionPress}
					/>
				</View>
			)
		} catch (e) {
			console.log(e);
		}
	};

	displayEmptyComponent = () => {
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
			)
		} catch (e) {
			console.log(e);
		}
	};

	hasTransactions = () => {
		try {
			return this.props.transactions.length > 0;
		} catch (e) {
			return false;
		}
	};

	render() {
		return (
			<View style={styles.container}>
				{!this.hasTransactions() &&
				<View style={styles.emptyComponentContainer}>
					<Text style={styles.purpleText}>No transactions to display...</Text>
				</View>
				}
				{this.hasTransactions() &&
				<FlatList
					contentContainerStyle={{ paddingBottom: 60 }}
					data={this.props.transactions}
					extraData={this.props.transactions}
					keyExtractor={(transaction, index) => `${transaction.hash}${index}`}
					ListEmptyComponent={this.displayEmptyComponent}
					renderItem={(transaction) => this.displayItem({ transaction, selectedCrypto: this.props.selectedCrypto, exchangeRate: this.props.exchangeRate, blockHeight: this.props.blockHeight, onTransactionPress: this.props.onTransactionPress, cryptoUnit: this.props.cryptoUnit })}
					refreshControl={
						<RefreshControl
							refreshing={false}
							enabled={true}
							onRefresh={this.props.onRefresh}
							tintColor={"transparent"}
							progressBackgroundColor={"transparent"}
							colors={[colors.white]}
						/>
					}
				/>}
			</View>
		)
	}
}

// Default values for props
TransactionList.defaultProps = {
	transactions: [],
	selectedCrypto: "bitcoin",
	exchangeRate: "0",
	blockHeight: 0,
	onRefresh: () => null,
	onTransactionPress: () => null
};

TransactionList.propTypes = {
	transactions: PropTypes.arrayOf(PropTypes.shape({
		address: PropTypes.string,
		amount: PropTypes.number.isRequired,
		block: PropTypes.number,
		data: PropTypes.string.isRequired,
		fee: PropTypes.number.isRequired,
		hash: PropTypes.string,
		inputAmount: PropTypes.number.isRequired,
		messages: PropTypes.arrayOf(PropTypes.string).isRequired,
		outputAmount: PropTypes.number.isRequired,
		path: PropTypes.string,
		receivedAmount: PropTypes.number.isRequired,
		sentAmount: PropTypes.number.isRequired,
		timestamp: PropTypes.number,
		type: PropTypes.string.isRequired,
	})),
	selectedCrypto: PropTypes.string.isRequired,
	exchangeRate: PropTypes.string.isRequired,
	blockHeight: PropTypes.number.isRequired,
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


module.exports = TransactionList;