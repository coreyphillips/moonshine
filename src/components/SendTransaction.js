import React, { Component } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	Animated,
	LayoutAnimation,
	Dimensions,
	Platform,
	InteractionManager,
	Keyboard,
	Easing,
	BackHandler
} from "react-native";
import PropTypes from "prop-types";
import Slider from "@react-native-community/slider";
import { systemWeights } from "react-native-typography";
import Modal from "react-native-modal";
import Clipboard from "@react-native-community/clipboard";

import Header from "./Header";
import Button from "./Button";
import Loading from "./Loading";
import bitcoinUnits from "bitcoin-units";
import DefaultModal from './DefaultModal';
import CoinControl from "./CoinControl";
import XButton from "./XButton";
import {
	View,
	Text,
	TextInput,
	FontAwesome,
	FontAwesome5,
	EvilIcon,
	LinearGradient
} from "../styles/components";
import {themes} from "../styles/themes";
import { MaterialCommunityIcons } from "../styles/components";
import FeeEstimate from "./FeeEstimate";

const {
	Constants: {
		colors,
		currencies
	}
} = require("../../ProjectData.json");

const {
	getDifferenceBetweenDates,
	createTransaction,
	getByteCount,
	validateAddress,
	parseFiat,
	capitalize,
	generateAddresses,
	pauseExecution,
	nthIndex,
	removeAllButFirstInstanceOfPeriod,
	formatNumber,
	getFiatBalance,
	fiatToCrypto,
	cryptoToFiat
} = require("../utils/helpers");

const {
	getCoinData,
	supportsRbf
} = require("../utils/networks");

const moment = require("moment");
const { width, height } = Dimensions.get("window");
const MAX_MESSAGE_LENGTH = 80;

class SendTransaction extends Component {
	constructor(props) {
		super(props);
		this.state = {
			displayXButton: false,
			xButtonOpacity: new Animated.Value(1),

			displayCamera: false,
			cameraOpacity: new Animated.Value(0),

			displayConfirmationModal: false,
			confirmationModalOpacity: new Animated.Value(0),

			displayCoinControlModal: false,
			displayCoinControlButton: false,

			displayFeeEstimateModal: false,

			whiteListedUtxos: [], //UTXOS the user has chosen to use for this transaction via the coin control modal.
			whiteListedUtxosBalance: 0,

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
			const utxoLength = this.getUtxoLength();
			//Determine if any utxos exist for the given coin and wallet to display and enable the coin control feature.
			const displayCoinControlButton = utxoLength > 0;
			this.setState({cryptoBalance, fiatBalance, displayCoinControlButton});

			//Set the transactionSize to accurately determine the transaction fee
			const transactionSize = this.getTransactionByteCount();
			this.props.updateTransaction({ transactionSize });

			//Set Maximum Fee (recommendedFee * 4) to prevent any user accidents.
			//Set Recommended Fee as Starting Fee
			this.calculateFees();

			try {
				//If a transaction amount is already specified check that the user has enough funds and update the local amount accordingly.
				if (this.props.transaction.amount) {
					if (this.hasEnoughFunds()) {
						this.updateAmount(this.props.transaction.amount);
					} else {
						alert(`It appears that\nyou do not have enough funds\nto cover the requested transaction.`);
					}
				}
			} catch (e) {}
		};

		if (Platform.OS === "ios") {
			try {setupSendTransaction();} catch (e) {}
		} else {
			InteractionManager.runAfterInteractions(() => {
				try {setupSendTransaction();} catch (e) {}
			});
		}
		if (Platform.OS === "android") BackHandler.addEventListener("hardwareBackPress", this.onBack);
	}

	componentDidUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}

	componentWillUnmount() {
		InteractionManager.runAfterInteractions(() => {
			try {this.props.resetTransaction();} catch (e) {}
			if (Platform.OS === "android") BackHandler.removeEventListener("hardwareBackPress", this.onBack);
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
						easing: Easing.inOut(Easing.ease),
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
			if (exchangeRate === 0 || !this.state.cryptoBalance) return { crypto, fiat };

			//Calculate crypto & fiat fees.
			const fee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
			crypto = this.getTotalFee(fee);
			fiat = cryptoToFiat({ amount: crypto, exchangeRate });

			//Return 0 if isNaN is returned.
			if (isNaN(crypto)) crypto = 0;
			if (isNaN(fiat)) fiat = 0;

			return { crypto, fiat };
		} catch (e) {
			console.log(e);
		}
	};

	getUtxoLength = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
			return this.state.whiteListedUtxos.length ? this.state.whiteListedUtxos.length : utxos.length;
		} catch (e) {return 1;}
	};

	getFiatBalance = () => {
		try {
			const { selectedCrypto } = this.props.wallet;
			const balance = this.getCryptoBalance();
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			return getFiatBalance({ balance, exchangeRate });
		} catch (e) {
			return 0;
		}
	};

	getCryptoBalance = () => {
		//Get confirmed balance
		let confirmedBalance = 0;
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const wallet = this.props.wallet.wallets[selectedWallet];
			if (this.state.whiteListedUtxos.length) {
				let balance = 0;
				wallet.utxos[selectedCrypto].forEach((utxo) => {
					if (this.state.whiteListedUtxos.includes(utxo["tx_hash"])) balance = balance+utxo.value;
				});
				return Number(balance);
			} else {
				return Number(wallet.confirmedBalance[selectedCrypto]) || 0;
			}
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

	getTransactionByteCount = () => {
		try {
			let transactionByteCount = 0;
			try {
				const { selectedCrypto, selectedWallet } = this.props.wallet;
				let addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
				transactionByteCount = getByteCount(
					{[addressType]:this.getUtxoLength()},
					{[addressType]:this.state.spendMaxAmount ? 1 : 2},
					this.props.transaction.message
				);
			} catch (e) {}
			return transactionByteCount;
		} catch (e) {
			return 256;
		}
	};

	onMaxPress = async () => {
		try {

			//"spendMaxAmount" will not send funds back to a changeAddress and thus have one less output so we need to update the transactionSize accordingly.
			const recommendedFee = this.props.transaction.fee || this.props.transaction.recommendedFee;
			const walletBalance = this.state.cryptoBalance;
			if (!walletBalance) return; //No need to continue if there's no balance
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			const transactionSize = getByteCount(
				{[addressType]:this.getUtxoLength()},
				{[addressType]:!this.state.spendMaxAmount ? 1 : 2},
				this.props.transaction.message
			);

			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			let totalFee = this.getTotalFee(recommendedFee, transactionSize);
			let cryptoUnitAmount = 0;

			if (walletBalance > totalFee) {
				const amount = walletBalance - totalFee;
				const fiatAmount = cryptoToFiat({ amount, exchangeRate });
				cryptoUnitAmount = bitcoinUnits(amount, "satoshi").to(this.props.settings.cryptoUnit).value();
				this.props.updateTransaction({ amount, fiatAmount, transactionSize });
			} else {
				const difference = totalFee - walletBalance;
				totalFee = difference / 2;
				const fiatAmount = cryptoToFiat({ amount: totalFee, exchangeRate });
				cryptoUnitAmount = bitcoinUnits(totalFee, "satoshi").to(this.props.settings.cryptoUnit).value();
				this.props.updateTransaction({ fee: parseInt(recommendedFee/2), amount: totalFee, fiatAmount, transactionSize });
			}

			if (this.state.cryptoUnitAmount !== cryptoUnitAmount) this.setState({ cryptoUnitAmount });

			await this.setState({ spendMaxAmount: !this.state.spendMaxAmount });
		} catch (e) {
			console.log(e);
		}
	};

	updateFee = (fee = 0) => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			const transactionSize = this.getTransactionByteCount();
			let totalFee = this.getTotalFee(fee, transactionSize);
			totalFee = Number(totalFee);
			let amount = Number(this.props.transaction.amount);
			let walletBalance = Number(this.state.cryptoBalance);

			if (this.state.spendMaxAmount) {
				//Not enough funds to support this fee.
				if (totalFee >= walletBalance) return;
				const amount = walletBalance - totalFee;
				const fiatAmount = cryptoToFiat({ amount, exchangeRate });
				const cryptoUnitAmount = bitcoinUnits(amount, "satoshi").to(this.props.settings.cryptoUnit).value();
				this.setState({ cryptoUnitAmount });
				this.props.updateTransaction({ fee: Number(fee), amount, fiatAmount, transactionSize });
			} else {
				if (totalFee + amount > walletBalance) return;
				this.props.updateTransaction({ fee: Number(fee), transactionSize });
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
		const selectedCrypto = this.props.wallet.selectedCrypto;
		const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
		const cryptoUnit = this.props.settings.cryptoUnit;
		let fiatAmount = "";
		let satoshiAmount = "";

		try {
			//This attempts to account for device language preferences that replace a period with a comma.
			//This addresses #47: https://github.com/coreyphillips/moonshine/issues/47
			if (amount.charAt(amount.length - 1) === ",") amount = amount.replace(/.$/,".");
		} catch {}
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
			fiatAmount = cryptoToFiat({ amount: satoshiAmount, exchangeRate });
		} else {
			//Don't convert the fiatAmount just assign it to the user's input and pass it on
			fiatAmount = parseFiat(amount);
			satoshiAmount = fiatToCrypto({ amount: Number(amount), exchangeRate });
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
			const cryptoAcronym = this.coinData().acronym;
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
				const { selectedCrypto } = this.props.wallet;
				const transactionSize = this.getTransactionByteCount();
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
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true
				}
			).start(async () => {
				setTimeout(() => {
					Animated.timing(
						this.state.rawTxCopiedOpacity,
						{
							toValue: 0,
							duration,
							easing: Easing.inOut(Easing.ease),
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
		const transactionSize = this.getTransactionByteCount();
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
		/*const addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto].map(addr => (addr.address));
		const changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto].map(addr => (addr.address));
		if ( addresses.includes(address) || changeAddresses.includes(address)) {
			alert(`It appears that you are attempting to send to your own address:\n\n"${address}"\n\nPlease enter an address that is unaffiliated with this wallet and try again.`);
			return;
		}*/

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
			let utxos = wallet.utxos[selectedCrypto] || [];
			let blacklistedUtxos = wallet.blacklistedUtxos[selectedCrypto];
			let confirmedBalance = wallet.confirmedBalance[selectedCrypto];
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

			//Coin Control: Temporarily add non-whitelisted utxo hashes to blacklistedUtxos for this transaction.
			if (this.state.whiteListedUtxos.length) {
				const tempBlacklistedUtxos = [];
				const tempUtxos = [];
				confirmedBalance = this.state.whiteListedUtxosBalance;
				await Promise.all(
					utxos.map((utxo) => {
						try {
							if (!this.state.whiteListedUtxos.includes(utxo["tx_hash"])) {
								tempBlacklistedUtxos.push(utxo["tx_hash"]);
							} else {
								tempUtxos.push(utxo);
							}
						} catch (e) {console.log(e);}
					}
				));
				if (tempUtxos.length) utxos = tempUtxos;
				if (tempBlacklistedUtxos.length) blacklistedUtxos = blacklistedUtxos.concat(tempBlacklistedUtxos);
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
			try {currentUtxos = wallet.utxos[selectedCrypto] || [];} catch (e) {}
			//await pauseExecution();
			const transaction = await this.createTransaction();
			await this.setState({ loadingMessage: "Sending Transaction...", loadingProgress: 0.8 });
			let messages = [];
			try {if (this.props.transaction.message) messages.push(this.props.transaction.message);} catch {}
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
					const confirmedBalance = this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto];
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
						messages,
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
				//Close component
				setTimeout(() => this.props.onClose(), 100);
				//Fade out the loading view as the component closes
				Animated.timing(
					this.state.loadingOpacity,
					{
						toValue: 0,
						duration: 400,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true
					}
				).start(async () => {
					//Close confirmation modal
					this.updateConfirmationModal({ display: false });
					await pauseExecution(1000);
					/*
					 Since we have a listener setup for our change address
					 we only need to prompt a refresh when sending the max amount.
					 */
					if (this.state.spendMaxAmount) this.props.refreshWallet({ ignoreLoading: true, reconnectToElectrum: false });
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

	onBack = async() => {
		try {
			if (this.state.displayFeeEstimateModal) {
				this.toggleFeeEstimateModal();
				return;
			}
			if (this.state.displayCoinControlModal) {
				this.toggleCoinControlModal();
				return;
			}
			if (this.state.displayLoading) {
				await this.setState({
					loadingMessage: "",
					loadingProgress: 0,
					enableLoadingSpinner: true,
					enableLoadingErrorIcon: false
				});
				await this.updateLoading({ display: false });
				return;
			}
			if (this.state.displayConfirmationModal) {
				this.updateConfirmationModal({ display: false });
				return;
			}
			this.props.onClose();
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

	getWalletName = () => {
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			try { if (this.props.wallet.wallets[selectedWallet].name.trim() !== "") return this.props.wallet.wallets[selectedWallet].name; } catch (e) {}
			try { return `Wallet ${this.props.wallet.walletOrder.indexOf(selectedWallet)}`; } catch (e) {}
		} catch (e) {
			return "?";
		}
	};

	toggleFeeEstimateModal = async () => {
		try {
			this.setState({ displayFeeEstimateModal: !this.state.displayFeeEstimateModal });
		} catch (e) {}
	};

	toggleCoinControlModal = async () => {
		try {
			//If the coin control modal is being toggled off.
			if (this.state.displayCoinControlModal) {
				const fee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
				const cryptoUnitAmount = Number(this.state.cryptoUnitAmount); //Amount entered via the "Amount" TextInput
				const whiteListedUtxosBalance = this.state.whiteListedUtxosBalance;
				const spendMaxAmount = this.state.spendMaxAmount; //Determines if the "Max" button is enabled.
				const totalAmount = cryptoUnitAmount+fee; //Total amount the user needs to be able to spend.

				if (cryptoUnitAmount > 0 && whiteListedUtxosBalance > 0) {
					//If the user has previously entered a larger balance than what is now available, toggle the "Max" button on.
					if (totalAmount >= whiteListedUtxosBalance) {
						if (spendMaxAmount) await this.onMaxPress();
						this.onMaxPress();
					}

					//Toggle the "Max" button off if it is enabled and the whitelisted balance is greater than the inputted value.
					//This is to prevent the user from accidentally sending more than they intended.
					if (spendMaxAmount && totalAmount <= whiteListedUtxosBalance) this.onMaxPress();
				}

				//Toggle the "Max" button off if it is enabled and there's no whitelisted balance.
				if (spendMaxAmount && whiteListedUtxosBalance === 0) this.onMaxPress();
			}

			this.setState({ displayCoinControlModal: !this.state.displayCoinControlModal });
		} catch (e) {}
	};

	onUtxoPress = async ({ tx_hash = "", value = 0} = {}) => {
		try {
			if (this.state.whiteListedUtxos.includes(tx_hash)) {
				let whiteListedUtxos = this.state.whiteListedUtxos;
				const index = whiteListedUtxos.indexOf(tx_hash);
				if (index > -1) whiteListedUtxos.splice(index, 1);
				const whiteListedUtxosBalance = Number(this.state.whiteListedUtxosBalance) - Number(value);
				await this.setState({ whiteListedUtxos, whiteListedUtxosBalance });
				this.props.updateTransaction({ transactionSize: this.getTransactionByteCount() });
			} else {
				const whiteListedUtxos = this.state.whiteListedUtxos;
				whiteListedUtxos.push(tx_hash);
				const whiteListedUtxosBalance = Number(this.state.whiteListedUtxosBalance) + Number(value);
				await this.setState({ whiteListedUtxos, whiteListedUtxosBalance });
				this.props.updateTransaction({ transactionSize: this.getTransactionByteCount() });
			}
			//Set user balance information
			const fiatBalance = this.getFiatBalance();
			const cryptoBalance = this.getCryptoBalance();
			this.setState({cryptoBalance, fiatBalance});
		} catch (e) {}
	};

	getTheme = () => {
		try {
			return this.props.settings.darkMode ? themes["dark"] : themes["light"];
		} catch (e) {
			return themes["light"];
		}
	};

	coinData = () => {
		const { selectedCrypto } = this.props.wallet;
		return getCoinData({ selectedCrypto, cryptoUnit: this.props.settings.cryptoUnit });
	};

	getSelectedCurrency = () => {
		try {
			const selectedCurrency = this.props.wallet.selectedCurrency.toLowerCase();
			return currencies[selectedCurrency];
		} catch {return currencies["usd"];}
	}

	shouldComponentUpdate(nextProps, nextState) {
		try {return nextProps.transaction !== this.props.transaction || nextState !== this.state;} catch (e) {return false;}
	}

	render() {
		const { selectedCrypto, selectedWallet } = this.props.wallet;
		const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
		const { crypto: cryptoFeeLabel, fiat: fiatFeeLabel } = this.getFeesToDisplay(exchangeRate);

		return (
			<View style={styles.container}>
				<View style={{ backgroundColor: "transparent" }}>
					<Header
						compress={true}
						fontSize={45}
						activeOpacity={1}
						onSelectCoinPress={Keyboard.dismiss}
						fiatValue={this.state.fiatBalance || this.getFiatBalance()}
						fiatSymbol={this.props.settings.fiatSymbol}
						cryptoValue={this.state.cryptoBalance || this.getCryptoBalance()}
						cryptoUnit={this.props.settings.cryptoUnit}
						selectedCrypto={this.props.wallet.selectedCrypto}
						selectedCryptoStyle={{ fontSize: 30, marginTop: 10 }}
						selectedWallet={`Wallet ${this.props.wallet.walletOrder.indexOf(selectedWallet)}`}
						exchangeRate={this.props.wallet.exchangeRate[this.props.wallet.selectedCrypto]}
						isOnline={this.props.user.isOnline}
						walletName={this.getWalletName()}
					/>

					<View style={styles.row}>
						<View style={styles.addressTitle}>
							<Text style={styles.text}>Address</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							style={styles.textInput}
							autoCapitalize="none"
							autoCompleteType="off"
							autoCorrect={false}
							selectionColor={colors.lightPurple}
							onChangeText={(address) => this.props.updateTransaction({ address })}
							value={this.props.transaction.address}
						>
						</TextInput>
						<TouchableOpacity style={[styles.leftIconContainer, { backgroundColor: this.getTheme().background2 }]} onPress={this.getClipboardContent}>
							<FontAwesome style={styles.clipboardIcon} name={"clipboard"} size={25} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.rightIconContainer, { backgroundColor: this.getTheme().background2 }]} onPress={this.state.onCameraPress}>
							<EvilIcon style={styles.cameraIcon} name={"camera"} size={40} />
						</TouchableOpacity>
					</View>

					<View style={styles.row}>
						<View style={styles.amountContainer}>
							<Text style={styles.text}>Amount</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							style={[styles.textInput, {
								backgroundColor: this.state.spendMaxAmount ? this.getTheme().gray3 : this.getTheme().background2
							}]}
							selectionColor={colors.lightPurple}
							autoCompleteType="off"
							autoCorrect={false}
							onChangeText={(amount) => this.updateAmount(amount)}
							value={this.getTextInputAmount()}
							editable={!this.state.spendMaxAmount}
							keyboardType="decimal-pad"
							placeholder="0"
						/>
						<TouchableOpacity
							style={[styles.leftIconContainer, {
								backgroundColor: this.state.spendMaxAmount ? this.getTheme().gray3 : this.getTheme().background2
							}]}
							onPress={this.onDisplayInCryptoToggle}
						>
							<View type="transparent" style={{ flexDirection: "row" }}>
								<View style={styles.rotatedIcon}>
									<FontAwesome name={"exchange"} size={15} />
								</View>
								<Text style={styles.amountText}>
									{this.state.displayInCrypto ? `${this.coinData().acronym}` : this.getSelectedCurrency().unit}
								</Text>
							</View>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.rightIconContainer, {
								backgroundColor: this.state.spendMaxAmount ? "#813fb1" : this.getTheme().background2
							}]}
							onPress={this.onMaxPress}
						>
							<Text
								style={[styles.amountText, {
									color: this.state.spendMaxAmount ? this.getTheme().white : this.getTheme().text
								}]}
							>
								Max
							</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.row}>
						<View style={styles.messageHeaderContainer}>
							<Text style={styles.text}>Message (Optional)</Text>
						</View>
					</View>

					<View style={styles.textInputRow}>
						<TextInput
							maxLength={MAX_MESSAGE_LENGTH}
							autoCapitalize="none"
							autoCompleteType="off"
							autoCorrect={false}
							placeholder="Anything entered here will be public"
							style={[styles.textInput, { borderRadius: 5 }]}
							selectionColor={colors.lightPurple}
							onChangeText={async (message) => {
								if (message.length <= MAX_MESSAGE_LENGTH) {
									await this.props.updateTransaction({message}); //Set message
									const transactionSize = this.getTransactionByteCount(); //Get new tx size with updated message.
									await this.props.updateTransaction({ transactionSize }); //Set new tx size.
									this.updateFee(this.props.transaction.fee || this.props.transaction.recommendedFee);
								}
							}}
							value={this.props.transaction.message}
						>
						</TextInput>
					</View>

					<View style={[styles.row, { marginTop: 20, marginBottom: 1, justifyContent: "space-between" }]}>
						<View type="transparent" style={{ flexDirection: "row" }}>
							<MaterialCommunityIcons onPress={this.toggleFeeEstimateModal} type="white" name="help-circle-outline" size={20} />
							<Text style={styles.text}>Fee: {!this.state.cryptoBalance ? 0 :this.props.transaction.fee || this.props.transaction.recommendedFee} {this.coinData().oshi}/B </Text>
						</View>
						<View type="transparent">
							<Text style={[styles.text, { textAlign: "center" }]}>{this.props.settings.fiatSymbol}{fiatFeeLabel}</Text>
						</View>
						<View type="transparent">
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
							value={!this.state.cryptoBalance ? 0 : Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee)}
						/>
					</View>

					{this.state.displayCoinControlButton &&
					<TouchableOpacity
						onPress={this.toggleCoinControlModal}
						style={[styles.row, {justifyContent: "center", paddingVertical: 5 }]}
					>
						<FontAwesome5 type="white" name="coins" size={20} />
						<Text style={styles.text}>Coin Control</Text>
						{this.state.whiteListedUtxos.length > 0 &&
						<Text style={styles.text}>{`(${this.state.whiteListedUtxos.length}/${this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto].length})`}</Text>
						}
						{this.state.whiteListedUtxos.length === 0 &&
						<Text style={styles.text}>{`(${this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto].length})`}</Text>
						}
					</TouchableOpacity>}
				</View>

				<View style={styles.sendButtonContainer}>
					<View style={styles.sendButton}>
						<Button
							disabled={!this.state.cryptoBalance}
							title="Send"
							text={`~${this.props.settings.fiatSymbol}${this.getSendButtonFiatLabel() || "0"}`}
							text2={this.getSendButtonCryptoLabel()}
							textStyle={{ paddingTop: 5, ...systemWeights.light, }}
							onPress={this.validateTransaction}
						/>
					</View>
				</View>
				<View style={{ height: "8%", backgroundColor: "transparent" }} />

				<DefaultModal
					type="ScrollView"
					isVisible={this.state.displayFeeEstimateModal}
					onClose={this.onBack}
				>
					<FeeEstimate
						selectedCrypto={selectedCrypto}
						exchangeRate={Number(this.props.wallet.exchangeRate[selectedCrypto])}
						transactionSize={this.props.transaction.transactionSize}
						updateFee={this.updateFee}
						onClose={this.onBack}
						cryptoUnit={this.props.settings.cryptoUnit}
						fiatSymbol={this.props.settings.fiatSymbol}
					/>
				</DefaultModal>

				<DefaultModal
					type="View"
					isVisible={this.state.displayCoinControlModal}
					onClose={this.onBack}
				>
					<CoinControl
						selectedCrypto={selectedCrypto}
						utxos={this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto]}
						cryptoUnit={this.props.settings.cryptoUnit}
						blacklistedUtxos={this.props.wallet.wallets[selectedWallet].blacklistedUtxos[selectedCrypto]}
						whiteListedUtxos={this.state.whiteListedUtxos}
						whiteListedUtxosBalance={this.state.whiteListedUtxosBalance}
						exchangeRate={Number(this.props.wallet.exchangeRate[selectedCrypto])}
						onPress={this.onUtxoPress}
						fiatSymbol={this.props.settings.fiatSymbol}
					/>
				</DefaultModal>

				<Modal
					backdropColor={this.getTheme().PRIMARY}
					deviceHeight={height*-1}
					deviceWidth={width*-1}
					style={{ flex: 1 }}
					isVisible={this.state.displayConfirmationModal}
				>
					<View type="PRIMARY" style={styles.modalContainer}>

						<View style={styles.modalContent}>
							<View style={{ flex: 1 }}>
								<Text style={[styles.boldModalText, { fontSize: 24, textAlign: "center", marginBottom: 20 }]}>
									Is This Correct?
								</Text>
								<View style={styles.modalUpperContent}>
									<View style={{ flex: 1, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}>
										<Text style={[styles.boldModalText, { alignSelf: "center", textAlign: "center" }]}>Send To:</Text>
										<Text style={styles.modalText}>{this.props.transaction.address}</Text>
									</View>
									<View style={{ flex: 1, backgroundColor: "transparent", marginVertical: 5, flexDirection: "row", justifyContent: "center" }}>
										<View style={{ flex: 1, backgroundColor: "transparent", alignItems: "center" }}>
											<Text style={styles.boldModalText}>Amount:</Text>
											<Text style={styles.modalText}>{this.satsToUnit(this.props.transaction.amount)} {this.coinData().acronym}</Text>
											<Text style={styles.modalText}>{this.props.settings.fiatSymbol}{parseFloat(this.props.transaction.fiatAmount).toFixed(2)}</Text>
										</View>
										<View style={{ flex: 1, backgroundColor: "transparent", alignItems: "center" }}>
											<Text style={styles.boldModalText}>Fee:</Text>
											<Text style={styles.modalText}>{this.satsToUnit(cryptoFeeLabel)} {this.coinData().acronym}</Text>
											<Text style={styles.modalText}>{this.props.settings.fiatSymbol}{fiatFeeLabel}</Text>
										</View>
									</View>
								</View>

								<View style={styles.modalMiddleContent}>

									<Text style={[styles.boldModalText, { fontSize: 24 }]}>Total:</Text>
									<Text style={[styles.modalText, { fontSize: 20 }]}>{this.satsToUnit(Number(this.props.transaction.amount) + Number(cryptoFeeLabel))} {this.coinData().acronym}</Text>
									<Text style={[styles.modalText, { fontSize: 20 }]}>{this.props.settings.fiatSymbol}{(Number(this.props.transaction.fiatAmount) + Number(fiatFeeLabel)).toFixed(2)}</Text>

									<Animated.View style={[styles.copiedContainer, { opacity: this.state.rawTxCopiedOpacity }]}>
										<View style={styles.copied}>
											<Text style={styles.copiedText}>RawTx Copied!</Text>
											<Text style={[styles.modalText, { fontSize: 14, marginTop: 5 }]}>
												{this.state.rawTx}
											</Text>
										</View>
									</Animated.View>

								</View>

								<View style={styles.modalBottomContainer}>
									<View style={styles.modalBottomContent}>
										<Button
											title="Copy TxHex"
											loading={this.state.generatingTxHex}
											style={{ backgroundColor: "#813fb1" }}
											onPress={async () => {
												this.setState({ generatingTxHex: true });
												let rawTx = await this.createTransaction();
												if (rawTx.error === true) {
													await this.setState({ generatingTxHex: false });
													return;
												}
												rawTx = rawTx.data;
												await this.setState({ generatingTxHex: false });
												this.copyRawTx(rawTx);
												if (this.state.rawTx !== rawTx) this.setState({ rawTx });
											}}
										/>
										<Button style={{ backgroundColor: "#813fb1" }} title="Send" onPress={this.sendTransaction} activeOpacity={0.6} />
									</View>
								</View>
							</View>
						</View>
						{this.state.displayLoading &&
						<LinearGradient style={styles.loadingContainer}>
							<Loading
								loadingOpacity={this.state.loadingOpacity}
								loadingMessage={this.state.loadingMessage}
								loadingProgress={this.state.loadingProgress}
								enableSpinner={this.state.enableLoadingSpinner}
								enableProgressBar={this.state.enableLoadingProgressBar}
								enableSuccessIcon={this.state.enableLoadingSuccessIcon}
								enableErrorIcon={this.state.enableLoadingErrorIcon}
								width={width/2}
								animationName="loader"
							/>
						</LinearGradient>}
						{this.state.displayXButton &&
						<Animated.View style={styles.xButton}>
							<XButton onPress={this.onBack} />
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
		flex: 1,
		backgroundColor: "transparent"
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
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	textInput: {
		flex: 1,
		height: 30,
		borderTopLeftRadius: 5,
		borderBottomLeftRadius: 5,
		paddingLeft: 5,
		paddingTop: 0,
		paddingBottom: 0,
		fontWeight: "bold"
	},
	cameraIcon: {
		alignItems: "flex-end"
	},
	rotatedIcon: {
		transform: [{ rotate: "90deg"}],
		marginRight: 3,
		backgroundColor: "transparent"
	},
	boldModalText: {
		...systemWeights.bold,
		fontSize: 16
	},
	modalText: {
		...systemWeights.light,
		fontSize: 16
	},
	amountText: {
		textAlign: "right",
		...systemWeights.regular,
		fontSize: 16
	},
	leftIconContainer: {
		height: 30,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5
	},
	rightIconContainer: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
		borderTopRightRadius: 5,
		borderBottomRightRadius: 5,
		borderLeftColor: colors.purple,
		height: 30
	},
	sliderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
	},
	slider: {
		flex: 1,
		paddingVertical: 5
	},
	clipboardIcon: {
		alignItems: "flex-end"
	},
	row: {
		flexDirection: "row",
		marginTop: 10,
		backgroundColor: "transparent"
	},
	sendButtonContainer: {
		flex: 1,
		justifyContent: "space-around",
		backgroundColor: "transparent"
	},
	sendButton: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	loadingContainer: {
		position: "absolute",
		height: "100%",
		width: "100%"
	},
	modalContainer: {
		flex: 1,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center"
	},
	modalContent: {
		paddingVertical: 20,
		width: "80%",
		height: "70%",
		paddingHorizontal: 10,
		borderRadius: 20,
		justifyContent: "center",
		top: -50
	},
	modalUpperContent: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	modalMiddleContent: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
		marginVertical: 10,
		backgroundColor: "transparent"
	},
	modalBottomContainer: {
		flex: 0.2,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	modalBottomContent: {
		flexDirection: "row",
		justifyContent: "space-evenly",
		alignItems: "center",
		backgroundColor: "transparent"
	},
	amountContainer: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "flex-start",
		backgroundColor: "transparent"
	},
	messageHeaderContainer: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "flex-start",
		backgroundColor: "transparent"
	},
	addressTitle: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "flex-start",
		backgroundColor: "transparent"
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
