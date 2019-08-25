import React, {useState, useEffect, memo} from "react";
import {
	StyleSheet,
	Text,
	View,
	Share,
	Clipboard,
	Animated,
	LayoutAnimation,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import LinearGradient from "react-native-linear-gradient";
import QRCode from 'react-native-qrcode-svg';
import Button from "./Button";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	capitalize
} = require("../utils/helpers");

interface Default {
	selectedCrypto: string, // bitcoin, bitcoinTestnet, litecoin, litecoinTestnet, etc...
	address:string, // Receiving Address
}
interface FormatUri extends Default {
	amount?: number, // Amount to request when formatting the URI
	label?: string // Label to add to the URI
}
const formatUri = ({ selectedCrypto, address }: FormatUri = {
	selectedCrypto: "bitcoin", address: ""
}) => {
	try {
		return `${selectedCrypto}:${address}`;
	} catch (e) {return `${selectedCrypto}:`;}
};

const onSharePress = ({selectedCrypto, address}: Default = {
	selectedCrypto: "Bitcoin", address: ""
}): void => {
	try {
		selectedCrypto = capitalize(selectedCrypto);
		Share.share({
			message: address,
			url: "google.com",
			title: `My ${selectedCrypto} Address.`
		}, {
			// Android only:
			dialogTitle: `My ${selectedCrypto} Address.`
		});
	} catch (e) {
		console.log(e);
	}
};

interface ReceiveTransactionComponent extends Default, FormatUri {
	size?: number, // Size of QRCode
	disabled?: boolean // Disable the Copy/Share buttons
}
const _ReceiveTransaction = ({ selectedCrypto = "bitcoin", address = "aaaaaaa", amount = 0, label = "", size = 200, disabled = false }: ReceiveTransactionComponent) => {
	
	useEffect(() => {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	});
	
	const [addressOpacity] = useState(new Animated.Value(0));
	let uri = "";
	try {uri = formatUri({selectedCrypto, address, amount, label});} catch (e) {}
	
	const onCopyPress = (address = "") => {
		let duration = 1500;
		try {
			Clipboard.setString(address);
			Animated.timing(
				addressOpacity,
				{
					toValue: 1,
					duration: 500,
					useNativeDriver: true
				}
			).start(async () => {
				setTimeout(() => {
					Animated.timing(
						addressOpacity,
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
			alert("Unable to copy address. Please try again or check your phone's permissions.");
		}
	};
	
	if (!address) return <View />;
	
	return (
		<View style={styles.container}>
			<View style={styles.qrCodeContainer}>
				<QRCode
					value={uri}
					size={size}
					backgroundColor={colors.white}
					color={colors.purple}
				/>
			</View>
			<View style={styles.textContainer}>
				<Text style={styles.text}>{address}</Text>
				<Animated.View style={[styles.copiedContainer, {opacity: addressOpacity}]}>
					<LinearGradient style={{ flex: 1 }} colors={[ "#6c2c9e", "#68299a", "#662798", "#632596", "#5e2191"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
						<View style={styles.copied}>
							<Text style={styles.copiedText}>Address Copied!</Text>
						</View>
					</LinearGradient>
				</Animated.View>
			
			</View>
			<View style={styles.row}>
				<Button style={styles.button} text="Share" onPress={() => onSharePress({address, selectedCrypto})} disabled={disabled} />
				<View style={{marginHorizontal: 5}} />
				<Button style={styles.button} text="Copy" onPress={() => onCopyPress(address)} disabled={disabled} />
			</View>
		</View>
	);
};

_ReceiveTransaction.propTypes = {
	selectedCrypto: PropTypes.string.isRequired,
	address: PropTypes.string.isRequired,
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
	copiedContainer: {
		flex: 1,
		backgroundColor: colors.purple,
		borderRadius: 4,
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
		color: colors.white,
		fontSize: 16,
		textAlign: "center"
	},
	button: {
		minWidth: "20%",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	row: {
		marginTop: 5,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	textContainer: {
		borderColor: colors.purple,
		borderRadius: 5,
		backgroundColor: colors.white,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 10,
		padding: 10
	},
	text: {
		...systemWeights.light,
		color: colors.darkPurple,
		fontSize: 15,
		textAlign: "center"
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
