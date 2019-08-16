import React, { memo } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	ActivityIndicator
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface ButtonComponent {
	title?: string,
	onPress: Function,
	text?: string,
	activeOpacity?: number,
	text2?: string,
	loading?: boolean,
	disabled?: boolean,
	style?: object,
	titleStyle?: object,
	textStyle?: object
}
const _Button = ({ title = "", onPress = () => null, text = "", activeOpacity = 0, text2 = "", loading = false, disabled = false, style = {}, titleStyle = {}, textStyle = {} }: ButtonComponent) => {
	const _handleOnPress = () => {
		if (!disabled || !loading) onPress();
	};
	return (
		<TouchableOpacity style={[styles.container, { ...style }]} onPress={_handleOnPress} activeOpacity={activeOpacity} disabled={disabled || loading}>
			{loading &&
			<ActivityIndicator size="small" color={colors.white} />
			}
			{title !== "" && !loading &&
			<Text style={[styles.title, { ...titleStyle }]}>{title}</Text>
			}
			{text !== "" && !loading &&
			<Text style={[styles.text, {...textStyle}]}>{text}</Text>
			}
			{text2 !== "" && !loading &&
			<Text style={[styles.text, {...textStyle}]}>{text2}</Text>
			}
		</TouchableOpacity>
	);
};

_Button.propTypes = {
	title: PropTypes.string,
	text: PropTypes.string,
	text2: PropTypes.string,
	onPress: PropTypes.func.isRequired,
	disabled: PropTypes.bool,
	activeOpacity: PropTypes.number,
	loading: PropTypes.bool,
	style: PropTypes.object,
	titleStyle: PropTypes.object,
	textStyle: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#813fb1",
		borderWidth: 2,
		borderRadius: 10,
		paddingHorizontal: 15,
		paddingVertical: 12,
		borderColor: colors.white,
		alignItems: "center",
		justifyContent: "center",
		minWidth: "40%"
	},
	title: {
		...systemWeights.bold,
		color: colors.white,
		fontSize: 20,
		textAlign: "center"
	},
	text: {
		...systemWeights.light,
		color: colors.white,
		fontSize: 18,
		textAlign: "center"
	}
});

//ComponentShouldNotUpdate
const Button = memo(
	_Button,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default Button;
