import React, { useEffect, useState, memo } from "react";
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
const _XButton = ({ onPress = () => null, size = 30, style = {} }: XButtonComponent) => {
	const [buttonSize, setButtonSize] = useState(30);
	useEffect(() => {
		let startSize = 30;
		try {
			startSize = size*1.4;
		} catch (e) {startSize = 20*1.4;}
		
		setButtonSize(startSize);
	}, []);
	
	const _onPress = () => onPress();
	
	return (
		<TouchableOpacity onPress={_onPress} style={[styles.container, { height: buttonSize, width: buttonSize, ...style }]}>
			<View style={[styles.circle, { height: buttonSize, width: buttonSize }]}>
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
	() => true
);

export default XButton;
