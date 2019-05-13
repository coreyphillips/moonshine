import React, {PureComponent} from "react";
import {
	StyleSheet,
	Text,
	View,
	Share,
	Clipboard,
	Animated
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

formatUri = ({ coin = "bitcoin", address = "" } = {}) => {
	try {
		//return `${coin}:${address}?amount=${amount.toString()}&label=${label}`;
		return `${coin}:${address}`;
	} catch (e) {console.log(e);}
};

onSharePress = (address = "", selectedCoin = "Bitcoin") => {
	try {
		const coin = capitalize(selectedCoin);
		Share.share({
			message: address,
			url: "google.com",
			title: `My ${coin} Address.`
		}, {
			// Android only:
			dialogTitle: `My ${coin} Address.`
		});
	} catch (e) {
		console.log(e);
	}
};

class ReceiveTransaction extends PureComponent {

	state = {
		addressOpacity: new Animated.Value(0)
	};

	onCopyPress = (address = "") => {
		let duration = 1500;
		try {
			Clipboard.setString(address);
			Animated.timing(
				this.state.addressOpacity,
				{
					toValue: 1,
					duration: 500,
					useNativeDriver: true
				}
			).start(async () => {
				setTimeout(() => {
					Animated.timing(
						this.state.addressOpacity,
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

	getUri = () => {
		try {
			return formatUri({coin: this.props.coin, address: this.props.address, amount: this.props.amount, label: this.props.label});
		} catch (e) {
			return "";
		}
	};

	render() {

		if (!this.props.address || !this.props.amount) return <View />;

		return (
			<View style={styles.container}>
				<View style={styles.qrCodeContainer}>
					<QRCode
						value={this.getUri()}
						size={this.props.size}
						backgroundColor={colors.white}
						color={colors.purple}
					/>
				</View>
				<View style={styles.textContainer}>
					<Text style={styles.text}>{this.props.address}</Text>
					<Animated.View style={[styles.copiedContainer, {opacity: this.state.addressOpacity}]}>
						<LinearGradient style={{ flex: 1 }} colors={[ "#6c2c9e", "#68299a", "#662798", "#632596", "#5e2191"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}>
							<View style={styles.copied}>
								<Text style={styles.copiedText}>Address Copied!</Text>
							</View>
						</LinearGradient>
					</Animated.View>

				</View>
				<View style={styles.row}>
					<Button style={styles.button} text="Share" onPress={() => onSharePress(this.props.address, this.props.coin)} disabled={this.props.disabled} />
					<View style={{marginHorizontal: 5}} />
					<Button style={styles.button} text="Copy" onPress={() => this.onCopyPress(this.props.address)} disabled={this.props.disabled} />
				</View>
			</View>
		);
	}
}

ReceiveTransaction.defaultProps = {
	coin: "bitcoin",
	address: "",
	amount: 0,
	label: "",
	size: 200
};

ReceiveTransaction.propTypes = {
	coin: PropTypes.string.isRequired,
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


module.exports = ReceiveTransaction;