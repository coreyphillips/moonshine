import React, { useEffect, memo } from "react";
import {
	StyleSheet,
	View,
	LayoutAnimation,
	Platform
} from "react-native";
import { systemWeights } from "react-native-typography";
import {
	TouchableOpacity,
	TouchableHighlight,
	EvilIcon,
	Text
} from "../styles/components";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const ROW_HEIGHT = 32;

interface CameraComponent {
	onSendPress: Function,
	onReceivePress: Function,
	onCameraPress: Function,
	style?: object
}
const _CameraRow = ({ onSendPress = () => null, onReceivePress = () => null, onCameraPress = () => null, style = {} }: CameraComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const _onSendPress = () => onSendPress();
	const _onCameraPress = () => onCameraPress();
	const _onReceivePress = () => onReceivePress();
	return (
		<View style={[styles.container, style]}>
			<TouchableOpacity type="button" onPress={_onSendPress} style={styles.leftItem}>
				<Text type="text" style={styles.text}>Send</Text>
			</TouchableOpacity>
			<View style={styles.centerItem}>
				<TouchableHighlight type="background" onPress={_onCameraPress} underlayColor={colors.gray} style={styles.cameraIcon}>
					<EvilIcon style={{ bottom: -1.5, left: 0.3 }} name={"camera"} size={40} />
				</TouchableHighlight>
			</View>
			<TouchableOpacity type="button" onPress={_onReceivePress} style={styles.rightItem}>
				<Text type="text" style={styles.text}>Receive</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems:"center",
	},
	leftItem: {
		flex: 1,
		alignItems:"center",
		justifyContent:"center",
		paddingVertical: 5,
		borderWidth: 1,
		borderRadius: 50,
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		height: ROW_HEIGHT,
		right: -20
	},
	centerItem: {
		zIndex: 10,
		alignItems:"center",
		justifyContent:"center"
	},
	cameraIcon: {
		alignItems:"center",
		justifyContent:"center",
		width:ROW_HEIGHT * 2,
		height:ROW_HEIGHT * 2,
		borderRadius:100,
		borderWidth: 1
	},
	rightItem: {
		flex: 1,
		zIndex: 0,
		alignItems:"center",
		justifyContent:"center",
		paddingVertical: 5,
		borderWidth: 1,
		borderRadius: 50,
		borderTopLeftRadius: 0,
		borderBottomLeftRadius: 0,
		height: ROW_HEIGHT,
		right: 20
	},
	text: {
		...systemWeights.bold,
		color: colors.white,
		fontSize: 14,
		textAlign: "center"
	}
});

//ComponentShouldNotUpdate
const CameraRow = memo(
	_CameraRow,
	() => true
);

module.exports = CameraRow;
