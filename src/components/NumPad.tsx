import React, { useEffect, memo } from "react";
import PropTypes from "prop-types";
import {
	StyleSheet,
	View,
	LayoutAnimation,
	Platform
} from "react-native";
import { systemWeights } from "react-native-typography";
import { Text, TouchableOpacity, FontAwesome5 } from "../styles/components";

const {
	vibrate,
} = require("../utils/helpers");

const ACTIVE_OPACITY = 0.2;

interface PinComponent {
	onPress: (string) => void,
	value: number|string,
	style?: object,
	buttonStyle?: object
}

const NumPadButton = ({ val, onPress, style }: { val: number|string, onPress: (string) => void, style: object }) => {
	return (
		<TouchableOpacity borderColor="text" onPress={onPress} activeOpacity={ACTIVE_OPACITY} style={[styles.buttonContainer, style]}>
			<Text type="text" style={styles.button}>{val}</Text>
		</TouchableOpacity>
	);
};

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

const _NumPad = ({ value = "", onPress = () => null, style = {}, buttonStyle = {} }: PinComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const handleClear = (_vibrate = true): void => {
		if (_vibrate) vibrate("impactMedium");
		onPress("0");
	};
	
	const handleRemove = (): void => {
		vibrate("impactMedium");
		let _value = String(value);
		_value = _value.substr(0, _value.length - 1);
		onPress(_value);
	};
	
	const handlePress = (val: number|string) => {
		vibrate("impactMedium");
		let _value = value;
		_value += String(val);
		onPress(_value);
	};

	return (
		<View style={[styles.container, style]}>
			
			<View style={styles.row}>
				<NumPadButton onPress={()=> handlePress(digits[0])} val={digits[0]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[1])} val={digits[1]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[2])} val={digits[2]} style={buttonStyle} />
			</View>
			
			<View style={styles.row}>
				<NumPadButton onPress={()=> handlePress(digits[3])} val={digits[3]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[4])} val={digits[4]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[5])} val={digits[5]} style={buttonStyle} />
			</View>
			
			<View style={styles.row}>
				<NumPadButton onPress={()=> handlePress(digits[6])} val={digits[6]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[7])} val={digits[7]} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[8])} val={digits[8]} style={buttonStyle} />
			</View>
			
			<View style={styles.row}>
				<NumPadButton onPress={()=> handlePress(".")} val={"."} style={buttonStyle} />
				<NumPadButton onPress={()=> handlePress(digits[9])} val={digits[9]} style={buttonStyle} />
				<TouchableOpacity onPress={handleRemove} activeOpacity={ACTIVE_OPACITY} style={[styles.buttonContainer, { borderWidth: 0 }, buttonStyle]}>
					<FontAwesome5 name={"backspace"} size={30} />
				</TouchableOpacity>
			</View>
			<View style={[styles.row, { marginBottom: 0 }]}>
				<TouchableOpacity onPress={() => handleClear()} activeOpacity={ACTIVE_OPACITY} style={[styles.buttonContainer, { borderWidth: 0 }, buttonStyle]}>
					<Text type="white" style={styles.button}>Clear</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

_NumPad.propTypes = {
	onPress: PropTypes.func.isRequired,
	value: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]).isRequired,
	style: PropTypes.object,
	buttonStyle: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center"
	},
	buttonContainer: {
		width: 58,
		height: 58,
		borderRadius: 15,
		borderWidth: 2,
		marginHorizontal: 6,
		backgroundColor: "transparent",
		alignItems:"center",
		justifyContent:"center"
	},
	row: {
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	button: {
		...systemWeights.semibold,
		fontSize: 22,
		justifyContent: "center",
		alignItems: "center",
		textAlign: "center",
	}
});

//ComponentShouldNotUpdate
const NumPad = memo(
	_NumPad,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.value === nextProps.value;
	}
);

export default NumPad;
