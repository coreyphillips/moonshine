import React, { PureComponent } from "react";
import {
	StyleSheet,
	View,
	Animated,
	LayoutAnimation,
	Dimensions,
	Platform,
	InteractionManager,
	Easing
} from "react-native";
import PropTypes from "prop-types";
import Slider from "@react-native-community/slider";
import { systemWeights } from "react-native-typography";
import "../../shim";

import Button from "./Button";
import Loading from "./Loading";
import { Text } from "../styles/components";
import bitcoinUnits from "bitcoin-units";
import * as electrum from "../utils/electrum";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	getAddress,
	validatePrivateKey,
	getScriptHash
} = require("../utils/helpers");
const bitcoin = require("bitcoinjs-lib");

const {
	createTransaction,
	getByteCount,
	validateAddress,
	capitalize,
	generateAddresses,
	pauseExecution
} = require("../utils/helpers");

const {
	getCoinData,
	networks
} = require("../utils/networks");

const moment = require("moment");
const { width } = Dimensions.get("window");

class SendTransaction extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			displayLoading: true,
			loadingOpacity: new Animated.Value(1),

			loadingMessage: "Private Key Detected.\nChecking for funds.",
			loadingProgress: 0,
			enableLoadingSpinner: true,
			enableLoadingProgressBar: true,
			enableLoadingSuccessIcon: false,
			enableLoadingErrorIcon: false,

			rawTx: "",
			rawTxCopiedOpacity: new Animated.Value(0),
			generatingTxHex: false,

			privateKeyData: {
				keyPair: {},
				network: "bitcoin",
				bech32Utxos: [],
				p2shUtxos: [],
				p2pkhUtxos: [],
				balance: 0,
				address: ""
			},

			target: { address: "", value: 0 }, //address: Where to send the private key's funds. value: How much to send to the given address

			fiatBalance: {
				balance: 0, //Converted fiat balance of privateKeyData.balance based on the current exchange data
				balanceMinusFees: 0 //Converted fiat balance of privateKeyData.balance - totalFee based on the current exchange data
			},
			cryptoBalance: {
				balance: 0, //Converted crypto balance of privateKeyData.balance based on the current cryptoUnit selected in settings
				balanceMinusFees: 0 //Converted crypto balance of privateKeyData.balance - totalFee based on the current cryptoUnit selected in settings
			},

			cryptoLabel: "", //Displays the users balance in their desired cryptoUnit format with the cryptoUnit appended (Ex: 0.01 BTC)
			cryptoUnitLabel: "BTC",

			fee: 0, //sats per byte
			totalFee: 0, //total fee for the transaction in sats
			totalFiatFee: 0, //totalFee converted to fiat based on the exchangeRate
			recommendedFee: 6, //recommended sats per byte
			transactionSize: 0 //Estimated transaction size
		};
	}

	async componentDidMount() {

		_initializeState = async (data) => {
			try {
				const { selectedCrypto, selectedWallet } = this.props.wallet;
				const cryptoUnit = this.props.settings.cryptoUnit;

				await this.calculateFees(); //This sets the maximumFee, fee, transactionSize state
				const fiatBalance = this.getFiatBalance();
				const cryptoBalance = this.getCryptoBalance();
				const cryptoLabel = this.getCryptoLabel();
				const cryptoUnitLabel = getCoinData({selectedCrypto, cryptoUnit}).acronym;

				const addressIndex = this.props.wallet.wallets[selectedWallet].addressIndex[selectedCrypto];
				const address = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto][addressIndex].address;
				this.setState({
					loadingProgress: 0.8,
					privateKeyData: {
						...data
					},
					fiatBalance,
					cryptoBalance,
					cryptoLabel,
					cryptoUnitLabel,
					target: { address, value: data.balance }
				});
				this.updateLoading({ display: false });
			} catch (e) {
				console.log(e);
			}
		};


		if (this.props.privateKey) {
			const validatePrivateKeyResults = await validatePrivateKey(this.props.privateKey);
			if (!validatePrivateKeyResults.isPrivateKey) {
				this.props.onClose();
				alert("Invalid Private Key");
				return;
			}
			const network = validatePrivateKeyResults.network;
			this.setState({ loadingProgress: 0.1 });
			const result = await this.getPrivateKeyData({ privateKey: this.props.privateKey, network });
			//Unknown error occurred
			if (result.error === true) {
				await this.props.onClose();
				alert("Unable to retrieve private key data at this time. Please try again later.");
				return;
			}
			//No balance detected
			if (result.data.balance <= 0) {
				await this.props.onClose();
				alert("There were no funds detected for this private key.");
				return;
			}
			if (Platform.OS === "ios") {
				try {
					_initializeState(result.data);
				} catch (e) {
					console.log(e);
				}
			} else {
				InteractionManager.runAfterInteractions(async () => {
					try {
						_initializeState(result.data);
					} catch (e) {
						console.log(e);
					}
				});
			}
		}
	}

	componentDidUpdate() {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	}

	componentWillUnmount() {
		InteractionManager.runAfterInteractions(() => {
			try {
				this.props.onClose();
			} catch (e) {}
		});
	}

	calculateFees = async () => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			let utxos = [];
			utxos = utxos.concat(this.state.privateKeyData.bech32Utxos);
			utxos = utxos.concat(this.state.privateKeyData.p2shUtxos);
			utxos = utxos.concat(this.state.privateKeyData.p2pkhUtxos);
			const transactionSize = getByteCount({[addressType]:utxos.length},{[addressType]:1});
			const result = await this.props.getRecommendedFee({ coin: selectedCrypto, transactionSize });

			//Ensure we have a valid recommendedFee
			if (result.data.recommendedFee && !isNaN(Number(result.data.recommendedFee))) {
				const fee = Number(result.data.recommendedFee);
				const totalFee = fee * transactionSize;
				let totalFiatFee = 0;
				try {
					totalFiatFee = this.cryptoToFiat({amount: totalFee, selectedCrypto, exchangeRate});
					if (isNaN(totalFiatFee)) totalFiatFee = 0;
				} catch (e) {}
				await this.setState({ maximumFee: Number(result.data.recommendedFee) * 4, fee, transactionSize, totalFee, totalFiatFee });
			} else {
				const fee = 6;
				const totalFee = fee * transactionSize;
				let totalFiatFee = 0;
				try {
					totalFiatFee = this.cryptoToFiat({amount: totalFee, selectedCrypto, exchangeRate});
					if (isNaN(totalFiatFee)) totalFiatFee = 0;
				} catch (e) {}
				await this.setState({ maximumFee: 24, fee: 6, transactionSize, totalFee, totalFiatFee });
			}
		} catch (e) {
			console.log(e);
		}
	};

	getFiatBalance = () => {
		try {
			const { selectedCrypto } = this.props.wallet;
			const totalFee = this.state.totalFee;
			let exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			exchangeRate = Number(exchangeRate);
			let balance = Number(this.state.privateKeyData.balance);
			let balanceMinusFees = balance - Number(totalFee);
			balance = this.cryptoToFiat({ amount: balance, selectedCrypto, exchangeRate });
			balanceMinusFees = this.cryptoToFiat({ amount: balanceMinusFees, selectedCrypto, exchangeRate });
			if (isNaN(balance)) return 0;
			if (isNaN(balanceMinusFees)) return 0;
			return { balance, balanceMinusFees };
		} catch (e) {
			return 0;
		}
	};

	getCryptoBalance = () => {
		let balance = 0, balanceMinusFees = 0;
		try {
			const cryptoUnit = this.props.settings.cryptoUnit;
			balance = this.state.privateKeyData.balance;
			balanceMinusFees = this.state.privateKeyData.balance - this.state.totalFee;

			//This prevents the view from displaying 0 BTC
			if (balance < 50000 && cryptoUnit === "BTC") {
				balance = Number((balance * 0.00000001).toFixed(8));
			} else {
				balance = bitcoinUnits(balance, "satoshi").to(cryptoUnit).value();
			}

			//This prevents the view from displaying 0 BTC
			if (balanceMinusFees < 50000 && cryptoUnit === "BTC") {
				balanceMinusFees = Number((balanceMinusFees * 0.00000001).toFixed(8));
			} else {
				balanceMinusFees = bitcoinUnits(balanceMinusFees, "satoshi").to(cryptoUnit).value();
			}
			if (isNaN(balance)) return 0;
			if (isNaN(balanceMinusFees)) return 0;
			return { balance, balanceMinusFees, cryptoUnit };
		} catch (e) {}
		return balance;
	};

	//Only accepts sats. Returns the fiat amount based on the given exchange rate.
	cryptoToFiat = ({ amount = 0, exchangeRate = 0 } = {}) => {
		try {
			bitcoinUnits.setFiat("usd", exchangeRate);
			return bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
		} catch(e) {
			console.log(e);
			return 0;
		}
	};

	//Returns the converted crypto unit based on the given exchange rate
	fiatToCrypto = ({ amount = 0, exchangeRate = 0, cryptoUnit = "satoshi" } = {}) => {
		try {
			amount = Number(amount);
			bitcoinUnits.setFiat("usd", exchangeRate);
			return bitcoinUnits(amount, "usd").to(cryptoUnit).value().toFixed(0);
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	updateFee = (fee = 0) => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			const cryptoUnit = this.props.settings.cryptoUnit;
			let totalFee = this.getTotalFee(fee);
			totalFee = Number(totalFee);
			const balance = this.state.privateKeyData.balance;

			let cryptoAmount = balance - totalFee;
			const fiatBalance = this.cryptoToFiat({ amount: cryptoAmount, selectedCrypto, exchangeRate });

			//This prevents the view from displaying 0 BTC
			if (cryptoAmount < 50000 && cryptoUnit === "BTC") {
				cryptoAmount = Number((cryptoAmount * 0.00000001).toFixed(8));
			} else {
				cryptoAmount = bitcoinUnits(cryptoAmount, "satoshi").to(cryptoUnit).value();
			}

			let totalFiatFee = 0;
			try {
				totalFiatFee = this.cryptoToFiat({amount: totalFee, selectedCrypto, exchangeRate});
				if (isNaN(totalFiatFee)) totalFiatFee = 0;
			} catch (e) {}
			this.setState({
				fee: Number(fee),
				totalFiatFee,
				totalFee,
				cryptoBalance: {
					...this.state.cryptoBalance,
					balanceMinusFees: cryptoAmount
				},
				fiatBalance: {
					...this.state.fiatBalance,
					balanceMinusFees: fiatBalance
				}
			});
		} catch (e) {
			console.log(e);
		}
	};

	getPrivateKeyData = async ({ privateKey = "", network = "bitcoin" } = {}) => {
		return new Promise(async (resolve) => {
			try {
				//Switch to the specified network in order to sweep the coins
				if (network !== this.props.wallet.selectedCrypto) {
					await this.props.updateWallet({selectedCrypto: network});
					//Disconnect from the current electurm server.
					await electrum.stop({ coin: network });
					await electrum.start({ coin: network, peers: this.props.settings.peers[network], customPeers: this.props.settings.customPeers[network] });
					await this.props.refreshWallet();
				}

				//Get addresses from the private key
				const keyPair = bitcoin.ECPair.fromWIF(privateKey, networks[network]);
				const bech32Address = await getAddress(keyPair, networks[network], "bech32"); //Bech32
				const bech32ScriptHash = await getScriptHash(bech32Address, networks[network]);
				const p2shAddress = await getAddress(keyPair, networks[network], "segwit"); //(3) Address
				const p2shScriptHash = await getScriptHash(p2shAddress, networks[network]);
				const p2pkhAddress = await getAddress(keyPair, networks[network], "legacy");//(1) Address
				const p2pkhScriptHash = await getScriptHash(p2pkhAddress, networks[network]);

				//Get the balance for each address.
				this.setState({ loadingMessage: `Private Key Detected.\nFetching Bech32 address balance...`, loadingProgress: 0.3 });
				const bech32BalanceResult = await Promise.all([
					electrum.getAddressScriptHashBalance({scriptHash: bech32ScriptHash, id: 6, coin: network}),
					electrum.getAddressScriptHashMempool({scriptHash: bech32ScriptHash, id: 5, coin: network})
				]);

				this.setState({ loadingMessage: `Private Key Detected.\nFetching Segwit address balance...`, loadingProgress: 0.4 });
				const p2shBalanceResult = await Promise.all([
					electrum.getAddressScriptHashBalance({scriptHash: p2shScriptHash, id: 1, coin: network}),
					electrum.getAddressScriptHashMempool({scriptHash: p2shScriptHash, id: 3, coin: network}),
				]);

				this.setState({ loadingMessage: `Private Key Detected.\nFetching Legacy address balance...`, loadingProgress: 0.5 });
				const p2pkhBalanceResult = await Promise.all([
					electrum.getAddressScriptHashBalance({scriptHash: p2pkhScriptHash, id: 2, coin: network}),
					electrum.getAddressScriptHashMempool({scriptHash: p2pkhScriptHash, id: 4, coin: network})
				]);

				let balance = 0;
				let bech32Balance = 0;
				let p2shBalance = 0;
				let p2pkhBalance = 0;
				//const selectedWallet = this.props.wallet.selectedWallet;
				const selectedCrypto = this.props.wallet.selectedCrypto;
				//const addressIndex = this.props.wallet[selectedWallet].addressIndex[selectedCrypto];
				//const address = this.props.wallet[selectedWallet].addresses[selectedCrypto][addressIndex].address;
				//Add up and store all balances from each address
				await Promise.all(
					bech32BalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								bech32Balance = Number(unconfirmed) + Number(confirmed) + Number(bech32Balance);
							} catch (e) {
							}
						}
					}),
					p2shBalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								p2shBalance = Number(unconfirmed) + Number(confirmed) + Number(p2shBalance);
							} catch (e) {
							}
						}
					}),
					p2pkhBalanceResult.map((balanceResult) => {
						if (balanceResult.error === false && !!balanceResult.data && balanceResult.data.constructor === Object) {
							try {
								let unconfirmed, confirmed = 0;
								try {
									unconfirmed = balanceResult.data.unconfirmed;
									confirmed = balanceResult.data.confirmed;
								} catch (e) {
								}
								balance = Number(unconfirmed) + Number(confirmed) + Number(balance);
								p2pkhBalance = Number(unconfirmed) + Number(confirmed) + Number(p2pkhBalance);
							} catch (e) {
							}
						}
					})
				);

				/*
				 console.log("Logging Address Balances...");
				 console.log(`${bech32Address}: ${bech32Balance}`);
				 console.log(`${p2shAddress}: ${p2shBalance}`);
				 console.log(`${p2pkhAddress}: ${p2pkhBalance}`);
				 console.log(`Total Balance: ${balance}`);
				 */
				this.setState({ loadingMessage: `Balance Summary:\n\nBech32 Balance: ${bech32Balance}\nSegwit Balance: ${p2shBalance}\nLegacy Balance: ${p2pkhBalance}`, loadingProgress: 0.7 });

				//Fetch the utxos for each address
				let bech32Utxos = [], p2shUtxos = [], p2pkhUtxos = [];
				try {
					if (bech32Balance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							scriptHash: bech32ScriptHash,
							network: networks[selectedCrypto],
							coin: selectedCrypto
						});
						if (utxoResponse.error === false) bech32Utxos = utxoResponse.data;
					}
				} catch (e) {
					bech32Utxos = [];
				}
				try {
					if (p2shBalance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							scriptHash: p2shScriptHash,
							network: networks[selectedCrypto],
							coin: selectedCrypto
						});
						if (utxoResponse.error === false) p2shUtxos = utxoResponse.data;
					}
				} catch (e) {
					p2shUtxos = [];
				}
				try {
					if (p2pkhBalance) {
						const utxoResponse = await electrum.listUnspentAddressScriptHash({
							id: Math.random(),
							scriptHash: p2pkhScriptHash,
							network: networks[selectedCrypto],
							coin: selectedCrypto
						});
						if (utxoResponse.error === false) p2pkhUtxos = utxoResponse.data;
					}
				} catch (e) {
					p2pkhUtxos = [];
				}

				const data = {
					keyPair,
					network,
					bech32Utxos,
					p2shUtxos,
					p2pkhUtxos,
					balance
				};

				await this.setState({
					privateKeyData: data
				});

				this.getFiatBalance();

				this.setState({ loadingMessage: `Balance Summary:\n\nBech32 Balance: ${bech32Balance}\nSegwit Balance: ${p2shBalance}\nLegacy Balance: ${p2pkhBalance}`, loadingProgress: 0.85 });

				resolve({ error: false, data });
			} catch (e) {
				console.log(e);
			}
		});
	};

	//Handles any action that requires a private key to be swept.
	//This function will auto-sweep the funds of any private key into the user's currently selected wallet.
	sweepPrivateKey = async (data) => {
		const {keyPair, network, bech32Utxos, p2shUtxos, p2pkhUtxos} = data;
		const { target } = this.state;
		const totalFee = this.state.totalFee;
		return new Promise(async (resolve) => {
			try {

				//Set the loading state.
				this.props.updateXButton({ stateId: "displayXButton", opacityId: "xButtonOpacity", display: false });
				await Promise.all(
					this.updateLoading({ display: true , loadingMessage: "Sweeping Funds...", loadingProgress: 0.5})
				);

				//Setup transaction builder for the given network
				let txb = new bitcoin.TransactionBuilder(networks[network]);

				//Start adding the inputs for each address if any utxo's are available
				try {
					//Add Inputs
					await Promise.all(
						bech32Utxos.map((utxo) => {
							const p2wpkh = bitcoin.payments.p2wpkh({
								pubkey: keyPair.publicKey,
								network: networks[network]
							});
							txb.addInput(utxo.tx_hash, utxo.tx_pos, null, p2wpkh.output);
						})
					);
				} catch (e) {
					console.log(e);
				}
				try {
					//Add Inputs
					await Promise.all(
						p2shUtxos.map((utxo) => {
							txb.addInput(utxo.tx_hash, utxo.tx_pos);
						})
					);
				} catch (e) {
					console.log(e);
				}
				try {
					//Add Inputs
					await Promise.all(
						p2pkhUtxos.map((utxo) => {
							txb.addInput(utxo.tx_hash, utxo.tx_pos);
						})
					);
				} catch (e) {
					console.log(e);
				}

				//Add our next available changeAddress for the given wallet as an output minus whatever the user decides the fee to be.
				txb.addOutput(target.address, Number(target.value) - Number(totalFee));

				//Loop through and sign all available utxos.
				try {
					if (bech32Utxos.length > 0) {
						await Promise.all(
							bech32Utxos.map((utxo, i) => {
								try {
									txb.sign(i, keyPair, null, null, utxo.value);
								} catch (e) {
									console.log(e);
								}
							})
						);
					}
				} catch (e) {
					console.log(e);
				}
				try {
					if (p2shUtxos.length > 0) {
						let utxoLength = 0;
						try {
							utxoLength = bech32Utxos.length;
						} catch (e) {
							console.log(e);
						}
						await Promise.all(
							p2shUtxos.map((utxo, i) => {
								try {
									const p2wpkh = bitcoin.payments.p2wpkh({
										pubkey: keyPair.publicKey,
										network: networks[network]
									});
									const p2sh = bitcoin.payments.p2sh({redeem: p2wpkh, network: networks[network]});
									txb.sign(utxoLength+i, keyPair, p2sh.redeem.output, null, utxo.value);
								} catch (e) {
									console.log(e);
								}
							})
						);
					}
				} catch (e) {
					console.log(e);
				}
				try {
					if (p2pkhUtxos.length > 0) {
						let utxoLength = 0;
						try {
							utxoLength = bech32Utxos.length;
						} catch (e) {
							console.log(e);
						}
						try {
							utxoLength = utxoLength + p2shUtxos.length;
						} catch (e) {
							console.log(e);
						}
						await Promise.all(
							p2pkhUtxos.map((utxo, i) => {
								try {
									txb.sign(utxoLength+i, keyPair);
								} catch (e) {
									console.log(e);
								}
							})
						);
					}
				} catch (e) {
					console.log(e);
				}

				//Create the raw transaction hex
				const rawTx = txb.build().toHex();

				await pauseExecution();
				await this.setState({ loadingProgress: 0.8 });
				await pauseExecution();
				const { selectedCrypto, selectedWallet } = this.props.wallet;
				const sendTransactionResult = await this.props.sendTransaction({ txHex: rawTx, selectedCrypto, sendTransactionFallback: this.props.settings.sendTransactionFallback });
				if (sendTransactionResult.error) {
					await this.setState({
						loadingMessage: "There appears to have been an error sending your transaction. Please try again.",
						loadingProgress: 0,
						enableLoadingSpinner: false,
						enableLoadingErrorIcon: true
					});
					await this.props.updateXButton({ stateId: "displayXButton", opacityId: "xButtonOpacity", display: true });
				} else {

					//Success! The transaction completed successfully
					try {
						//Attempt to add the successful transaction to the transaction list
						const address = this.state.target.address;
						const amount = this.state.cryptoBalance.balanceMinusFees;
						//const fee = this.state.fee;
						//const transactionSize = this.state.transactionSize;

						const successfulTransaction = [{
							address,
							amount: this.state.cryptoBalance.balance,
							block: 0,
							data: "",
							fee: totalFee,
							hash: sendTransactionResult.data,
							inputAmount: this.state.cryptoBalance.balance,
							messages: [],
							outputAmount: amount,
							receivedAmount: amount,
							sentAmount: 0,
							timestamp: moment().unix(),
							type: "received"
						}];
						//Add Transaction to transaction stack
						await this.props.addTransaction({ wallet: selectedWallet, selectedCrypto, transaction: successfulTransaction });

						//Temporarily update the balance for the user to prevent a delay while electrum syncs the balance from the new transaction
						try {
							const newBalance = Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]) + amount;
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
					const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
					let currentUtxos = [];
					try {
						currentUtxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto] || [];
					} catch (e) {
					}
					const addresses = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto];
					const changeAddresses = this.props.wallet.wallets[selectedWallet].changeAddresses[selectedCrypto];
					this.props.resetUtxos({ addresses, changeAddresses, currentBlockHeight, selectedCrypto, selectedWallet, currentUtxos });
					await pauseExecution(1500);
					//Fade out the loading view
					Animated.timing(
						this.state.loadingOpacity,
						{
							toValue: 0,
							duration: 400,
							easing: Easing.inOut(Easing.ease),
							useNativeDriver: true
						}
					).start(async () => {
						//Close component after opacity fade-out
						await this.props.onClose();
						await pauseExecution(1000);
						this.props.refreshWallet({ ignoreLoading: true });
					});
				}

				//Reset the user's view
				this.props.onClose();

				resolve({error: false, data: rawTx});
			} catch (e) {
				console.log(e);
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

	getTotalFee = (fee = 0, transactionSize = 0) => {
		try {
			if (!fee || isNaN(fee)) {
				fee = this.state.fee;
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
			//const fee = Number(this.state.fee) || Number(this.state.recommendedFee);
			const selectedCrypto = this.props.wallet;
			crypto = this.state.totalFee;
			fiat = this.cryptoToFiat({ amount: crypto, selectedCrypto, exchangeRate });

			//Return 0 if isNaN is returned.
			if (isNaN(crypto)) crypto = 0;
			if (isNaN(fiat)) fiat = 0;

			return { crypto, fiat };
		} catch (e) {
			console.log(e);
		}
	};

	getSendButtonFiatLabel = () => {
		try {
			//return this.state.fiatBalance;
			//const { selectedCrypto } = this.props.wallet;
			//const exchangeRate = this.props.wallet.exchangeRate[selectedCrypto];
			const balance = this.state.fiatBalance.balanceMinusFees;
			if (isNaN(balance)) return 0;
			return Number(balance);
		} catch (e) {
			return 0;
		}
	};

	getCryptoLabel = () => {
		try {
			const { cryptoUnit } = this.props.settings;
			const { selectedCrypto } = this.props.wallet;
			const cryptoAcronym = getCoinData({selectedCrypto, cryptoUnit}).acronym;
			let cryptoValue = this.state.cryptoBalance.balanceMinusFees;
			return `${cryptoValue} ${cryptoAcronym}`;
		} catch (e) {}
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
			const confirmedBalance = wallet.confirmedBalance[selectedCrypto];
			const changeAddressIndex = wallet.changeAddressIndex[selectedCrypto];
			const transactionFee = Number(this.props.transaction.fee) || Number(this.props.transaction.recommendedFee);
			const amount = Number(this.props.transaction.amount);
			const message = this.props.transaction.message;
			const addressType = wallet.addressType[selectedCrypto];
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

			return await createTransaction({ address, transactionFee, amount, confirmedBalance, utxos, changeAddress, wallet: selectedWallet, selectedCrypto, message, addressType });
		} catch (e) {
			console.log(e);
		}
	};

	render() {
		if (this.state.displayLoading) {
			return (
				<Loading
					loadingOpacity={this.state.loadingOpacity}
					loadingMessage={this.state.loadingMessage}
					loadingProgress={this.state.loadingProgress}
					enableSpinner={this.state.enableLoadingSpinner}
					enableProgressBar={this.state.enableLoadingProgressBar}
					enableSuccessIcon={this.state.enableLoadingSuccessIcon}
					enableErrorIcon={this.state.enableLoadingErrorIcon}
					width={width/2}
					style={{ bottom: 0 }}
					animationName="loader"
				/>
			);
		}

		return (
			<View style={styles.container}>
				<View style={{ flex: 1 }}>

					<View style={{ alignItems: "center", justifyContent: "center" }}>
						<Text type="white" style={[styles.header, { marginBottom: 5 }]}>Amount Detected:</Text>
						<Text type="white" style={styles.largeText}>{`${this.props.settings.fiatSymbol}${this.state.fiatBalance.balance || 0}`}</Text>
						<Text type="white" style={styles.largeText}>{`${this.state.cryptoBalance.balance || 0} ${this.state.cryptoUnitLabel}`}</Text>
					</View>

					<View style={{ flex: 0.7, justifyContent: "space-evenly", marginTop: 20 }}>

						<View style={styles.row}>
							<View style={{ flex: 1, justifyContent: "flex-end", alignItems: "flex-start" }}>
								<Text type="white" style={[styles.largeText, { fontWeight: "bold" }]}>Sending To: <Text type="white" style={styles.largeText}>{`Wallet ${this.props.wallet.walletOrder.indexOf(this.props.wallet.selectedWallet)}`}</Text></Text>
							</View>
						</View>

						<View style={styles.row}>
							<View style={{ flex: 1, justifyContent: "flex-end", alignItems: "flex-start" }}>
								<Text type="white" style={[styles.largeText, { fontWeight: "bold" }]}>Amount: <Text type="white" style={styles.largeText}>{`${this.state.cryptoBalance.balanceMinusFees} ${this.state.cryptoUnitLabel}`}</Text></Text>
							</View>
						</View>

						<View style={[styles.row, { marginTop: 20, marginBottom: 1 }]}>
							<View style={{ flex: 1.2 }}>
								<Text type="white" style={styles.text}>Fee: {this.state.fee || this.state.recommendedFee}sat/B </Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text type="white" style={[styles.text, { textAlign: "center" }]}>{this.props.settings.fiatSymbol}{this.state.totalFiatFee}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text type="white" style={[styles.text, { textAlign: "center" }]}>{this.state.totalFee} sats</Text>
							</View>
						</View>
						<View style={styles.sliderRow}>
							<Slider
								style={styles.slider}
								onValueChange={(fee) => this.updateFee(parseInt(fee))}
								thumbTintColor={colors.white}
								minimumTrackTintColor={colors.lightPurple}
								maximumValue={this.state.maximumFee}
								minimumValue={1}
								value={Number(this.state.fee) || Number(this.state.recommendedFee)}
							/>
						</View>

					</View>
				</View>

				<View style={{ flex: Platform.OS === "ios" ? 0.45 : 0.45, justifyContent: "flex-start" }}>
					<View style={styles.buttonContainer}>
						<Button title="Sweep" text={`~$${this.state.fiatBalance.balanceMinusFees}`} text2={`${this.state.cryptoBalance.balanceMinusFees || 0} ${this.state.cryptoUnitLabel}`} textStyle={{ paddingTop: 5, ...systemWeights.light, }} onPress={() =>this.sweepPrivateKey(this.state.privateKeyData)} />
					</View>
				</View>

			</View>
		);
	}
}

SendTransaction.defaultProps = {
	refreshWallet: () => null,
	onClose: () => null
};

SendTransaction.propTypes = {
	refreshWallet: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		textAlign: "left",
		marginLeft: 5
	},
	largeText: {
		...systemWeights.regular,
		fontSize: 20,
		textAlign: "center"
	},
	header: {
		...systemWeights.regular,
		fontSize: 26,
		textAlign: "center"
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
