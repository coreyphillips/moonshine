import React, {memo, useState} from 'react';
import {Animated, StyleSheet, TextInput, TouchableOpacity, View, Text} from 'react-native';
import PropTypes from "prop-types";
import XButton from "./XButton";
import Button from "./Button";
import ShareButtons from "./ShareButtons";
import {systemWeights} from "react-native-typography";
import DefaultModal from "./DefaultModal";

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
	}]
}
const _SignMessage = (
	{
		onBack = () => null,
		selectedCrypto = "bitcoin",
		selectedWallet = "wallet0",
		derivationPath = "84",
		addressType = "bech32", //bech32, segwit or legacy
		addresses = [{ address: "", path: "" }]
	}: ImportPhraseComponent) => {
	
	const [message, setMessage] = useState("");
	const [signature, useSignature] = useState("");
	const [signatureOpacity] = useState(new Animated.Value(0));
	const [selectedAddressIndex, useSelectedAddressIndex] = useState(0);
	const [displayAddressModal, useDisplayAddressModal] = useState(false);
	
	const _signMessage = async () => {
		try {
			const signMessageResponse = await signMessage(
				{
					message,
					addressType,
					path: addresses[selectedAddressIndex].path,
					selectedWallet,
					selectedCrypto
				});
			if (!signMessageResponse.error) {
				useSignature(signMessageResponse.data.signature);
				Animated.timing(
					signatureOpacity,
					{
						toValue: 1,
						duration: 500,
						useNativeDriver: true
					}
				).start();
			}
			console.log(signMessageResponse);
		} catch (e) {}
	};
	
	let shareTitle = "My Signature.";
	try {shareTitle = `My ${capitalize(selectedCrypto)} Signature.`;} catch(e) {}
	let shareMessage = `Address: ${addresses[selectedAddressIndex].address}\n\n Message: ${message}\n\n Signature: ${signature}`;
	
	let path = getBaseDerivationPath({ keyDerivationPath: derivationPath, selectedCrypto });
	try {path = addresses[selectedAddressIndex].path} catch (e) {}
	
	let shortendAddress = "";
	try {
		const address = addresses[selectedAddressIndex].address;
		const addressLength = address.length;
		shortendAddress = `${address.substr(0,10)}...${address.substr(addressLength-10,addressLength)}`;
	} catch (e) {}
	
	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>
				
				<View style={{ flex: 1, width: "80%", alignItems: "center" }}>
					<View style={{ paddingVertical: 10 }} />
					<Text style={styles.header}>Sign message using:</Text>
					<View style={{ paddingVertical: 2.5 }} />
					<TouchableOpacity
						onPress={() => useDisplayAddressModal(true)}
						style={styles.pathButton}
					>
						<Text style={styles.text}>{path}</Text>
						<Text style={styles.text}>{shortendAddress}</Text>
					</TouchableOpacity>
				</View>
				
				<View style={{ flex: 1, width: "80%" }}>
					<View style={{ paddingVertical: 15 }} />
					<Text style={styles.header}>Message:</Text>
					<View style={{ paddingVertical: 2.5 }} />
				</View>
				<TextInput
					placeholder="Please enter the message that you wish to sign here..."
					style={styles.textInput}
					selectionColor={colors.lightPurple}
					autoCapitalize="none"
					onChangeText={(message) => setMessage(message)}
					value={message}
					multiline={true}
				/>
				
				<Animated.View style={{ opacity: signatureOpacity, flex: 1, width: "80%" }}>
					<View style={{ paddingVertical: 15 }} />
					<Text style={styles.header}>Signature:</Text>
					<View style={{ paddingVertical: 2.5 }} />
					<ShareButtons
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
					<Button title="Sign Message" onPress={_signMessage} disabled={!message}/>
				</Animated.View>
			</View>
			
			<Animated.View style={styles.xButton}>
				<XButton style={{borderColor: "transparent"}} onPress={onBack}/>
			</Animated.View>
			
			<DefaultModal
				isVisible={displayAddressModal}
				onClose={() => useDisplayAddressModal(false)}
				contentStyle={styles.modalContent}
			>
				{addresses.map(({ address, path }, i) => (
					<TouchableOpacity
						key={`${address}${i}`}
						style={styles.pathRow}
						onPress={() => {
							useSelectedAddressIndex(i);
							useDisplayAddressModal(false)
						}}
					>
						<Text style={[styles.header, { color: colors.purple, textAlign: "left" }]}>{path}</Text>
						<Text style={[styles.text, { color: colors.purple, textAlign: "left" }]}>{address}</Text>
					</TouchableOpacity>
				))}
				<View style={{ paddingVertical: "40%" }} />
			</DefaultModal>
		</View>
	);
};

_SignMessage.propTypes = {
	onBack: PropTypes.func.isRequired
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
		backgroundColor: colors.white,
		borderRadius: 10,
		padding: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		color: colors.purple,
		fontWeight: "bold"
	},
	centerItem: {
		zIndex: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 10
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
		color: colors.white,
		textAlign: "center",
		backgroundColor: "transparent",
		fontSize: 18,
		fontWeight: "bold"
	},
	text: {
		...systemWeights.thin,
		color: colors.white,
		textAlign: "center",
		backgroundColor: "transparent",
		fontSize: 16
	},
	modalContent: {
		borderWidth: 5,
		borderRadius: 20,
		borderColor: colors.lightGray
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
		marginBottom: 10,
		borderBottomColor: colors.gray,
		borderBottomWidth: 2
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
