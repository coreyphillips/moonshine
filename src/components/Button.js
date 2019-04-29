import React, { PureComponent } from "react";
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

class Button extends PureComponent {
	_handleOnPress = () => {
		if (!this.props.disabled || !this.props.loading) this.props.onPress();
	};
	_isDisabled = () => {
		return this.props.disabled || this.props.loading;
	};
	render() {
		const { title, text, text2, activeOpacity, loading, style, titleStyle, textStyle } = this.props;
		return (
			<TouchableOpacity style={[styles.container, { ...style }]} onPress={this._handleOnPress} activeOpacity={activeOpacity} disabled={this._isDisabled()}>
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
	}
}

Button.defaultProps = {
	title: "",
	text: "",
	text2: "",
	onPress: () => null,
	disabled: false,
	activeOpacity: 0,
	loading: false,
	style: {},
	titleStyle: {},
	textStyle: {}
};

Button.propTypes = {
	title: PropTypes.string.isRequired,
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


module.exports = Button;