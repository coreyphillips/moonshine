import React, {memo, useState} from 'react';
import {Animated, StyleSheet, TextInput, View, Text, Easing} from 'react-native';
import PropTypes from "prop-types";
import XButton from "./XButton";
import Button from "./Button";
import {systemWeights} from "react-native-typography";
import LottieView from "lottie-react-native";

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
	verifyMessageData?: {
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
	const [data, setData] = useState({ ...verifyMessageData, isValid: false });
	const [animationOpacity] = useState(new Animated.Value(0));
	
	const getAnimation = () => {
		try {
			if (data.isValid) {
				return require(`../assets/lottie/correct.json`);
			} else {
				return require(`../assets/lottie/incorrect.json`);
			}
		} catch (e) {
			return require(`../assets/lottie/incorrect.json`);
		}
	};
	
	const _verifyMessage = () => {
		const isValid = verifyMessage({ ...data, selectedCrypto });
		setData({ ...data, isValid });
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
					
					<Text style={styles.text}>Address:</Text>
					<TextInput
						placeholder="Address"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (address) => {
							await setData({ ...data, address });
							updateSettings({ verifyMessage: data });
						}}
						value={data.address}
						multiline={false}
						returnKeyType="next"
						onSubmitEditing={() => {
							// @ts-ignore
							this.secondTextInput.focus(); }}
						blurOnSubmit={false}
					/>
					
					<Text style={styles.text}>Message:</Text>
					<TextInput
						placeholder="Message"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (message) => {
							await setData({ ...data, message });
							updateSettings({ verifyMessage: data });
						}}
						value={data.message}
						multiline={true}
						ref={(input) => {
							// @ts-ignore
							this.secondTextInput = input;
						}}
					/>
					
					<Text style={styles.text}>Signature:</Text>
					<TextInput
						placeholder="Signature"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						autoCompleteType="off"
						autoCorrect={false}
						onChangeText={async (signature) => {
							await setData({ ...data, signature });
							updateSettings({ verifyMessage: data });
						}}
						value={data.signature}
						multiline={true}
					/>
					
					<Animated.View style={[styles.animation, {opacity: animationOpacity}]}>
						<Text style={styles.text}>{data.isValid ? "Valid Signature!" : "Invalid Signature"}</Text>
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
					<Button title="Verify Message" onPress={_verifyMessage} disabled={!data.address || !data.message || !data.signature}/>
				</Animated.View>
				
			</View>
			
			<Animated.View style={styles.xButton}>
				<XButton style={{borderColor: "transparent"}} onPress={onBack}/>
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
	}),
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
		backgroundColor: colors.white,
		borderRadius: 8,
		padding: 10,
		paddingTop: 11,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		color: colors.purple,
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
		color: colors.white,
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
		return true;
	}
);
export default VerifyMessage;
