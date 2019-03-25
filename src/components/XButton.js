import React, { PureComponent } from "react";
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

class XButton extends PureComponent {

	constructor(props) {
		super(props);

		let size = 30;
		try {
			size = props.size*1.4
		} catch (e) {size = 20*1.4;}

		this.state = {
			size
		};
	}

	render() {
		return (
			<TouchableOpacity onPress={this.props.onPress} style={[styles.container, { height: this.state.size, width: this.state.size, ...this.props.style }]}>
				<View style={[styles.circle, { height: this.state.size, width: this.state.size }]}>
					<Text style={styles.text}>X</Text>
				</View>
			</TouchableOpacity>
		);
	}
}

// Default values for props
XButton.defaultProps = {
	onPress: () => null,
	size: 30,
	style: {}
};

XButton.propTypes = {
	onPress: PropTypes.func.isRequired,
	size: PropTypes.number,
	style: PropTypes.object
};


const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 100,
		//borderColor: colors.white,
		//borderWidth: 2
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


module.exports = XButton;