import React, { useState, memo } from "react";
import {
	StyleSheet,
	Text,
	View,
	Animated,
	Clipboard, Share,
	Easing
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import LinearGradient from "react-native-linear-gradient";
import Button from "./Button";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface ShareButtonsComponent {
	text: string,
	shareMessage?: string,
	shareUrl?: string,
	shareTitle?: string,
	shareDialogTitle?: string, //Android Only
	onCopySuccessText?: string,
	disabled?: boolean,
	textContainerStyle?: object
}
const _ShareButtons = (
	{
		text = "",
		shareMessage = "",
		shareUrl = "google.com",
		shareTitle = "",
		shareDialogTitle = "", //Android Only
		onCopySuccessText = "Copied!",
		disabled = false,
		textContainerStyle = {}
	}: ShareButtonsComponent) => {
	const [textOpacity] = useState(new Animated.Value(0));
	
	const onSharePress = (): void => {
		try {
			Share.share({
				message: shareMessage,
				url: shareUrl,
				title: shareTitle
			}, {
				dialogTitle: shareDialogTitle // Android only
			});
		} catch (e) {
			console.log(e);
		}
	};
	
	const onCopyPress = () => {
		let duration = 1500;
		try {
			Clipboard.setString(text);
			Animated.timing(
				textOpacity,
				{
					toValue: 1,
					duration: 500,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true
				}
			).start(async () => {
				setTimeout(() => {
					Animated.timing(
						textOpacity,
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
			alert("Unable to copy item to clipboard. Please try again or check your phone's permissions.");
		}
	};
	
	return (
		<View>
			<View style={[styles.textContainer, textContainerStyle ]}>
				<Text style={styles.text}>{text}</Text>
				<Animated.View style={[styles.copiedContainer, textContainerStyle, {opacity: textOpacity}]}>
					<LinearGradient style={[textContainerStyle, { flex: 1 }]} colors={[ "#6c2c9e", "#68299a", "#662798", "#632596", "#5e2191"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
						<View style={styles.copied}>
							<Text style={styles.copiedText}>{onCopySuccessText}</Text>
						</View>
					</LinearGradient>
				</Animated.View>
			
			</View>
			<View style={styles.row}>
				<Button style={styles.button} text="Share" onPress={onSharePress} disabled={!text || disabled} />
				<View style={{marginHorizontal: 5}} />
				<Button style={styles.button} text="Copy" onPress={onCopyPress} disabled={!text || disabled} />
			</View>
		</View>
	);
};

_ShareButtons.propTypes = {
	text: PropTypes.string.isRequired,
	shareMessage: PropTypes.string,
	shareUrl: PropTypes.string,
	shareTitle: PropTypes.string,
	shareDialogTitle: PropTypes.string,
	onCopySuccessText: PropTypes.string,
	disabled: PropTypes.bool
};

const styles = StyleSheet.create({
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
});

//ComponentShouldNotUpdate
const ShareButtons = memo(
	_ShareButtons,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default ShareButtons;
