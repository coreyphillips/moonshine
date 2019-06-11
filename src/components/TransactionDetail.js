import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	InteractionManager
} from "react-native";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
import Button from "./Button";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import DefaultModal from "./DefaultModal";
import Loading from "./Loading";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	capitalize,
	openUrl,
	formatNumber,
	createTransaction,
	getTransactionSize
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

const moment = require("moment");

class TransactionDetail extends PureComponent <Props> {
	
	constructor(props){
		super(props);
		this.state = {
			transactionData: {},
			loading: false,
			loadingMessage: `Updating fee.\nOne moment please.`,
			initialFee: 1, //sat/byte
			rbfValue: 0, //sat/byte
			rbfIsSupported: false
		};
		
		//Handle long press when updating rbfValue
		this.rbfValueTimer = null;
		this.updateRbfValue = this.updateRbfValue.bind(this);
		this.stopRbfValueTimer = this.stopRbfValueTimer.bind(this);
	}
	
	componentDidMount() {
		//Attempt to set rbfData if able.
		InteractionManager.runAfterInteractions(() => {
			try {
				const {selectedWallet, selectedCrypto} = this.props.wallet;
				const rbfIsSupported = this.canRbf({rbfData: this.props.wallet[selectedWallet].rbfData[selectedCrypto]});
				if (!rbfIsSupported) return;
				const {hash} = this.props.wallet.selectedTransaction;
				const {transactionFee} = this.props.wallet[selectedWallet].rbfData[selectedCrypto][hash];
				this.setState({initialFee: transactionFee, rbfValue: transactionFee + 1, rbfIsSupported});
			} catch (e) {}
		});
	}
	
	Row = ({ title = "", value = "", onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) => {
		try {
			return (
				<View style={styles.row}>
					<View style={[styles.col1, col1Style]}>
						<Text style={[styles.title, titleStyle]}>{title}</Text>
					</View>
					<TouchableOpacity onPress={onPress} style={[styles.col2, col2Style]}>
						<Text style={[styles.text, valueStyle]}>{value}</Text>
					</TouchableOpacity>
				</View>
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	RbfRow = () => {
		try {
			return (
				<View style={{ marginTop: 20, alignItems: "center", justifyContent: "center" }}>
					<Text style={styles.text}>Increase the fee for a faster transaction:</Text>
					<View style={[styles.row, { alignItems: "center", justifyContent: "center" }]}>
						<TouchableOpacity onPressIn={() => this.updateRbfValue("decrease")} onPressOut={this.stopRbfValueTimer} style={styles.icon}>
							<EvilIcon name={"minus"} size={40} color={colors.darkPurple} />
						</TouchableOpacity>
						<View>
							<Text style={[styles.title, { padding: 5, flex: 0.5 }]}>
								{this.getRbfAmout()}
							</Text>
						
						</View>
						<TouchableOpacity onPressIn={() => this.updateRbfValue("increase")} onPressOut={this.stopRbfValueTimer} style={styles.icon}>
							<EvilIcon name={"plus"} size={40} color={colors.darkPurple} />
						</TouchableOpacity>
					</View>
					<Button style={{ ...styles.button, backgroundColor: "#813fb1" }} text="Increase Fee" onPress={this.increaseFee} />
				</View>
			);
		} catch (e) {}
	};
	
	openTxId = (txid): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/tx/${txid}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/tx/${txid}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/tx/LTC/${txid}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/tx/LTCTEST/${txid}`;
		openUrl(url);
	};
	
	openBlock = (block): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/block-height/${block}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/block-height/${block}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/block/LTC/${block}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/block/LTC/${block}`;
		openUrl(url);
	};
	
	openAddress = (address = ""): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/address/${address}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/address/${address}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/address/LTC/${address}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/address/LTCTEST/${address}`;
		openUrl(url);
	};
	
	openMessage = (tx = ""): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		switch (selectedCrypto) {
			case "bitcoin":
				url = `https://chain.so/tx/BTC/${tx}`;
				break;
			case "bitcoinTestnet":
				url = `https://chain.so/tx/BTCTEST/${tx}`;
				break;
			case "litecoin":
				url = `https://chain.so/tx/LTC/${tx}`;
				break;
			case "litecoinTestnet":
				url = `https://chain.so/tx/LTCTEST/${tx}`;
				break;
			default:
				return;
		}
		openUrl(url);
	};
	
	getAmount = (amount, displayFeePerByte = true): string => {
		const cryptoUnit = this.props.settings.cryptoUnit;
		const selectedCrypto = this.props.wallet.selectedCrypto;
		const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
		amount = Number(amount);
		const crypto = cryptoUnit === "satoshi" ? amount : bitcoinUnits(amount, "satoshi").to(cryptoUnit).value();
		bitcoinUnits.setFiat("usd", exchangeRate);
		let fiat = bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
		fiat = amount < 0 ? `-$${formatNumber(Math.abs(fiat).toFixed(2))}` : `$${formatNumber(fiat)}`;
		//If rbfIsSupported include the initialFee provided by the rbfData for the transaction
		if (this.state.rbfIsSupported && displayFeePerByte) {
			const initialFee = this.state.initialFee;
			const cryptoAcronym = getCoinData({selectedCrypto, cryptoUnit}).acronym;
			return `${fiat}\n${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}\n${initialFee} ${cryptoAcronym}/byte`;
		}
		return `${fiat}\n${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}`;
	};
	
	canAffordRbf = (rbfValue = undefined): boolean => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			rbfValue = rbfValue ? rbfValue : this.state.rbfValue;
			const hash = this.props.wallet.selectedTransaction.hash;
			const rbfData = this.props.wallet[selectedWallet].rbfData[selectedCrypto][hash];
			const transactionSize = getTransactionSize(rbfData.utxos.length, !rbfData.changeAddress ? 1 : 2);
			const currentBalance = Number(this.props.wallet[selectedWallet].confirmedBalance[selectedCrypto]);
			
			//Get original fee total
			const initialFeePerByte = rbfData.transactionFee;
			const initialTotalFee = transactionSize * initialFeePerByte;
			
			//Set the difference between the new and old fee values
			const totalFee = rbfValue * transactionSize;
			const feeDifference = Math.abs(totalFee-initialTotalFee);
			return currentBalance > feeDifference;
			
		} catch (e) {}
	};
	
	//Returns the RBF text for the transaction row & RBF loading modal.
	getRbfAmout = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const { hash } = this.props.wallet.selectedTransaction;
			const cryptoUnit = this.props.settings.cryptoUnit;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			const cryptoAcronym = getCoinData({selectedCrypto, cryptoUnit}).acronym;
			const rbfData = this.props.wallet[selectedWallet].rbfData[selectedCrypto][hash];
			
			const transactionSize = getTransactionSize(rbfData.utxos.length, !rbfData.changeAddress ? 1 : 2);
			
			//Get original fee per byte value
			const initialFeePerByte = rbfData.transactionFee;
			const initialTotalFee = transactionSize * initialFeePerByte;
			
			//Set the difference between the new and old fee values
			let totalFee = transactionSize * this.state.rbfValue;
			totalFee = Math.abs(totalFee-initialTotalFee);
			
			const rbfValue = this.state.rbfValue - initialFeePerByte;
			
			const crypto = cryptoUnit === "satoshi" ? totalFee : bitcoinUnits(totalFee, "satoshi").to(cryptoUnit).value();
			bitcoinUnits.setFiat("usd", exchangeRate);
			let fiat = bitcoinUnits(totalFee, "satoshi").to("usd").value().toFixed(2);
			fiat = totalFee < 0 ? `-$${formatNumber(Math.abs(fiat).toFixed(2))}` : `$${formatNumber(fiat)}`;
			
			return `+${fiat}\n+${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}\n+${rbfValue} ${cryptoAcronym}/byte`;
		} catch (e) {}
	};
	
	getConfirmations = () => {
		try {
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			if (transaction.block === null || transaction.block === 0) return 0;
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			return formatNumber(Number(currentBlockHeight) - (Number(transaction.block) - 1));
		} catch (e) {
			console.log(e);
			return 0;
		}
	};
	
	//Returns all OP_RETURN messages, if any, for the selected transaction.
	getMessages = (): string => {
		try {
			let message = "";
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			const messageLength = transaction.messages.length;
			transaction.messages.forEach((item, i) => {
				if (messageLength === 1 && i+1 === messageLength) {
					message = message.concat(`${item}`);
				} else {
					message = message.concat(`${item}\n`);
				}
			});
			return message;
		} catch (e) {
			console.log(e);
			return "";
		}
	};
	
	toggleUtxoBlacklist = async (): void => {
		try {
			const transaction = this.props.wallet.selectedTransaction.hash;
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto];
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			await this.props.toggleUtxoBlacklist({ transaction, selectedWallet, selectedCrypto });
			await this.props.updateBalance({ utxos, blacklistedUtxos, selectedCrypto, wallet: selectedWallet });
		} catch (e) {}
	};
	
	/*
	getBlacklistValue = () => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			let transacationHash = "";
			try { transacationHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			const result = blacklistedUtxos.includes(transacationHash);
			return result ? "Whitelist UTXO" : "Blacklist UTXO";
		} catch (e) {
			console.log(e);
			return "Blacklist UTXO";
		}
	};
	 */
	
	isBlacklisted = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
			let transacationHash = "";
			try { transacationHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			return blacklistedUtxos.includes(transacationHash);
		} catch (e) {
			console.log(e);
			return false;
		}
	};
	
	isActiveUtxo = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto];
			let transactionHash = "";
			try { transactionHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			let txHashes = utxos.map((utxo) => utxo.tx_hash);
			return txHashes.includes(transactionHash);
		} catch (e) {
			return false;
		}
	};
	
	canRbf = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			//Ensure the selected coin is not Litecoin and that RBF is enabled in Settings.
			if (selectedCrypto.includes("litecoin") || !this.props.settings.rbf) return false;
			
			//Ensure the transaction is still unconfirmed.
			const confirmations = this.getConfirmations();
			if (confirmations > 0) return false;
			
			//Ensure the user has enough funds to rbf.
			if (!this.canAffordRbf()) return false;
			
			//Ensure the app has stored the necessary data to perform the RBF.
			let rbfData = this.props.wallet[selectedWallet].rbfData[selectedCrypto];
			const hash = this.props.wallet.selectedTransaction.hash;
			return !!rbfData[hash];
		} catch (e) {
			return false;
		}
	};
	
	//Increases or decreases the rbfValue state.
	updateRbfValue = (action = "increase"): void => {
		try {
			const value = action === "increase" ? 1 : -1;
			if (this.state.rbfValue === this.state.initialFee + 1 && action === "decrease") return;
			
			//Ensure the user has enough funds to RBF.
			if (action === "increase" && !this.canAffordRbf(this.state.rbfValue + 1)) return;
			
			if (this.state.rbfValue < this.state.initialFee + 1) {
				this.setState({ rbfValue: this.state.initialFee + 1 });
				return;
			}
			
			this.setState({ rbfValue: this.state.rbfValue + value });
			this.rbfValueTimer = setTimeout(() => this.updateRbfValue(action), 100);
		} catch (e) {}
	};
	
	stopRbfValueTimer(): void {
		clearTimeout(this.rbfValueTimer);
	}
	
	increaseFee = async (): void => {
		try {
			//Set Loading State
			let loadingMessage = this.getRbfAmout();
			loadingMessage = `Updating fee.\nOne moment please.\n\n${loadingMessage}`;
			await this.setState({ loading: true, loadingMessage });
			
			InteractionManager.runAfterInteractions(async () => {
				const {selectedWallet, selectedCrypto} = this.props.wallet;
				const transactionFee = this.state.rbfValue;
				const hash = this.props.wallet.selectedTransaction.hash;
				let rbfData = this.props.wallet[selectedWallet].rbfData[selectedCrypto];
				const transaction = await createTransaction({...rbfData[hash], transactionFee, setRbf: true});
				let sendTransactionResult = await this.props.sendTransaction({
					txHex: transaction.data,
					selectedCrypto,
					sendTransactionFallback: this.props.settings.sendTransactionFallback
				});
				
				if (sendTransactionResult.error) {
					this.setState({loading: false});
					this.props.refreshWallet();
					setTimeout(() => {
						InteractionManager.runAfterInteractions(() => {
							alert("There was an error sending your transaction. It is possible that this transaction may have already confirmed. Please refresh your transaction list and try again.");
						});
					},1000);
				} else {
					const newRbfData = transaction.rbfData;
					newRbfData["hash"] = sendTransactionResult.data;
					rbfData[newRbfData.hash] = newRbfData;
					
					await this.props.updateWallet({
						...this.props.wallet,
						[selectedWallet]: {
							...this.props.wallet[selectedWallet],
							rbfData: {
								...this.props.wallet[selectedWallet].rbfData,
								[selectedCrypto]: rbfData
							}
						}
					});
					
					const totalFee = this.state.rbfValue * getTransactionSize(newRbfData.utxos.length, !newRbfData.changeAddress ? 1 : 2);
					
					//Attempt to add the successful transaction to the transaction list
					const selectedTransaction = this.props.wallet.selectedTransaction;
					const successfulTransaction = [selectedTransaction];
					successfulTransaction[0]["hash"] = sendTransactionResult.data;
					successfulTransaction[0]["fee"] = totalFee;

					//Add Transaction to transaction stack
					const transactionData = {
						wallet: selectedWallet,
						selectedCrypto,
						transaction: successfulTransaction
					};
					await this.props.addTransaction(transactionData);
					setTimeout(async () => {
						try {
							await this.setState({initialFee: this.state.rbfValue, rbfValue: this.state.rbfValue + 1});
							await this.props.refreshWallet();
							//Remove Loading State
							this.setState({loading: false});
						} catch (e) {}
					}, 2000);
				}
			});
		} catch (e) {}
	};
	
	render() {
		if (!this.props.wallet.selectedTransaction) return <View />;
		const { selectedCrypto } = this.props.wallet;
		const { block, type, hash, timestamp, fee, address, amount } = this.props.wallet.selectedTransaction;
		const confirmations = getConfirmations();
		const status = block === 0 || block === null || confirmations === 0 ? "Pending" : "Confirmed";
		const blockHeight = block === 0 ? "?" : block;
		const messagesLength = this.props.wallet.selectedTransaction.messages.length;
		const isBlacklisted = this.isBlacklisted();
		
		return (
			<View style={styles.container}>
				
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{ flex: 0.9 }}>
					<View style={styles.transactionData}>
						<Text style={styles.header}>Transaction Details</Text>
						
						{this.Row({ title: "Network:", value: capitalize(selectedCrypto) })}
						<View style={styles.separator} />
						
						{messagesLength > 0 && this.Row({ title: "Message:", value: this.getMessages(), onPress: () => this.openMessage(hash), valueStyle: { textDecorationLine: "underline" } })}
						{messagesLength > 0 && <View style={styles.separator} />}
						
						{type === "sent" && this.Row({ title: "Amount Sent:", value: this.getAmount(amount, false) })}
						{type === "received" && this.Row({ title: "Amount \n Received:", value: this.getAmount(amount) })}
						<View style={styles.separator} />
						
						{this.Row({ title: "Transaction\nFee:", value: this.getAmount(fee) })}
						{this.state.rbfIsSupported && this.RbfRow()}
						<View style={styles.separator} />
						
						{type === "sent" && this.Row({ title: "Total Sent:", value: this.getAmount(amount+fee) })}
						{type === "sent" && <View style={styles.separator} />}
						
						{this.Row({ title: "Type:", value: capitalize(type) })}
						<View style={styles.separator} />
						
						{this.Row({ title: "Confirmations:", value: this.getConfirmations() })}
						<View style={styles.separator} />
						
						{this.Row({ title: "Status:", value: capitalize(status) })}
						<View style={styles.separator} />
						
						{this.Row({ title: `Date \n ${capitalize(type)}:`, value: moment.unix(timestamp).format('l @ h:mm a') })}
						<View style={styles.separator} />
						
						{this.Row({ title: "Block:", value: formatNumber(blockHeight), onPress: () => this.openBlock(blockHeight), valueStyle: { textDecorationLine: "underline" } })}
						<View style={styles.separator} />
						
						{type === "received" && this.Row({ title: "Received By\nAddress:", onPress: () => this.openAddress(address), value: address, valueStyle: { textDecorationLine: "underline" } })}
						{type === "received" && <View style={styles.separator} />}
						
						{this.Row({ title: "TxId:", value: hash, onPress: () => this.openTxId(hash), valueStyle: { textDecorationLine: "underline" } })}
						<View style={styles.separator} />
						
						{this.isActiveUtxo() &&
						<Button style={{ ...styles.button, backgroundColor: isBlacklisted ? colors.red : "#813fb1" }} text={isBlacklisted ? "Whitelist UTXO" : "Blacklist UTXO"} onPress={this.toggleUtxoBlacklist} />}
					
					</View>
				</ScrollView>
				
				<View style={{ flex: 0.1, backgroundColor: colors.lightGray }} />
				
				<DefaultModal
					isVisible={this.state.loading}
					onClose={() => this.setState({ loading: false })}
					type="View"
					style={styles.modal}
					contentStyle={styles.modalContent}
				>
					<Loading
						textStyle={{ color: colors.darkGray }}
						loadingOpacity={1}
						loadingMessage={this.state.loadingMessage}
						loadingProgress={0.5}
						animationName="dino"
						width={400}
						enableProgressBar={false}
					/>
				</DefaultModal>
				
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	separator: {
		height: 1.5,
		backgroundColor: colors.purple,
		width: "100%",
		marginVertical: 8
	},
	col1: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
	},
	col2: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	transactionData: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		paddingHorizontal: 5
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.white
	},
	title: {
		...systemWeights.bold,
		color: colors.darkPurple,
		fontSize: 16,
		textAlign: "center"
	},
	text: {
		...systemWeights.light,
		color: colors.darkPurple,
		fontSize: 16,
		textAlign: "left"
	},
	header: {
		...systemWeights.bold,
		color: colors.darkPurple,
		fontSize: 20,
		textAlign: "center",
		marginVertical: 20
	},
	button: {
		minWidth: "20%",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	icon: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 5
	},
	modal: {
		flex: 0,
		height: "60%",
		width: "90%"
	},
	modalContent: {
		backgroundColor: colors.lightGray,
		borderWidth: 5,
		borderRadius: 20,
		borderColor: colors.white
	}
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const walletActions = require("../actions/wallet");
const settingsActions = require("../actions/settings");
const transactionActions = require("../actions/transaction");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...walletActions,
		...settingsActions,
		...transactionActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(TransactionDetail);