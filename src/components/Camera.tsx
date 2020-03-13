import React, {memo, useState} from "react";
import {
	StyleSheet,
	View,
	Text
} from "react-native";
import PropTypes from "prop-types";
import { RNCamera } from 'react-native-camera';
import { systemWeights } from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import XButton from "./XButton";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface CameraComponent {
	onBarCodeRead: Function,
	onClose: Function
}
const _Camera = ({ onBarCodeRead = () => null, onClose = () => null }: CameraComponent) => {
	const [_data, setData] = useState("");
	const notAuthorizedView = (
		<View style={styles.notAuthorizedView}>
			<EvilIcon name={"exclamation"} size={60} color={colors.white} />
			<Text style={[styles.boldText, { marginVertical: 10 }]}>It appears I do not have permission to access your camera.</Text>
			<Text style={styles.text}>To utilize this feature in the future you will need to enable camera permissions for this app from your phones settings.</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<RNCamera
				captureAudio={false}
				ref={ref => {
					// @ts-ignore
					this.camera = ref;
				}}
				style={styles.container}
				onBarCodeRead={({ data }) => {
					if (_data !== data) {
						setData(data);
						onBarCodeRead(data);
					}
				}}
				onMountError={() => {
					alert("There was an error encountered when loading the camera. Please ensure the app has permission to use this feature in your phone settings.");
					onClose();
				}}
				notAuthorizedView={notAuthorizedView}
				type={RNCamera.Constants.Type.back}
				flashMode={RNCamera.Constants.FlashMode.on}
				androidCameraPermissionOptions={{
					title: "Permission to use camera",
					message: "We need your permission to use your camera",
					buttonPositive: "Okay",
					buttonNegative: "Cancel",
				}}
			/>
			<View style={styles.xButton}>
				<XButton onPress={onClose} />
			</View>
		</View>
	);
};

_Camera.propTypes = {
	onBarCodeRead: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent",
		zIndex: 999
	},
	notAuthorizedView: {
		flex: 1,
		top: -40,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10,
		zIndex: 1000
	},
	text: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 18,
		textAlign: "center"
	},
	boldText: {
		...systemWeights.bold,
		color: colors.white,
		fontSize: 18,
		textAlign: "center"
	},
});

//ComponentShouldNotUpdate
const Camera = memo(
	_Camera,
	() => true
);

export default Camera;

