import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	Animated,
	View,
	Image
} from "react-native";
import PropTypes from "prop-types";
import * as Progress from "react-native-progress";
import { systemWeights } from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import LottieView from "lottie-react-native";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	availableCoins,
	getCoinImage
} = require("../utils/networks");

const getAnimation = (name = "book") => {
	try {
		switch (name) {
			case "book":
				return require(`../assets/lottie/loading_book.json`);
			case "loader":
				return require(`../assets/lottie/snap_loader_white.json`);
			case "bitcoinMoon":
				return require(`../assets/lottie/bitcoin_to_the_moon.json`);
			case "rocket":
				return require(`../assets/lottie/bms-rocket.json`);
			case "cloudBook":
				return require(`../assets/lottie/downloading_book.json`);
			case "threeCircleLoader":
				return require(`../assets/lottie/strategy_shape`);
			case "coins":
				return require(`../assets/lottie/coins`);
			case "astronaut":
				return require(`../assets/lottie/astronaut`);
			case "dino":
				return require(`../assets/lottie/dino`);
			default:
				return getCoinImage(name); //Assume the requested image is a coin
		}
	} catch (e) {
		return require(`../assets/lottie/snap_loader_white.json`);
	}
};
//const { width, height } = Dimensions.get("window");

class Loading extends PureComponent {

	Icon() {
		const animationName = this.props.animationName;
		if (availableCoins.includes(animationName)) {
			return (
				<Image
					style={{width: 100, height: 100, marginBottom: 40}}
					source={getAnimation(animationName)}
				/>
			);
		}
		return (
			<LottieView
				source={getAnimation(animationName)}
				autoPlay={true}
				loop={true}
				style={{ width: 150, height: 150, marginBottom: 10 }}
			/>
		);
	}

	render() {
		return (
			<Animated.View style={[styles.container, { ...this.props.style }]}>
				<Animated.View style={[styles.loading, { opacity: this.props.loadingOpacity }]}>

					<View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
						{this.props.enableSpinner && !this.props.enableErrorIcon && !this.props.enableSuccessIcon &&
						this.Icon()}
						{this.props.enableSuccessIcon &&
						<EvilIcon name={"check"} size={110} color={colors.white} style={{ marginBottom: 10 }} />
						}
						{this.props.enableErrorIcon &&
						<EvilIcon name={"exclamation"} size={110} color={colors.white} style={{ marginBottom: 10 }} />
						}
						{this.props.enableProgressBar &&
						<Progress.Bar height={10} animated={true} animationType={"spring"} color={colors.white} progress={this.props.loadingProgress} width={this.props.width} />}
					</View>

					<View style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", marginTop: 10 }}>
						<Text style={[styles.boldText, { ...this.props.textStyle }]}>{this.props.loadingMessage}</Text>
					</View>

				</Animated.View>
			</Animated.View>
		);
	}
}

Loading.defaultProps = {
	loadingOpacity: 0,
	loadingMessage: "Loading State",
	loadingProgress: 0,
	animationName: "",
	enableProgressBar: true,
	enableSpinner: true,
	enableErrorIcon: false,
	enableSuccessIcon: false,
	width: 200,
	style: {},
	textStyle: {}
};

Loading.protoTypes = {
	style: PropTypes.object,
	textStyle: PropTypes.object,
	loadingOpacity: PropTypes.number,
	loadingMessage: PropTypes.string,
	loadingProgress: PropTypes.number,
	animationName: PropTypes.string,
	enableProgressBar: PropTypes.bool,
	enableSpinner: PropTypes.bool,
	enableErrorIcon: PropTypes.bool,
	enableSuccessIcon: PropTypes.bool,
	width: PropTypes.number,
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 0,
		bottom: 50,
		left: 0,
		right: 0,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		paddingHorizontal: 20,
		zIndex: 200
	},
	loading: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	boldText: {
		...systemWeights.semibold,
		color: colors.white,
		fontSize: 20,
		textAlign: "center",
		marginVertical: 20,
		marginHorizontal: 30
	}
});


module.exports = Loading;