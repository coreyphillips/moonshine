import React, {useEffect, memo} from "react";
import {
	StyleSheet,
	View,
	LayoutAnimation,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import QRCode from 'react-native-qrcode-svg';
import ShareButtons from "./ShareButtons";

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

interface ReceiveTransactionComponent extends Default, FormatUri {
	size?: number, // Size of QRCode
	disabled?: boolean // Disable the Copy/Share buttons
}
const _ReceiveTransaction = ({ selectedCrypto = "bitcoin", address = "", amount = 0, label = "", size = 200, disabled = false }: ReceiveTransactionComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());

	let uri = "";
	try {uri = formatUri({selectedCrypto, address, amount, label});} catch (e) {}
	
	if (!address) return <View />;
	
	let shareTitle = "My Address.";
	try {shareTitle = `My ${capitalize(selectedCrypto)} Address.`;} catch(e) {}
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
			<ShareButtons
				text={address}
				shareMessage={address}
				shareTitle={shareTitle}
				shareDialogTitle={shareTitle}
				onCopySuccessText="Address Copied!"
				disabled={disabled}
			/>
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
