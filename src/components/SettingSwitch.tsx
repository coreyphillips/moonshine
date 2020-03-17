import React, { memo } from "react";
import {Switch, TouchableOpacity, StyleSheet} from "react-native";
import {systemWeights} from "react-native-typography";
import PropTypes from "prop-types";
import { View, Text } from "../styles/components";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface SettingSwitchComponent {
	title: string,
	value: boolean,
	onPress: Function,
	col1Style?: object, //Style for Column One Text View
	col2Style?: object, //Style for Column Two Switch View
	titleStyle?: object //Style for Column One Text
}
const _SettingSwitch = ({ title = "", value = false, onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {} }: SettingSwitchComponent) => {
	try {
		return (
			<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
				<View type="card" style={styles.row}>
					<View type="transparent" style={[styles.col1, col1Style]}>
						<Text type="text" style={[styles.title, titleStyle]}>{title}</Text>
					</View>
					<TouchableOpacity onPress={() => onPress(value)} style={[styles.col2 , col2Style]}>
						<Switch
							ios_backgroundColor={colors.gray}
							thumbColor={value ? colors.purple : colors.darkGray}
							trackColor={{false: colors.lightGray, true: colors.gray}}
							value={value}
							onValueChange={() => onPress(value)}
						/>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		);
	} catch (e) {
		return <View />;
	}
};

_SettingSwitch.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.bool.isRequired,
	onPress: PropTypes.func.isRequired,
	col1Style: PropTypes.object,
	col2Style: PropTypes.object,
	titleStyle: PropTypes.object,
};


const styles = StyleSheet.create({
	rowContainer: {
		width: "100%",
		backgroundColor: "transparent",
		alignItems: "center",
		marginBottom: 20
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 11.5,
		width: "80%",
		minHeight: 80,
		padding: 10
	},
	col1: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	col2: {
		flex: 0.4,
		justifyContent: "center",
		alignItems: "flex-end"
	},
	title: {
		...systemWeights.regular,
		fontSize: 20,
		textAlign: "left"
	},
});

//ComponentShouldNotUpdate
const SettingSwitch = memo(
	_SettingSwitch,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.value === prevProps.value
		);
	}
);

export default SettingSwitch;
