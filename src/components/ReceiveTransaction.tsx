import React, {useState, useEffect, memo} from "react";
import {
	StyleSheet,
	View,
	LayoutAnimation,
	Platform,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import ShareButtons from "./ShareButtons";
import DefaultModal from "./DefaultModal";
import {systemWeights} from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
import NumPad from "./NumPad";
import { QRCode, Text, MaterialIcons } from "../styles/components";
const {
	Constants: {
		colors,
		currencies
	}
} = require("../../ProjectData.json");
const {
	capitalize,
	formatNumber,
	cryptoToFiat,
	fiatToCrypto,
	removeAllButFirstInstanceOfPeriod,
	parseFiat
} = require("../utils/helpers");
const {
	getCoinData,
	maxCoins
} = require("../utils/networks");

interface Default {
	selectedCrypto: string, // bitcoin, bitcoinTestnet, litecoin, litecoinTestnet, etc...
	address:string, // Receiving Address
}
interface FormatUri extends Default {
	amount?: string, // Amount to request when formatting the URI
	label?: string // Label to add to the URI
}
const formatUri = ({ selectedCrypto, address, amount }: FormatUri = {
	selectedCrypto: "bitcoin", address: "", amount: ""
}) => {
	let coin = "bitcoin";
	try {coin = selectedCrypto.toLowerCase().replace("testnet", "");} catch (e) {}
	try {
		if (amount !== "") return `${coin}:${address}?amount=${amount}`;
		return `${coin}:${address}`;
	} catch (e) {return `${coin}:`;}
};

interface ReceiveTransactionComponent extends Default, FormatUri {
	cryptoUnit: string,
	selectedCurrency: string,
	exchangeRate: number,
	size?: number, // Size of QRCode
	disabled?: boolean // Disable the Copy/Share buttons
}
const _ReceiveTransaction = ({ selectedCrypto = "bitcoin", selectedCurrency = "usd", address = "", amount = "", label = "", cryptoUnit = "satoshi", exchangeRate = 0, size = 200, disabled = false }: ReceiveTransactionComponent) => {

	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	const [requestedAmount, setRequestedAmount] = useState(amount || "0"); //Represented as sats
	const [fiatAmount, setFiatAmount] = useState(amount || `${currencies[selectedCurrency].symbol}0`); //Represented and formatted based on selectedFiat (USD)
	const [cryptoAmount, setCryptoAmount] = useState(amount || "0"); //Represented and formatted based on cryptoUnit (sats/bitcoin)

	let _uri = "";
	try {_uri = formatUri({selectedCrypto, address, amount: requestedAmount, label});} catch (e) {}
	const [uri, setUri] = useState(_uri);

	const [displaySpecifyAmount, setDisplaySpecifyAmount] = useState(false); //Determines whether the specifyAmount modal is displayed
	const [displayInCrypto, setDisplayInCrypto] = useState(true); //Determines whether the specifyAmount modal is updating fiat or BTC/LTC

	const acronym = getCoinData({ selectedCrypto, cryptoUnit }).acronym;

	if (!address) return <View />;

	const hasRequestedAmount = () => {try {return Number(requestedAmount) > 0;} catch (e) {return false;}};

	let shareTitle = "My Address.";
	if (hasRequestedAmount()){
		try {shareTitle = `Please send ${cryptoAmount} ${acronym} to my ${capitalize(selectedCrypto)} address.`;} catch(e) {}
	} else {
		try {shareTitle = `My ${capitalize(selectedCrypto)} Address.`;} catch(e) {}
	}

	//Toggle the request modal
	const toggleSpecifyAmount = () => {
		if (displaySpecifyAmount) {
			let _uri = "";
			try {_uri = formatUri({selectedCrypto, address, amount: requestedAmount, label});} catch (e) {}
			setUri(_uri);
			setFiatAmount(fiatAmount.replace(/^[.\s]+|[.\s]+$/g, ""));
		}
		try {setDisplaySpecifyAmount(!displaySpecifyAmount);} catch(e) {}
	};

	//Toggle whether fiat or btc is displayed in the request modal
	const toggleDisplayInCrypto = () => {try {setDisplayInCrypto(!displayInCrypto);} catch(e) {}};

	//Handles any change to requestedAmount from the request modal in order to parse and format the input accordingly.
	const updateRequestedAmount = (amount = "") => {
		try {
			const fiatSymbol = currencies[selectedCurrency].symbol;
			let _fiatAmount, _requestedAmount, _cryptoAmount = "";
			amount = amount.toString().trim();
			amount = amount.replace(`${fiatSymbol}`, "");
			amount = amount.replace(" ", "");

			//Remove all commas
			amount = amount.split(',').join("");
			//Remove all decimals if the cryptoUnit is satoshi/litoshi and is currently displayed in crypto.
			if (displayInCrypto) {
				if (cryptoUnit === "satoshi" || cryptoUnit === "litoshi") amount = amount.split('.').join("");
			}
			amount = removeAllButFirstInstanceOfPeriod(amount);
			if (displayInCrypto) {
				_requestedAmount = bitcoinUnits(Number(amount), cryptoUnit).to("satoshi").value();
				_fiatAmount = cryptoToFiat({ amount: _requestedAmount, exchangeRate });
				//Without this the user is unable to enter values without deleting digits after pressing the "Clear" button after swapping from sats.
				if (_fiatAmount === "0.00") _fiatAmount = "0";
				_cryptoAmount = amount.toString();
			} else {
				//Don't convert the _fiatAmount just assign it to the user's input and pass it on
				_fiatAmount = parseFiat(amount);
				_requestedAmount = fiatToCrypto({ amount: Number(amount), exchangeRate });
				_cryptoAmount = bitcoinUnits(Number(_requestedAmount), "satoshi").to(cryptoUnit).value();
			}
			if (Number(_requestedAmount) > maxCoins[selectedCrypto]) return;
			//Add commas to sats or lits
			if (cryptoUnit === "satoshi" || cryptoUnit === "litoshi") _cryptoAmount = _cryptoAmount.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
			if (requestedAmount !== _requestedAmount) setRequestedAmount(_requestedAmount);
			if (fiatAmount !== _fiatAmount) setFiatAmount(`${fiatSymbol}${formatNumber(_fiatAmount)}`);
			if (cryptoAmount !== _cryptoAmount) setCryptoAmount(_cryptoAmount);
		} catch (e) {console.log(e);}
	};

	const getRequestedValue = () => {try {return displayInCrypto ? cryptoAmount : fiatAmount;} catch (e) {return "0";}};

	const getShareMessage = () => {
		try {
			if (hasRequestedAmount()) return `Address:\n${address}\n\nAmount:\n${cryptoAmount} ${acronym}\n${fiatAmount}`;
			return address;
		} catch (e) {return "";}
	};

	return (
		<View style={styles.container}>
			<View style={styles.qrCodeContainer}>
				<QRCode value={uri} size={size} />
			</View>
			<ShareButtons
				text={address}
				shareMessage={getShareMessage()}
				shareTitle={shareTitle}
				shareDialogTitle={shareTitle}
				onCopySuccessText="Address Copied!"
				disabled={disabled}
			/>

			<TouchableOpacity style={styles.specifyAmountButton} onPress={toggleSpecifyAmount}>
				{!hasRequestedAmount() &&
					<Text style={[styles.requestButtonText, { fontSize: 14, ...systemWeights.regular }]}>
						Specify Amount
					</Text>}
				{hasRequestedAmount() &&
					<View>
						<Text style={[styles.requestButtonText, { marginBottom: 5 }]}>
							Requesting:
						</Text>
						<Text style={styles.requestButtonText}>
							{displayInCrypto ? `${cryptoAmount} ${acronym}\n${fiatAmount}` : `${fiatAmount}\n${cryptoAmount} ${acronym}`}
						</Text>
					</View>
				}
			</TouchableOpacity>

			<DefaultModal
				isVisible={displaySpecifyAmount}
				onClose={toggleSpecifyAmount}
				type="View"
				style={{ height: "96%" }}
			>
				<View style={{ flex: 1, justifyContent: "center", backgroundColor: "transparent" }}>
					<Text style={styles.textInput}>{`${getRequestedValue()} ${displayInCrypto ? acronym : ""}`}</Text>
					<Text style={styles.amountText}>{`${displayInCrypto ? fiatAmount : cryptoAmount} ${!displayInCrypto ? acronym : ""}`}</Text>
					<TouchableOpacity style={styles.swapButton} onPress={toggleDisplayInCrypto}>
						<View style={{ flexDirection: "row" }}>
							<View style={styles.swapIcon}>
								<MaterialIcons type="text" name={"swap-calls"} size={25} />
							</View>
							<Text style={styles.amountText}>{displayInCrypto ? `${acronym}` : currencies[selectedCurrency].unit}</Text>
						</View>
					</TouchableOpacity>
					<NumPad style={{ marginTop: 20 }} onPress={updateRequestedAmount} value={getRequestedValue()} />
					<TouchableOpacity onPress={toggleSpecifyAmount} style={[styles.centerContent]}>
						<MaterialIcons type="text" name={"check-circle"} size={70} />
					</TouchableOpacity>
				</View>
			</DefaultModal>

		</View>
	);
};

_ReceiveTransaction.propTypes = {
	selectedCrypto: PropTypes.string.isRequired,
	address: PropTypes.string.isRequired,
	selectedCurrency: PropTypes.string.isRequired,
	amount: PropTypes.number,
	label: PropTypes.string,
	size: PropTypes.number
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center"
	},
	qrCodeContainer: {
		padding: 10,
		backgroundColor: colors.white,
		borderRadius: 5
	},
	specifyAmountButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: colors.white,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 10,
		marginTop: 40
	},
	textInput: {
		padding: 15,
		textAlign: "center",
		fontSize: Platform.OS === "ios" ? 30 : 26,
		fontWeight: "bold",
		backgroundColor: "transparent"
	},
	swapButton: {
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "center",
		backgroundColor: "transparent",
		paddingVertical: 10,
		paddingHorizontal: 20
	},
	amountText: {
		textAlign: "center",
		...systemWeights.regular,
		fontSize: Platform.OS === "ios" ? 30 : 26,
	},
	requestButtonText: {
		textAlign: "center",
		...systemWeights.semibold,
		color: colors.white,
		fontSize: 18
	},
	swapIcon: {
		marginRight: 3,
		alignSelf: "center"
	},
	centerContent: {
		alignItems: "center",
		justifyContent: "center"
	}
});

//ComponentShouldNotUpdate
const ReceiveTransaction = memo(
	_ReceiveTransaction,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps.address === prevProps.address;
	}
);

export default ReceiveTransaction;
