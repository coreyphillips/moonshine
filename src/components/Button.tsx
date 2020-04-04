import React, { memo } from "react";
import {
	StyleSheet
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import LinearGradient from "react-native-linear-gradient";
import {
	Text,
	TouchableOpacity,
	ActivityIndicator
} from "../styles/components";

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
	textStyle?: object,
	gradient?: boolean
}
const _Button = ({ title = "", onPress = () => null, text = "", activeOpacity = 0.6, text2 = "", loading = false, disabled = false, style = {}, titleStyle = {}, textStyle = {}, gradient = false }: ButtonComponent) => {
	const _handleOnPress = () => {
		if (!disabled || !loading) onPress();
	};
	const color = disabled ? colors.gray : colors.white;
	const opacity = disabled ? 0.4 : 1;

	if (gradient) {
		return (
			<TouchableOpacity type="transparent" onPress={_handleOnPress} activeOpacity={activeOpacity}>
				<LinearGradient
					style={[styles.container, { borderColor: color, opacity, ...style }]}
					colors={["#8e45bf", "#7931ab", "#5e1993", "#59158e"]}
					start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}
				>
					{loading &&
					<ActivityIndicator type="white" size="small" />
					}
					{title !== "" && !loading &&
					<Text type={disabled ? "gray" : "white"} style={[styles.title, titleStyle]}>{title}</Text>
					}
					{text !== "" && !loading &&
					<Text type={disabled ? "gray" : "white"} style={[styles.text, textStyle]}>{text}</Text>
					}
					{text2 !== "" && !loading &&
					<Text type={disabled ? "gray" : "white"} style={[styles.text, textStyle]}>{text2}</Text>
					}
				</LinearGradient>
			</TouchableOpacity>
		);
	} else {
		return (
			<TouchableOpacity
				type="transparent"
				borderColor={disabled ? "gray" : "white"}
				style={[styles.container, {
					opacity,
					...style
				}]}
				onPress={_handleOnPress}
				activeOpacity={activeOpacity}
				disabled={disabled || loading}
			>
				{loading &&
				<ActivityIndicator type="white" size="small" />
				}
				{title !== "" && !loading &&
				<Text type={disabled ? "gray" : "white"} style={[styles.title, titleStyle]}>{title}</Text>
				}
				{text !== "" && !loading &&
				<Text type={disabled ? "gray" : "white"} style={[styles.text, textStyle]}>{text}</Text>
				}
				{text2 !== "" && !loading &&
				<Text type={disabled ? "gray" : "white"} style={[styles.text, textStyle]}>{text2}</Text>
				}
			</TouchableOpacity>
		);
	}
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
	textStyle: PropTypes.object,
	gradient: PropTypes.bool
};

const styles = StyleSheet.create({
	container: {
		borderWidth: 1.2,
		borderRadius: 10,
		paddingHorizontal: 15,
		paddingVertical: 12,
		alignItems: "center",
		justifyContent: "center",
		minWidth: "40%"
	},
	title: {
		...systemWeights.bold,
		fontSize: 20,
		textAlign: "center"
	},
	text: {
		...systemWeights.light,
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
