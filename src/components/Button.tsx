import React, { memo } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	View
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import LinearGradient from "react-native-linear-gradient";

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
	
	const ButtonContent = () => (
		<View>
			{loading &&
			<ActivityIndicator size="small" color={colors.white} />
			}
			{title !== "" && !loading &&
			<Text style={[styles.title, { color, ...titleStyle }]}>{title}</Text>
			}
			{text !== "" && !loading &&
			<Text style={[styles.text, { color, ...textStyle}]}>{text}</Text>
			}
			{text2 !== "" && !loading &&
			<Text style={[styles.text, { color, ...textStyle}]}>{text2}</Text>
			}
		</View>
	);
	
	if (gradient) {
		return (
			<TouchableOpacity onPress={_handleOnPress} activeOpacity={activeOpacity}>
				<LinearGradient
					style={[styles.container, { borderColor: color, opacity, ...style }]}
					colors={["#8e45bf", "#7931ab", "#5e1993", "#59158e"]}
					start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}
				>
					<ButtonContent />
				</LinearGradient>
			</TouchableOpacity>
		)
	} else {
		return (
			<TouchableOpacity style={[styles.container, { borderColor: color, opacity, ...style }]} onPress={_handleOnPress} activeOpacity={activeOpacity} disabled={disabled || loading}>
				<ButtonContent />
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
