import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity
} from "react-native";
import { systemWeights } from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

retryAuthentication = (retryAuthentication = null) => {
	if (retryAuthentication === null) return;
	return (
		<Text style={styles.smallText}>Retry</Text>
	);
};

getIcon = (biometricTypeSupported = "", retryAuthentication = null) => {
	try {
		if (biometricTypeSupported === "FaceID") {
			return (
				<TouchableOpacity activeOpacity={1} onPress={retryAuthentication} style={styles.container}>
					<MaterialCommunityIcons name={"face"} size={65} color={colors.white} />
					<Text style={styles.text}>
						FaceID Enabled
					</Text>
					{this.retryAuthentication(retryAuthentication)}
				</TouchableOpacity>
			);
		}
		if (biometricTypeSupported === "TouchID") {
			return (
				<TouchableOpacity activeOpacity={1} onPress={retryAuthentication} style={styles.container}>
					<Ionicons name={"ios-finger-print"} size={65} color={colors.white} />
					<Text style={styles.text}>
						TouchID Enabled
					</Text>
					{this.retryAuthentication(retryAuthentication)}
				</TouchableOpacity>
			);
		}
		return(
			<TouchableOpacity activeOpacity={1} onPress={retryAuthentication} style={styles.container}>
				<Ionicons name={"ios-finger-print"} size={65} color={colors.white} />
				<Text style={styles.text}>
					It appears that your device does not support Biometric security.
				</Text>
				{this.retryAuthentication(retryAuthentication)}
			</TouchableOpacity>
		);
	} catch (e) {
		return(
			<View style={styles.container}>
				<Ionicons name={"ios-finger-print"} size={65} color={colors.white} />
				<Text style={styles.text}>
					It appears that your device does not support Biometric security.
				</Text>
			</View>
		);
	}
};

class Biometrics extends PureComponent {
	render() {
		const { style, biometricTypeSupported, retryAuthentication } = this.props;
		return (
			<View style={[styles.container, { ...style }]}>
				{getIcon(biometricTypeSupported, retryAuthentication)}
			</View>
		);
	}
}

Biometrics.defaultProps = {
	style: {},
	biometricTypeSupported: "",
	retryAuthentication: null
};

Biometrics.protoTypes = {
	style: PropTypes.object,
	biometricTypeSupported: PropTypes.bool.isRequired,
	retryAuthentication: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center"
	},
	text: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 18,
		textAlign: "center",
		marginHorizontal: 20
	},
	smallText: {
		...systemWeights.light,
		color: colors.white,
		fontSize: 16,
		textAlign: "center",
		marginHorizontal: 20,
		marginTop: 5
	}
});


module.exports = Biometrics;