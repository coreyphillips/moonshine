import React, { Component } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	TextInput,
	Animated,
	Clipboard,
	LayoutAnimation,
	Dimensions,
	Platform,
	InteractionManager,
	Keyboard
} from "react-native";
import PropTypes from "prop-types";
import Slider from "@react-native-community/slider";
import { systemWeights } from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Modal from "react-native-modal";

import Header from "./Header";
import Button from "./Button";
import XButton from "./XButton";
import Loading from "./Loading";
import bitcoinUnits from "bitcoin-units";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	getDifferenceBetweenDates,
	createTransaction,
	getTransactionSize,
	validateAddress,
	parseFiat,
	capitalize,
	generateAddresses,
	pauseExecution,
	nthIndex,
	removeAllButFirstInstanceOfPeriod,
	formatNumber
} = require("../utils/helpers");

const {
	getCoinData,
	supportsRbf
} = require("../utils/networks");

const moment = require("moment");
const { width, height } = Dimensions.get("window");

class SendTransaction extends Component<Props> {
	constructor(props) {
		super(props);
		this.state = {
			displayXButton: false,
			xButtonOpacity: new Animated.Value(1),

			displayCamera: false,
			cameraOpacity: new Animated.Value(0),

			displayConfirmationModal: false,
			confirmationModalOpacity: new Animated.Value(0),

			displayLoading: false,
			loadingOpacity: new Animated.Value(0),
			loadingMessage: "",
			loadingProgress: 0,
			enableLoadingSpinner: true,
			enableLoadingProgressBar: true,
			enableLoadingSuccessIcon: false,
			enableLoadingErrorIcon: false,

			onCameraPress: props.onCameraPress,
			spendMaxAmount: false,
			fiatBalance: 0,
			cryptoBalance: 0,
			displayInCrypto: true,
			rawTx: "",
			rawTxCopiedOpacity: new Animated.Value(0),
			generatingTxHex: false,
			cryptoUnitAmount: ""
		};
	}

	async componentDidMount() {
		const setupSendTransaction = () => {
			//Set user balance information
			const fiatBalance = this.getFiatBalance();
			const cryptoBalance = this.getCryptoBalance();
			this.setState({cryptoBalance, fiatBalance});
			
			//Set the transactionSize to accurately determine the transaction fee
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
			const transactionSize = getTransactionSize(utxos.length, 2);
			this.props.updateTransaction({ transactionSize });
			
			//Set Maximum Fee (recommendedFee * 4) to prevent any user accidents.
			//Set Recommended Fee as Starting Fee
			this.calculateFees();
		};
		
		if (Platform.OS === "ios") {
			try {setupSendTransaction();} catch (e) {}
		} else {
			InteractionManager.runAfterInteractions(() => {
				try {setupSendTransaction();} catch (e) {}
			});
		}
	}

	componentDidUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}

	componentWillUnmount() {
		InteractionManager.runAfterInteractions(() => {
			try {
				this.props.resetTransaction();
			} catch (e) {
			}
		});
	}

	//Handles The "Loading" Opacity Animation
	updateXButton = async ({ display = true } = {}) => {
		return new Promise(async (resolve) => {
			try {
				//Perform any other action after the update has been completed.
				if (this.state.displayXButton !== display) this.setState({ displayXButton: display });
				resolve({error: false});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "Loading" Opacity Animation
	updateLoading = async ({ display = true, duration = 400, loadingMessage = "", loadingProgress = 0 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				if (display === true) this.setState({ displayLoading: display, loadingMessage, loadingProgress });
				Animated.timing(
					this.state.loadingOpacity,
					{
						toValue: display ? 1 : 0,
						duration,
						useNativeDriver: true
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					if (display === false) this.setState({ displayLoading: display, loadingMessage, loadingProgress });
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	//Handles The "confirmationModal" Opacity Animation
	updateConfirmationModal = async ({ display = true } = {}) => {
		return new Promise(async (resolve) => {
			this.updateXButton({ display });
			if (this.state.displayConfirmationModal !== display) this.setState({ displayConfirmationModal: display });
			resolve({ error: false });
		});
	};

	getTotalFee = (fee = 0, transactionSize = 0) => {
		try {
			if (!fee || isNaN(fee)) {
				fee = this.props.transaction.fee;
			}
			if (!transactionSize || isNaN(transactionSize)) {
				transactionSize = this.props.transaction.transactionSize;
			}
			let totalFee = Number((fee * transactionSize).toFixed(0));
			totalFee = Number(totalFee);
			return totalFee;
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	getFeesToDisplay = (exchangeRate = 0) => {
		/*
		Always cap the users fee slider to 4x what the suggested fee is as long as their (balance-amount sending) is greater than 4x the suggested fee.
		Otherwise cap the fee to what the user has remaining of their balance minus the amount they are sending.
		 */
		try {
			//Return 0 if no exchange rate was given.
			let crypto = 0, fiat = 0;
			if (exchangeRate === 0) return { crypto, fiat };

			//Calculate crypto & fiat fees.
			const fee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
			crypto = this.getTotalFee(fee);
			fiat = this.cryptoToFiat({ amount: crypto });

			//Return 0 if isNaN is returned.
			if (isNaN(crypto)) crypto = 0;
			if (isNaN(fiat)) fiat = 0;

			return { crypto, fiat };
		} catch (e) {
			console.log(e);
		}
	};

	getFiatBalance = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const confirmedBalance = Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]);
			bitcoinUnits.setFiat("usd", Number(this.props.wallet.exchangeRate[selectedCrypto]));
			const fiatBalance = bitcoinUnits(confirmedBalance, "satoshi").to("usd").value().toFixed(2);
			if (isNaN(fiatBalance)) return 0;
			return Number(fiatBalance);
		} catch (e) {
			return 0;
		}
	};

	getCryptoBalance = () => {
		//Get confirmed balance
		let confirmedBalance = 0;
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			return Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]) || 0;
		} catch (e) {}
		return confirmedBalance;
	};

	hasEnoughFunds = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const walletBalance = this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto];
			const amount = this.props.transaction.amount;
			const fee = this.props.transaction.fee || this.props.transaction.recommendedFee;
			const totalFee = this.getTotalFee(fee);
			const total = Number(amount) + Number(totalFee);
			return Number(walletBalance) >= total;
		} catch (e) {
			console.log(e);
		}
	};

	onMaxPress = async () => {
		try {
			
			//"spendMaxAmount" will not send funds back to a changeAddress and thus have one less output so we need to update the transactionSize accordingly.
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
			const transactionSize = getTransactionSize(utxos.length, !this.state.spendMaxAmount ? 1 : 2);
			const recommendedFee = Number(this.props.transaction.recommendedFee);
			const walletBalance = this.state.cryptoBalance;
			
			if (!this.state.spendMaxAmount) {
				let totalFee = this.getTotalFee(recommendedFee, transactionSize);
				let cryptoUnitAmount = 0;

				if (walletBalance > totalFee) {
					const amount = walletBalance - totalFee;
					const fiatAmount = this.cryptoToFiat({ amount });
					cryptoUnitAmount = bitcoinUnits(amount, "satoshi").to(this.props.settings.cryptoUnit).value();
					this.props.updateTransaction({ fee: parseInt(recommendedFee), amount, fiatAmount, transactionSize });
				} else {
					const difference = totalFee - walletBalance;
					totalFee = difference / 2;
					const fiatAmount = this.cryptoToFiat({ amount: totalFee });
					cryptoUnitAmount = bitcoinUnits(totalFee, "satoshi").to(this.props.settings.cryptoUnit).value();
					this.props.updateTransaction({ fee: parseInt(recommendedFee/2), amount: totalFee, fiatAmount, transactionSize });
				}
				if (this.state.cryptoUnitAmount !== cryptoUnitAmount) this.setState({ cryptoUnitAmount });
			} else {
				const amount = this.props.transaction.amount;
				let totalFee = this.getTotalFee(this.props.transaction.fee, transactionSize);
				if (walletBalance > totalFee+amount) {
					this.props.updateTransaction({ transactionSize });
				} else {
					//Update the amount to account for the difference between the transaction cost & walletBalance and bring it in line with the walletBalance
					const difference = Math.abs((totalFee+amount) - walletBalance);
					let newAmount = 0;
					if (difference < amount) newAmount = amount - difference;
					this.props.updateTransaction({ transactionSize, amount: newAmount });
				}
			}
			await this.setState({ spendMaxAmount: !this.state.spendMaxAmount });
		} catch (e) {
			console.log(e);
		}
	};

	cryptoToFiat = ({ amount = 0 }) => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			amount = Number(amount);
			bitcoinUnits.setFiat("usd", exchangeRate);
			return bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
		} catch(e) {
			console.log(e);
		}
	};

	fiatToCrypto = ({ amount = 0 }) => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			amount = Number(amount);
			bitcoinUnits.setFiat("usd", exchangeRate);
			return bitcoinUnits(amount, "usd").to("satoshi").value().toFixed(0);
		} catch (e) {
			console.log(e);
		}
	};

	updateFee = (fee = 0) => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			let totalFee = this.getTotalFee(fee);
			totalFee = Number(totalFee);
			let amount = Number(this.props.transaction.amount);
			let walletBalance = Number(this.state.cryptoBalance);

			if (this.state.spendMaxAmount) {
				//Not enough funds to support this fee.
				if (totalFee >= walletBalance) return;
				const amount = walletBalance - totalFee;
				const fiatAmount = this.cryptoToFiat({ amount, exchangeRate });
				const cryptoUnitAmount = bitcoinUnits(amount, "satoshi").to(this.props.settings.cryptoUnit).value();
				this.setState({ cryptoUnitAmount });
				this.props.updateTransaction({ fee: Number(fee), amount, fiatAmount });
			} else {
				if (totalFee + amount > walletBalance) return;
				this.props.updateTransaction({ fee: Number(fee) });
			}
		} catch (e) {
			console.log(e);
		}
	};

	getTextInputAmount = () => {
		try {
			if (this.state.displayInCrypto) {
				return this.state.cryptoUnitAmount.toString();
			} else {
				let fiatAmount = formatNumber(this.props.transaction.fiatAmount).toString();
				if (fiatAmount === "0.00") fiatAmount = "";
				return fiatAmount;
			}

		} catch (e) {
			console.log(e);
		}
	};

	updateAmount = async (amount = "") => {
		const cryptoUnit = this.props.settings.cryptoUnit;
		let fiatAmount = "";
		let satoshiAmount = "";
		
		if (!isNaN(amount)) amount = await amount.toString();

		//Remove all commas
		amount = amount.split(',').join("");

		//Remove all decimals if the cryptoUnit is satoshi/litoshi and is currently displayed in crypto.
		if (this.state.displayInCrypto) {
			if (cryptoUnit === "satoshi" || cryptoUnit === "litoshi") amount = amount.split('.').join("");
		}
		//Format input
		amount = removeAllButFirstInstanceOfPeriod(amount);

		if (this.state.displayInCrypto) {
			satoshiAmount = bitcoinUnits(Number(amount), cryptoUnit).to("satoshi").value();
			fiatAmount = this.cryptoToFiat({ amount: satoshiAmount });
		} else {
			//Don't convert the fiatAmount just assign it to the user's input and pass it on
			fiatAmount = parseFiat(amount);
			satoshiAmount = this.fiatToCrypto({ amount: Number(amount) });
		}

		const fee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
		const totalFee = this.getTotalFee(fee);
		const walletBalance = Number(this.state.cryptoBalance);

		if (!this.state.spendMaxAmount) {
			if (Number(totalFee) + Number(satoshiAmount) <= Number(walletBalance)) {
				const index = nthIndex(amount.toString(), ".", 1);
				const amountSubstring = amount.toString().substr(index, amount.toString().length);
				if (amountSubstring.length >=10) return;

				//Pass the amount straight through if the display is set to crypto. Otherwise, make sure to convert via the satoshi amount.
				let cryptoUnitAmount = 0;
				if (this.state.displayInCrypto) {
					cryptoUnitAmount = amount.toString();
				} else {
					cryptoUnitAmount = bitcoinUnits(Number(satoshiAmount), "satoshi").to(cryptoUnit).value();
				}
				if (this.state.cryptoUnitAmount !== cryptoUnitAmount.toString()) this.setState({ cryptoUnitAmount: cryptoUnitAmount.toString() });
				this.props.updateTransaction({ amount: satoshiAmount, fiatAmount });
			}
		}
	};

	getSendButtonFiatLabel = () => {
		try {
			return this.props.transaction.fiatAmount;
		} catch (e) {
			return 0;
		}
	};

	getSendButtonCryptoLabel = () => {
		try {
			const { cryptoUnit } = this.props.settings;
			const { selectedCrypto } = this.props.wallet;
			const cryptoAcronym = getCoinData({selectedCrypto, cryptoUnit}).acronym;
			//const cryptoUnitLabel = cryptoUnit === "satoshi" ? "sats" : cryptoUnit;
			let cryptoValue = Number(this.props.transaction.amount);
			//This prevents the view from displaying 0 BTC
			if (cryptoValue < 50000 && cryptoUnit === "BTC") {
				return`${Number((cryptoValue * 0.00000001).toFixed(8))} ${cryptoAcronym} `;
			} else {
				return `${bitcoinUnits(cryptoValue, "satoshi").to(cryptoUnit).value()} ${cryptoAcronym}`;
			}
		} catch (e) {}
	};

	getClipboardContent = async () => {
		//Grab clipboard content.
		const clipboardContent = await Clipboard.getString();
		//Check if clipboard content exists.
		if (!clipboardContent) {
			alert("It appears your clipboard is empty. Please attempt to copy the address again.");
			return;
		}
		//Validate Clipboard content.
		if (!validateAddress(clipboardContent).isValid) {
			alert(`Invalid Address. Please attempt to copy the address again.`);
			return;
		}


		//Update address field with clipboard content.
		await this.props.updateTransaction({ address: clipboardContent });
		return clipboardContent;
	};

	calculateFees = async () => {
		try {
			const start = this.props.transaction.feeTimestamp;
			const end = moment();
			const difference = getDifferenceBetweenDates({ start, end });
			if (!this.props.transaction.feeTimestamp || difference > 10) {
				const { selectedWallet, selectedCrypto } = this.props.wallet;
				const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
				const transactionSize = getTransactionSize(utxos.length, this.state.spendMaxAmount ? 1 : 2);
				const result = await this.props.getRecommendedFee({coin: selectedCrypto, transactionSize});
				
				//Ensure we have a valid recommendedFee
				if (result.data.recommendedFee && !isNaN(Number(result.data.recommendedFee))) {
					this.props.updateTransaction({ fee: Number(result.data.recommendedFee), transactionSize });
				} else {
					this.props.updateTransaction({ maximumFee: 128, fee: 6, transactionSize });
				}
			}
		} catch (e) {
			console.log(e);
		}
	};

	copyRawTx = (rawTx = "") => {
		let duration = 1500;
		try {
			Clipboard.setString(rawTx);
			Animated.timing(
				this.state.rawTxCopiedOpacity,
				{
					toValue: 1,
					duration: 500,
					useNativeDriver: true
				}
			).start(async () => {
				setTimeout(() => {
					Animated.timing(
						this.state.rawTxCopiedOpacity,
						{
							toValue: 0,
							duration,
							useNativeDriver: true
						}
					).start();
				}, duration/4);
			});
		} catch (e) {
			console.log(e);
			alert("Unable to copy rawTx. Please try again or check your phone's permissions.");
		}
	};

	validateTransaction = async () => {
		if (!this.props.transaction.address || !this.props.transaction.amount) {
			alert("Please make sure you've added both an address and an amount to send.");
			return;
		}
		
		//Ensure the user has enough funds.
		const fee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
		const amount = Number(this.props.transaction.amount);
		const { selectedWallet, selectedCrypto } = this.props.wallet;
		const balance = this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto];
		const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
		const transactionSize = getTransactionSize(utxos.length, this.state.spendMaxAmount ? 1 : 2);
		const totalTransactionCost = amount+(fee*transactionSize);
		if (totalTransactionCost > balance) {
			alert(`It appears that\nyou do not have enough funds\nto cover the transaction.`);
			return;
		}
		
		const address = this.props.transaction.address;
		//Validate Address.
		if (!validateAddress(address, selectedCrypto).isValid) {
			alert(`It appears that \n "${address}" \n is not a valid ${capitalize(selectedCrypto)} address. Please attempt to re-enter the address.`);
			return;
		}

		//Ensure that the address they are trying to send to is not our own.
		const addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto].map(addr => (addr.address));
		const changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto].map(addr => (addr.address));
		if ( addresses.includes(address) || changeAddresses.includes(address)) {
			alert(`It appears that you are attempting to send to your own address:\n\n"${address}"\n\nPlease enter an address that is unaffiliated with this wallet and try again.`);
			return;
		}

		this.updateConfirmationModal({ display: true });
	};

	createTransaction = async () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const address = this.props.transaction.address;
			//Validate Address.
			if (!validateAddress(address, selectedCrypto).isValid) {
				alert(`It appears that \n "${address}" \n is not a valid ${capitalize(selectedCrypto)} address. Please attempt to re-enter the address.`);
				return;
			}
			const wallet = this.props.wallet.wallets[selectedWallet];
			const utxos = wallet.utxos[selectedCrypto] || [];
			const blacklistedUtxos = wallet.blacklistedUtxos[selectedCrypto];
			const confirmedBalance = wallet.confirmedBalance[selectedCrypto];
			const changeAddressIndex = wallet.changeAddressIndex[selectedCrypto];
			const transactionFee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
			const amount = Number(this.props.transaction.amount);
			const message = this.props.transaction.message;
			const addressType = wallet.addressType[selectedCrypto];
			const setRbf = this.props.settings.rbf && supportsRbf[selectedCrypto];
			
			let changeAddress = "";
			//Create More Change Addresses as needed
			//Only add a changeAddress if the user is not spending the max amount.
			if (!this.state.spendMaxAmount) {
				const changeAddresses = wallet.changeAddresses[selectedCrypto];
				if (changeAddresses.length-1 < changeAddressIndex) {
					//Generate receiving and change addresses.
					const newChangeAddress = await generateAddresses({
						addressAmount: 0,
						changeAddressAmount: 1,
						changeAddressIndex: changeAddresses.length,
						selectedCrypto,
						wallet: selectedWallet
					});
					changeAddress = newChangeAddress.data.changeAddresses[0].address;
				} else {
					changeAddress = wallet.changeAddresses[selectedCrypto][changeAddressIndex].address;
				}
			}

			return await createTransaction({ address, transactionFee, amount, confirmedBalance, utxos, blacklistedUtxos, changeAddress, wallet: selectedWallet, selectedCrypto, message, addressType, setRbf });
		} catch (e) {
			console.log(e);
		}
	};

	sendTransaction = async () => {
		try {
			const currentTransactionDetails = this.props.transaction;
			this.updateXButton({ display: false });
			await Promise.all(
				this.updateLoading({ display: true , loadingMessage: "Creating Transaction...", loadingProgress: 0})
			);
			await this.setState({loadingMessage: "Creating Transaction...", loadingProgress: 0.4});
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const wallet = this.props.wallet.wallets[selectedWallet];
			const addresses = wallet.addresses[selectedCrypto];
			const changeAddresses = wallet.changeAddresses[selectedCrypto];
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			let currentUtxos = [];
			try {
				currentUtxos = wallet.utxos[selectedCrypto] || [];
			} catch (e) {
			}
			await pauseExecution();
			const transaction = await this.createTransaction();
			await this.setState({ loadingMessage: "Sending Transaction...", loadingProgress: 0.8 });
			await pauseExecution();
			let sendTransactionResult = await this.props.sendTransaction({ txHex: transaction.data, selectedCrypto, sendTransactionFallback: this.props.settings.sendTransactionFallback });
			
			if (sendTransactionResult.error) {
				await this.setState({
					loadingMessage: "There appears to have been an error sending your transaction. Please try again.",
					loadingProgress: 0,
					enableLoadingSpinner: false,
					enableLoadingErrorIcon: true
				});
				await this.updateXButton({ display: true });
			} else {
				//Success! The transaction completed successfully
				try {
					//Attempt to add the successful transaction to the transaction list
					const { address, amount, transactionSize } = currentTransactionDetails;
					const fee = currentTransactionDetails.fee || currentTransactionDetails.recommendedFee;
					const confirmedBalance = this.props.wallet[selectedWallet].confirmedBalance[selectedCrypto];
					const totalFee = Number(fee)*Number(transactionSize);
					const sentAmount = Number(amount) + totalFee;
					const receivedAmount = confirmedBalance - sentAmount;
					const successfulTransaction = [{
						address,
						amount: Number(amount),
						block: 0,
						data: "",
						fee: totalFee,
						hash: sendTransactionResult.data,
						inputAmount: confirmedBalance,
						messages: [],
						outputAmount: confirmedBalance - totalFee,
						receivedAmount,
						sentAmount, //amount + totalFee
						timestamp: moment().unix(),
						type: "sent"
					}];
					
					const transactionData = { wallet: selectedWallet, selectedCrypto, transaction: successfulTransaction };
					
					//Add txHash to rbfData
					let rbfData = undefined;
					//Ensure RBF is enabled in Settings and that the selected coin is not Litecoin.
					if (this.props.settings.rbf && supportsRbf[selectedCrypto]) {
						rbfData = transaction.rbfData;
						rbfData["hash"] = sendTransactionResult.data;
						transactionData["rbfData"] = rbfData;
					}
					//Add Transaction to transaction stack
					await this.props.addTransaction(transactionData);
					
					//Temporarily update the balance for the user to prevent a delay while electrum syncs the balance from the new transaction
					try {
						const newBalance = Number(wallet.confirmedBalance[selectedCrypto]) - sentAmount;
						await this.props.updateWallet({
							wallets: {
								...this.props.wallet.wallets,
								[selectedWallet]: {
									...this.props.wallet.wallets[selectedWallet],
									confirmedBalance: {
										...this.props.wallet.wallets[selectedWallet].confirmedBalance,
										[selectedCrypto]: newBalance
									}
								}
							}
						});
					} catch (e) {}

				} catch (e) {}

				this.setState({
					loadingMessage: "Success! \n Your transaction has been sent.",
					loadingProgress: 1,
					enableLoadingSpinner: false,
					enableLoadingErrorIcon: false,
					enableLoadingSuccessIcon: true
				});
				this.props.resetUtxos({ addresses, changeAddresses, currentBlockHeight, selectedCrypto, selectedWallet, currentUtxos });
				await pauseExecution(1500);
				//Fade out the loading view
				Animated.timing(
					this.state.loadingOpacity,
					{
						toValue: 0,
						duration: 400,
						useNativeDriver: true
					}
				).start(async () => {
					//Close component after opacity fade-out
					await this.props.onClose();
					await pauseExecution(1000);
					this.props.refreshWallet({ ignoreLoading: true });
				});
			}
		} catch (e) {
			console.log(e);
		}
	};

	onDisplayInCryptoToggle = () => {
		try {
			//If toggling to fiat make sure to properly parse/set the fiat amount.
			if (this.state.displayInCrypto) {
				let fiatAmount = formatNumber(this.props.transaction.fiatAmount).toString();
				if (fiatAmount === "0") fiatAmount = "";
				this.props.updateTransaction({ fiatAmount });
			}

			if (!this.state.displayInCrypto) {
				let satoshiAmount = this.props.transaction.amount.toString();
				if (satoshiAmount === "0") satoshiAmount = "";
				this.props.updateTransaction({ satoshiAmount });
			}

			//Toggle between crypto/fiat.
			this.setState({ displayInCrypto: !this.state.displayInCrypto });
		} catch (e) {
			console.log(e);
		}
	};

	onXButtonPress = async() => {
		try {
			if (this.state.displayLoading) {
				await this.setState({
					loadingMessage: "",
					loadingProgress: 0,
					enableLoadingSpinner: true,
					enableLoadingErrorIcon: false
				});
				await this.updateLoading({ display: false });
			} else {
				this.updateConfirmationModal({ display: false });
			}
		} catch (e) {}
	};

	satsToUnit = (cryptoValue = 0) => {
		try {
			const { cryptoUnit } = this.props.settings;
			cryptoValue = Number(cryptoValue);
			//This prevents the view from displaying 0 BTC
			if (cryptoValue < 50000 && cryptoUnit === "BTC") {
				return (Number(cryptoValue * 0.00000001).toFixed(8));
			} else {
				return bitcoinUnits(cryptoValue, "satoshi").to(cryptoUnit).value();
			}
		} catch (e) {}
	};
	
	shouldComponentUpdate(nextProps, nextState) {
		try {
			if (
				nextProps.transaction !== this.props.transaction ||
				nextState !== this.state
			) {
				return true;
			}
			return false;
		} catch (e) {return false;}
	}

	render() {
		const { selectedCrypto, selectedWallet } = this.props.wallet;
		const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
		const { crypto: cryptoFeeLabel, fiat: fiatFeeLabel } = this.getFeesToDisplay(exchangeRate);

		return (
			<View style={styles.container}>
				<View style={{ flex: 1 }}>
					<Header
						fontSize={45}
						activeOpacity={1}
						onSelectCoinPress={Keyboard.dismiss}
						fiatValue={this.state.fiatBalance || this.getFiatBalance()}
						fiatSymbol={this.props.settings.fiatSymbol}
						cryptoValue={this.state.cryptoBalance || this.getCryptoBalance()}
						cryptoUnit={this.props.settings.cryptoUnit}
						selectedCrypto={this.props.wallet.selectedCrypto}
						selectedCryptoStyle={{ fontSize: 30, marginTop: 10 }}
						selectedWallet={`Wallet ${Object.keys(this.props.wallet.wallets).indexOf(selectedWallet)}`}
						exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]}
						isOnline={this.props.user.isOnline}
						displayWalletName={true}
					/>

					<View style={styles.row}>
						<View style={{ flex: 1, justifyContent: "flex-end", alignItems: "flex-start" }}>
							<Text style={styles.text}>Address</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							style={styles.textInput}
							autoCapitalize="none"
							selectionColor={colors.lightPurple}
							onChangeText={(address) => this.props.updateTransaction({ address })}
							value={this.props.transaction.address}
						>
						</TextInput>
						<TouchableOpacity style={styles.leftIconContainer} onPress={this.getClipboardContent}>
							<FeatherIcon style={styles.featherIcon} name={"clipboard"} size={25} color={colors.purple} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.rightIconContainer, { backgroundColor: colors.white }]} onPress={this.state.onCameraPress}>
							<EvilIcon style={styles.cameraIcon} name={"camera"} size={40} color={colors.purple} />
						</TouchableOpacity>
					</View>

					<View style={styles.row}>
						<View style={{ flex: 1, justifyContent: "flex-end", alignItems: "flex-start" }}>
							<Text style={styles.text}>Amount</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							style={[styles.textInput, { backgroundColor: this.state.spendMaxAmount ? colors.gray : colors.white }]}
							selectionColor={colors.lightPurple}
							onChangeText={(amount) => this.updateAmount(amount)}
							value={this.getTextInputAmount()}
							editable={!this.state.spendMaxAmount}
							keyboardType="decimal-pad"
							placeholder="0"
						/>
						<TouchableOpacity style={styles.leftIconContainer} onPress={this.onDisplayInCryptoToggle}>
							<View style={{ flexDirection: "row" }}>
								<View style={styles.rotatedIcon}>
									<FontAwesome name={"exchange"} size={15} color={colors.purple} />
								</View>
								<Text style={styles.amountText}>{this.state.displayInCrypto ? `${getCoinData({ selectedCrypto, cryptoUnit: this.props.settings.cryptoUnit }).acronym}` : "USD"}</Text>
							</View>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.rightIconContainer, { backgroundColor: this.state.spendMaxAmount ? "#813fb1" : colors.white }]} onPress={this.onMaxPress}>
							<Text style={[styles.amountText, { color: this.state.spendMaxAmount ? colors.white : colors.purple }]}>Max</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.row}>
						<View style={{ flex: 1, justifyContent: "flex-end", alignItems: "flex-start" }}>
							<Text style={styles.text}>Message (Optional)</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							maxLength={80}
							autoCapitalize="none"
							placeholder="Anything entered here will be public"
							style={[styles.textInput, { borderRadius: 5 }]}
							selectionColor={colors.lightPurple}
							onChangeText={(message) => this.props.updateTransaction({ message })}
							value={this.props.transaction.message}
						>
						</TextInput>
					</View>

					<View style={[styles.row, { marginTop: 20, marginBottom: 1 }]}>
						<View style={{ flex: 1.2 }}>
							<Text style={styles.text}>Fee: {this.props.transaction.fee || this.props.transaction.recommendedFee}sat/B </Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.text, { textAlign: "center" }]}>${fiatFeeLabel}</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.text, { textAlign: "center" }]}>{cryptoFeeLabel} sats</Text>
						</View>
					</View>
					<View style={styles.sliderRow}>
						<Slider
							style={styles.slider}
							onValueChange={(fee) => this.updateFee(parseInt(fee))}
							thumbTintColor={colors.white}
							minimumTrackTintColor={colors.lightPurple}
							maximumValue={this.props.transaction.maximumFee}
							minimumValue={1}
							value={Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee)}
						/>
					</View>
				</View>

				<View style={{ flex: Platform.OS === "ios" ? 0.45 : 0.45, justifyContent: "flex-start" }}>
					<View style={styles.buttonContainer}>
						<Button title="Send" text={`~$${this.getSendButtonFiatLabel()}`} text2={this.getSendButtonCryptoLabel()} textStyle={{ paddingTop: 5, ...systemWeights.light, }} onPress={this.validateTransaction} />
					</View>
				</View>

				<Modal
					backdropColor={colors.purple}
					deviceHeight={height*-1}
					deviceWidth={width*-1}
					style={{ flex: 1 }}
					isVisible={this.state.displayConfirmationModal}
				>
					<View style={{ flex: 1, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple }}>

						<View style={{ paddingVertical: 20, width: "80%", height: "70%", paddingHorizontal: 10, backgroundColor: colors.white, borderRadius: 20, justifyContent: "center", top: -50 }}>
							<View style={{ flex: 1 }}>
								<View style={{ justifyContent: "flex-start", alignItems: "center", marginBottom: 20 }}>
									<Text style={[styles.boldPurpleText, { fontSize: 24 }]}>Is This Correct?</Text>
								</View>
								<View style={{ flex: 0.4, justifyContent: "space-evenly" }}>
									<Text style={styles.boldPurpleText}>Send To:</Text>
									<Text style={styles.purpleText}>{this.props.transaction.address}</Text>
									<View style={{ marginVertical: 5 }} />
									<Text style={styles.boldPurpleText}>Amount:</Text>
									<Text style={styles.purpleText}>{this.satsToUnit(this.props.transaction.amount)} {getCoinData({ selectedCrypto, cryptoUnit: this.props.settings.cryptoUnit }).acronym}</Text>
									<Text style={styles.purpleText}>${parseFloat(this.props.transaction.fiatAmount).toFixed(2)}</Text>
									<View style={{ marginVertical: 5 }} />
									<Text style={styles.boldPurpleText}>Fee:</Text>
									<Text style={styles.purpleText}>{this.satsToUnit(cryptoFeeLabel)} {getCoinData({ selectedCrypto, cryptoUnit: this.props.settings.cryptoUnit }).acronym}</Text>
									<Text style={styles.purpleText}>${fiatFeeLabel}</Text>
								</View>
								<View style={{ flex: 0.4, alignItems: "center", justifyContent: "center", marginVertical: 10 }}>

									<Text style={[styles.boldPurpleText, { fontSize: 24 }]}>Total:</Text>
									<Text style={[styles.purpleText, { fontSize: 20 }]}>{this.satsToUnit(Number(this.props.transaction.amount) + Number(cryptoFeeLabel))} {getCoinData({ selectedCrypto, cryptoUnit: this.props.settings.cryptoUnit }).acronym}</Text>
									<Text style={[styles.purpleText, { fontSize: 20 }]}>${(Number(this.props.transaction.fiatAmount) + Number(fiatFeeLabel)).toFixed(2)}</Text>

									<Animated.View style={[styles.copiedContainer, { opacity: this.state.rawTxCopiedOpacity }]}>
										<View style={styles.copied}>
											<Text style={styles.copiedText}>RawTx Copied!</Text>
											<Text style={[styles.purpleText, { fontSize: 14, marginTop: 5 }]}>
												{this.state.rawTx}
											</Text>
										</View>
									</Animated.View>

								</View>
								<View style={{ flex: 0.2, justifyContent: "flex-end" }}>
									<View style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" }}>
										<View>
											<Button
												title="Copy TxHex"
												loading={this.state.generatingTxHex}
												onPress={async () => {
													this.setState({ generatingTxHex: true });
													let rawTx = await this.createTransaction();
													if (rawTx.error === true) {
														await this.setState({ generatingTxHex: false });
														alert(JSON.stringify(rawTx));
														return;
													}
													rawTx = rawTx.data;
													await this.setState({ generatingTxHex: false });
													this.copyRawTx(rawTx);
													if (this.state.rawTx !== rawTx) this.setState({ rawTx });
												}}
											/>
										</View>
										<View>
											<Button title="Send" onPress={this.sendTransaction} />
										</View>
									</View>
								</View>
							</View>
						</View>
						{this.state.displayLoading &&
						<Loading
							loadingOpacity={this.state.loadingOpacity}
							loadingMessage={this.state.loadingMessage}
							loadingProgress={this.state.loadingProgress}
							enableSpinner={this.state.enableLoadingSpinner}
							enableProgressBar={this.state.enableLoadingProgressBar}
							enableSuccessIcon={this.state.enableLoadingSuccessIcon}
							enableErrorIcon={this.state.enableLoadingErrorIcon}
							width={width/2}
							style={{ backgroundColor: colors.purple, bottom: 0 }}
							animationName="loader"
						/>}
						{this.state.displayXButton &&
						<Animated.View style={styles.xButton}>
							<XButton onPress={this.onXButtonPress} />
						</Animated.View>}
					</View>
				</Modal>

			</View>
		);
	}
}

SendTransaction.defaultProps = {
	onCameraPress: () => null,
	refreshWallet: () => null,
	onClose: () => null
};

SendTransaction.propTypes = {
	onCameraPress: PropTypes.func.isRequired,
	refreshWallet: PropTypes.func.isRequired, // ({ ignoreLoading: bool })
	onClose: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: Platform.OS === "ios" ? 60 : 30,
		zIndex: 200
	},
	copiedContainer: {
		flex: 1,
		backgroundColor: colors.white,
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		right: 0
	},
	copied: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center"
	},
	copiedText: {
		...systemWeights.bold,
		color: colors.purple,
		fontSize: 16,
		textAlign: "center"
	},
	text: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 18,
		textAlign: "left",
		marginLeft: 5
	},
	textInputRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center"
	},
	textInput: {
		flex: 1,
		height: 30,
		borderTopLeftRadius: 5,
		borderBottomLeftRadius: 5,
		paddingLeft: 5,
		backgroundColor: colors.white,
		paddingTop: 0,
		paddingBottom: 0,
		color: colors.purple,
		fontWeight: "bold"
	},
	cameraIcon: {
		alignItems: "flex-end"
	},
	rotatedIcon: {
		transform: [{ rotate: "90deg"}],
		marginRight: 3
	},
	boldPurpleText: {
		...systemWeights.bold,
		color: colors.purple,
		fontSize: 16
	},
	purpleText: {
		...systemWeights.light,
		color: colors.purple,
		fontSize: 16
	},
	amountText: {
		textAlign: "right",
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 16
	},
	leftIconContainer: {
		height: 30,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
		borderWidth: 1,
		borderColor: colors.white,
		backgroundColor: colors.white
	},
	rightIconContainer: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: colors.white,
		paddingHorizontal: 5,
		borderTopRightRadius: 5,
		borderBottomRightRadius: 5,
		borderLeftColor: colors.purple,
		height: 30
	},
	sliderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center"
	},
	slider: {
		flex: 1,
		height: 30
	},
	featherIcon: {
		alignItems: "flex-end"
	},
	row: {
		flexDirection: "row",
		marginTop: 10
	},
	buttonContainer: {
		alignItems: "center",
		justifyContent: "center"
	}
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("../actions/user");
const walletActions = require("../actions/wallet");
const transactionActions = require("../actions/transaction");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...userActions,
		...walletActions,
		...transactionActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(SendTransaction);
