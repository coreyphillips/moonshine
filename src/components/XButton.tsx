import React, { memo } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface XButtonComponent {
	onPress: Function,
	size?: number,
	style?: object
}
const _XButton = ({ onPress = () => null, size = 42, style = {} }: XButtonComponent) => {
	const _onPress = () => onPress();
	return (
		<TouchableOpacity onPress={_onPress} style={[styles.container, { height: size, width: size, ...style }]}>
			<View style={[styles.circle, { height: size, width: size }]}>
				<Text style={styles.text}>X</Text>
			</View>
		</TouchableOpacity>
	);
};

_XButton.propTypes = {
	onPress: PropTypes.func.isRequired,
	size: PropTypes.number,
	style: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 100
	},
	circle: {
		backgroundColor: colors.white,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 100,
		borderWidth: 3,
		borderColor: colors.purple
	},
	text: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	}
});

//ComponentShouldNotUpdate
const XButton = memo(
	_XButton,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);

export default XButton;
