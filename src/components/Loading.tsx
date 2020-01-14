import React, {useEffect, memo} from "react";
import {Animated, Image, StyleSheet, Text, View, LayoutAnimation, Platform} from "react-native";
import PropTypes from "prop-types";
import ProgressBar from "./ProgressBar";
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

const getAnimation = (name = "astronaut") => {
	try {
		switch (name) {
			case "moonshine":
				return require(`../assets/lottie/moonshine.json`);
			case "book":
				return require(`../assets/lottie/loading_book.json`);
			case "loader":
				return require(`../assets/lottie/snap_loader_white.json`);
			case "cloudBook":
				return require(`../assets/lottie/downloading_book.json`);
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

interface LoadingComponent {
	loadingOpacity: number,
	loadingMessage: string,
	loadingProgress: number,
	animationName: string,
	enableProgressBar: boolean,
	enableSpinner: boolean,
	enableErrorIcon: boolean,
	enableSuccessIcon: boolean,
	width: number,
	style: object,
	textStyle: object
}
const _Loading = ({loadingOpacity = 0, loadingMessage = "Loading State", loadingProgress = 0, animationName = "", enableProgressBar = true, enableSpinner = true, enableErrorIcon = false, enableSuccessIcon = false, width = 200, style = {}, textStyle = {}}: LoadingComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const Icon = () => {
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
				style={{ width: animationName === "moonshine" ? 180 : 150, height: animationName === "moonshine" ? 180 : 150, marginBottom: 10 }}
			/>
		);
	};
	
	return (
		<Animated.View style={[styles.container, { ...style }]}>
			<Animated.View style={[styles.loading, { opacity: loadingOpacity }]}>
				
				<View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
					{enableSpinner && !enableErrorIcon && !enableSuccessIcon &&
					Icon()}
					{enableSuccessIcon &&
					<EvilIcon name={"check"} size={110} color={colors.white} style={{ marginBottom: 10 }} />
					}
					{enableErrorIcon &&
					<EvilIcon name={"exclamation"} size={110} color={colors.white} style={{ marginBottom: 10 }} />
					}
					{enableProgressBar &&
					<ProgressBar progress={loadingProgress} height={7} width={width} />}
				</View>
				
				<View style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", marginTop: 10 }}>
					<Text style={[styles.boldText, { ...textStyle }]}>{loadingMessage}</Text>
				</View>
			
			</Animated.View>
		</Animated.View>
	);
};

_Loading.protoTypes = {
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

//ComponentShouldNotUpdate
const Loading = memo(
	_Loading,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.loadingOpacity === nextProps.loadingOpacity &&
			prevProps.loadingMessage === nextProps.loadingMessage &&
			prevProps.loadingProgress === nextProps.loadingProgress &&
			prevProps.animationName === nextProps.animationName &&
			prevProps.enableProgressBar === nextProps.enableProgressBar &&
			prevProps.enableSpinner === nextProps.enableSpinner &&
			prevProps.enableErrorIcon === nextProps.enableErrorIcon &&
			prevProps.enableSuccessIcon === nextProps.enableSuccessIcon;
	}
);

export default Loading;
