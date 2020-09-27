import React, {memo, useState} from 'react';
import {Animated, StyleSheet, View, Easing} from 'react-native';
import PropTypes from "prop-types";
import XButton from "./XButton";
import Button from "./Button";
import {systemWeights} from "react-native-typography";
import LottieView from "lottie-react-native";
import { Text, TextInput } from "../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	verifyMessage
} = require("../utils/helpers");

interface ImportPhraseComponent {
	onBack: Function,
	verifyMessageData: {
		address: string,
		message: string,
		signature: string,
	},
	selectedCrypto: string,
	updateSettings: Function
}
const _VerifyMessage = (
	{
		onBack = () => null,
		verifyMessageData = {
			address: "",
			message: "",
			signature: "",
		},
		selectedCrypto = "bitcoin",
		updateSettings = () => null
	}: ImportPhraseComponent) => {
	const [dataIsValid, setDataIsValid] = useState(false);
	const [animationOpacity] = useState(new Animated.Value(0));

	const getAnimation = () => {
		try {
			if (dataIsValid) {
				return require(`../assets/lottie/correct.json`);
			} else {
				return require(`../assets/lottie/incorrect.json`);
			}
		} catch (e) {
			return require(`../assets/lottie/incorrect.json`);
		}
	};

	const _verifyMessage = () => {
		const isValid = verifyMessage({ ...verifyMessageData, selectedCrypto });
		setDataIsValid(isValid);
		Animated.timing(
			animationOpacity,
			{
				toValue: 1,
				duration: 250,
				easing: Easing.inOut(Easing.ease),
				useNativeDriver: true
			}
		).start(() => {
			// @ts-ignore
			this.animation.play();
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>
				<View style={styles.textInputContainer}>

					<Text type="white" style={styles.text}>Address:</Text>
					<TextInput
						placeholder="Address"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (address) => updateSettings({ verifyMessage: { ...verifyMessageData, address }})}
						value={verifyMessageData.address}
						multiline={false}
						returnKeyType="next"
						onSubmitEditing={() => {
							// @ts-ignore
							this.secondTextInput.focus(); }}
						blurOnSubmit={false}
					/>

					<Text type="white" style={styles.text}>Message:</Text>
					<TextInput
						placeholder="Message"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (message) => updateSettings({ verifyMessage: { ...verifyMessageData, message }})}
						value={verifyMessageData.message}
						multiline={true}
						ref={(input) => {
							// @ts-ignore
							this.secondTextInput = input;
						}}
					/>

					<Text type="white" style={styles.text}>Signature:</Text>
					<TextInput
						placeholder="Signature"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (signature) => updateSettings({ verifyMessage: { ...verifyMessageData, signature } })}
						value={verifyMessageData.signature}
						multiline={true}
					/>

					<Animated.View style={[styles.animation, {opacity: animationOpacity}]}>
						<Text type="white" style={styles.text}>{dataIsValid ? "Valid Signature!" : "Invalid Signature"}</Text>
						<LottieView
							ref={animation => {
								// @ts-ignore
								this.animation = animation;
							}}
							source={getAnimation()}
							autoPlay={false}
							loop={false}
							style={{ width: 100, height: 100 }}
						/>
					</Animated.View>
				</View>

				<View style={{ paddingVertical: 10 }} />
				<Animated.View style={styles.sendButton}>
					<Button title="Verify Message" onPress={_verifyMessage} disabled={!verifyMessageData.address || !verifyMessageData.message || !verifyMessageData.signature} />
				</Animated.View>

			</View>

			<Animated.View style={styles.xButton}>
				<XButton style={{borderColor: "transparent"}} onPress={onBack} />
			</Animated.View>
		</View>
	);
};

_VerifyMessage.propTypes = {
	onBack: PropTypes.func.isRequired,
	selectedCrypto: PropTypes.string.isRequired,
	verifyMessageData: PropTypes.shape({
		address: PropTypes.string.isRequired,
		message: PropTypes.string.isRequired,
		signature: PropTypes.string.isRequired
	}).isRequired,
	updateSettings: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		position: "absolute",
		alignItems: "center",
		top: 20,
		left: 0,
		right: 0
	},
	textInputContainer: {
		flex: 1,
		width: "80%",
		alignItems: "center"
	},
	textInput: {
		width: "100%",
		minHeight: 0,
		maxHeight: 150,
		borderRadius: 8,
		padding: 10,
		paddingTop: 11,
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
	text: {
		...systemWeights.semibold,
		textAlign: "left",
		backgroundColor: "transparent",
		fontSize: 18,
		marginTop: 10,
		marginBottom: 2
	},
	animation: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 20
	}
});

//ComponentShouldNotUpdate
const VerifyMessage = memo(
	_VerifyMessage,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		try {
			return prevProps.verifyMessageData.address === nextProps.verifyMessageData.address &&
				prevProps.verifyMessageData.message === nextProps.verifyMessageData.message &&
				prevProps.verifyMessageData.signature === nextProps.verifyMessageData.signature;
		} catch { return false; }
	}
);
export default VerifyMessage;
