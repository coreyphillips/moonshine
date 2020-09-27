import React, {memo, useState} from 'react';
import {Animated, StyleSheet, TouchableOpacity, View, Easing} from 'react-native';
import PropTypes from "prop-types";
import XButton from "./XButton";
import Button from "./Button";
import ShareButtons from "./ShareButtons";
import {systemWeights} from "react-native-typography";
import DefaultModal from "./DefaultModal";
import { Text, TextInput } from "../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	capitalize,
	signMessage,
	getBaseDerivationPath
} = require("../utils/helpers");

interface ImportPhraseComponent {
	onBack: Function,
	selectedCrypto: string,
	selectedWallet: string,
	derivationPath: string,
	addressType: string,
	addresses: [{
		address: string,
		path: string
	}],
	signMessageData?: {
		message: string,
		signature: string,
		selectedAddressIndex: number
	},
	updateSettings: Function
}
const _SignMessage = (
	{
		onBack = () => null,
		selectedCrypto = "bitcoin",
		selectedWallet = "wallet0",
		derivationPath = "84",
		addressType = "bech32", //bech32, segwit or legacy
		addresses = [{ address: "", path: "" }],
		signMessageData = {
			message: "",
			signature: "",
			selectedAddressIndex: 0
		},
		updateSettings = () => null
	}: ImportPhraseComponent) => {

	const [signature, setSignature] = useState(signMessageData.signature);
	const [signatureOpacity] = useState(new Animated.Value(0));
	const [displayAddressModal, setDisplayAddressModal] = useState(false);

	const _signMessage = async () => {
		try {
			const signMessageResponse = await signMessage(
				{
					message: signMessageData.message,
					addressType,
					path: addresses[signMessageData.selectedAddressIndex].path,
					selectedWallet,
					selectedCrypto
				});
			if (!signMessageResponse.error) {
				updateSettings({ signMessage: { message: signMessageData.message, signature: signMessageResponse.data.signature, selectedAddressIndex: signMessageData.selectedAddressIndex } });
				setSignature(signMessageResponse.data.signature);
				Animated.timing(
					signatureOpacity,
					{
						toValue: 1,
						duration: 500,
						easing: Easing.inOut(Easing.ease),
						useNativeDriver: true
					}
				).start();
			}
			if (__DEV__) console.log(signMessageResponse);
		} catch (e) {}
	};

	let shareTitle = "My Signature.";
	try {shareTitle = `My ${capitalize(selectedCrypto)} Signature.`;} catch(e) {}
	let shareMessage = `Address: ${addresses[signMessageData.selectedAddressIndex].address}\n\n Message: ${signMessageData.message}\n\n Signature: ${signature}`;

	let path = getBaseDerivationPath({ keyDerivationPath: derivationPath, selectedCrypto });
	try {path = addresses[signMessageData.selectedAddressIndex].path;} catch (e) {}

	let shortendAddress = "";
	try {
		const address = addresses[signMessageData.selectedAddressIndex].address;
		const addressLength = address.length;
		shortendAddress = `${address.substr(0,10)}...${address.substr(addressLength-10,addressLength)}`;
	} catch (e) {}

	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>

				<View style={{ flex: 1, width: "80%", alignItems: "center" }}>
					<View style={{ paddingVertical: 10 }} />
					<Text type="white" style={styles.header}>Sign message using:</Text>
					<View style={{ paddingVertical: 2.5 }} />
					<TouchableOpacity
						onPress={() => setDisplayAddressModal(true)}
						style={styles.pathButton}
					>
						<Text type="white" style={styles.text}>{path}</Text>
						<Text type="white" style={styles.text}>{shortendAddress}</Text>
					</TouchableOpacity>
				</View>

				<View style={{ flex: 1, width: "80%" }}>
					<View style={{ paddingVertical: 15 }} />
					<Text type="white" style={styles.header}>Message:</Text>
					<View style={{ paddingVertical: 2.5 }} />
				</View>
				<TextInput
					placeholder="Please enter the message that you wish to sign here..."
					style={styles.textInput}
					selectionColor={colors.lightPurple}
					autoCapitalize="none"
					autoCompleteType="off"
					autoCorrect={false}
					onChangeText={(message) => updateSettings({ signMessage: { ...signMessageData, message }})}
					value={signMessageData.message}
					multiline={true}
				/>

				<Animated.View style={{ opacity: signatureOpacity, flex: 1, width: "80%" }}>
					<View style={{ paddingVertical: 15 }} />
					<Text type="white" style={styles.header}>Signature:</Text>
					<View style={{ paddingVertical: 2.5 }} />
					<ShareButtons
						textContainerStyle={{ borderRadius: 10 }}
						text={signature}
						shareMessage={shareMessage}
						shareTitle={shareTitle}
						shareDialogTitle={shareTitle}
						onCopySuccessText="Signature Copied!"
						disabled={!signature}
					/>
				</Animated.View>

				<View style={{ paddingVertical: 10 }} />
				<Animated.View style={styles.sendButton}>
					<Button title="Sign Message" onPress={_signMessage} disabled={!signMessageData.message} />
				</Animated.View>
			</View>

			<Animated.View style={styles.xButton}>
				<XButton style={{borderColor: "transparent"}} onPress={onBack} />
			</Animated.View>

			<DefaultModal
				isVisible={displayAddressModal}
				onClose={() => setDisplayAddressModal(false)}
			>
				{addresses.map(({ address, path }, i) => (
					<TouchableOpacity
						key={`${address}${i}`}
						style={styles.pathRow}
						onPress={() => {
							updateSettings({ signMessage: { ...signMessageData, selectedAddressIndex: i } });
							setDisplayAddressModal(false);
						}}
					>
						<Text style={[styles.header, { textAlign: "left" }]}>{path}</Text>
						<Text style={[styles.text, { textAlign: "left" }]}>{address}</Text>
					</TouchableOpacity>
				))}
			</DefaultModal>
		</View>
	);
};

_SignMessage.propTypes = {
	onBack: PropTypes.func.isRequired,
	selectedCrypto: PropTypes.string.isRequired,
	selectedWallet: PropTypes.string.isRequired,
	derivationPath: PropTypes.string.isRequired,
	addressType: PropTypes.string.isRequired,
	addresses: PropTypes.array.isRequired,
	signMessageData: PropTypes.shape({
		message: PropTypes.string.isRequired,
		signature: PropTypes.string.isRequired,
		selectedAddressIndex: PropTypes.number.isRequired
	}),
	updateSettings: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	contentContainer: {
		position: "absolute",
		alignItems: "center",
		top: 20,
		left: 0,
		right: 0
	},
	textInput: {
		width: "80%",
		minHeight: 50,
		maxHeight: 150,
		borderRadius: 10,
		padding: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: "bold"
	},
	sendButton: {
		alignItems: "center",
		justifyContent: "center",
		bottom: "-5%"
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
	},
	header: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent",
		fontSize: 18,
		fontWeight: "bold"
	},
	text: {
		...systemWeights.semibold,
		textAlign: "center",
		backgroundColor: "transparent",
		fontSize: 16
	},
	pathButton: {
		borderWidth: 1.5,
		borderRadius: 15,
		borderColor: colors.white,
		paddingVertical: 4,
		paddingHorizontal: 6,
		width: "80%"
	},
	pathRow: {
		alignItems: "flex-start",
		borderBottomColor: colors.gray,
		borderBottomWidth: 2,
		paddingVertical: 10
	}
});

//ComponentShouldNotUpdate
const SignMessage = memo(
	_SignMessage,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);
export default SignMessage;
