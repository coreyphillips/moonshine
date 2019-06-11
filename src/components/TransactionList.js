import React, {PureComponent} from "react";
import {
	StyleSheet,
	Text,
	View,
	FlatList,
	RefreshControl
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

//transactions = [], selectedCrypto = "bitcoin", exchangeRate = 0, blockHeight = 0, onRefresh = () => null, onTransactionPress = () => null
class TransactionList extends PureComponent {

	displayItem = ({ style = {}, transaction = {}, selectedCrypto = "bitcoin", exchangeRate = 0, blockHeight = 0, onTransactionPress = () => null, cryptoUnit = "satoshi", isBlacklisted = false } = {}) => {
		try {
			const hash = transaction.item.hash;
			const timestamp = transaction.item.timestamp;
			const type = transaction.item.type;
			const status = transaction.item.status;
			const confirmations = transaction.item.confirmations;
			const block = transaction.item.block;
			const fee = transaction.item.fee;
			//Include the fee in the amount if the user sent the transaction.
			const amount = type === "sent" ? transaction.item.amount + fee : transaction.item.amount;
			const messages = transaction.item.messages;
			//const { amount, confirmations, data, hash, status, timestamp, type } = transaction;
			return (
				<View style={[styles.transaction, style]}>
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
						isBlacklisted={isBlacklisted}
					/>
				</View>
			);
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
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	//Returns all transactions for the selected crypto.
	getTransactions = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const transactions = this.props.wallet[selectedWallet].transactions[selectedCrypto];
			if (Array.isArray(transactions)) {
				return transactions;
			}
			return [];
		} catch (e) {
			//console.log(e);
			return [];
		}
	};

	hasTransactions = () => {
		try {
			return this.getTransactions().length > 0;
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
					data={this.getTransactions()}
					extraData={this.getTransactions()}
					keyExtractor={(transaction, index) => `${transaction.hash}${index}`}
					ListEmptyComponent={this.displayEmptyComponent}
					renderItem={(transaction) => {
						const { selectedWallet, selectedCrypto } = this.props.wallet;
						let isBlacklisted = false;
						try { isBlacklisted = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto].includes(transaction.item.hash); } catch (e) {}
						return (
							this.displayItem({
								transaction,
								selectedCrypto: this.props.wallet.selectedCrypto,
								exchangeRate: this.props.wallet.exchangeRate[selectedCrypto],
								blockHeight: this.props.wallet.blockHeight[selectedCrypto],
								onTransactionPress: this.props.onTransactionPress,
								cryptoUnit: this.props.settings.cryptoUnit,
								isBlacklisted
							})
						);
					}}
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
		);
	}
}

// Default values for props
TransactionList.defaultProps = {
	onRefresh: () => null,
	onTransactionPress: () => null
};

TransactionList.propTypes = {
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


const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const walletActions = require("../actions/wallet");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...walletActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(TransactionList);