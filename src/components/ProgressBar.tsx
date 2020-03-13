import React, {useEffect, memo} from "react";
import {Animated, StyleSheet, View, LayoutAnimation, Platform} from "react-native";
import PropTypes from "prop-types";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const BORDER_RADIUS = 20;

interface ProgressBarComponent {
	progress: number,
	height: number,
	width: number,
	color?: string,
	style?: object
}

const _ProgressBar = ({ progress = 0, height = 0, width = 0, color = colors.white, style = {} }: ProgressBarComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	return (
		<View style={[styles.container, { height, width, borderLeftColor: progress <= 0 ? "transparent" : color, borderRightColor: progress >= 1 ? color : "transparent" }, style]}>
			<Animated.View
				style={[styles.progress,
					{
						width: `${progress*100}%`,
						backgroundColor: color,
						borderTopRightRadius: progress < 1 ? 0 : BORDER_RADIUS,
						borderBottomRightRadius: progress < 1 ? 0 : BORDER_RADIUS
					}]
				}
			/>
			<View style={styles.absoluteCenter}>
				<View style={[styles.progressReference, { height: height/4, backgroundColor: color, width }]} />
			</View>
		</View>
	);
};

_ProgressBar.protoTypes = {
	progress: PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	color: PropTypes.string,
	style: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
		borderRadius: BORDER_RADIUS,
		borderColor: "transparent"
	},
	progress: {
		flex: 1,
		borderTopLeftRadius: BORDER_RADIUS,
		borderBottomLeftRadius: BORDER_RADIUS
	},
	progressReference: {
		position: "absolute",
		opacity: 0.2
	},
	absoluteCenter: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center"
	}
});

//ComponentShouldNotUpdate
const ProgressBar = memo(
	_ProgressBar,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);

export default ProgressBar;
