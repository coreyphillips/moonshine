import React, {memo} from "react";
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {systemWeights} from "react-native-typography";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import PropTypes from "prop-types";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface SettingGeneralComponent {
	onPress: Function,
	title?: string, //Text for Column One
	value?: string, //Text for Column Two
	col1Loading?: boolean,
	col2Loading?: boolean,
	col1Image?: string|object,
	col2Image?: string,
	rowStyle?: object,
	col1Style?: object,
	col2Style?: object,
	titleStyle?: object, //Style for Column One Text
	valueStyle?: object //Style for Column Two Text
}
const _SettingGeneral = ({ title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col2Image = "", rowStyle = {}, onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle = {} }: SettingGeneralComponent) => {
	try {
		return (
			<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
				<View style={[styles.row, rowStyle]}>
					{!col1Loading && col1Image === "" &&
					<View style={[styles.col1, col1Style]}>
						<Text style={[styles.title, titleStyle]}>{title}</Text>
					</View>}
					{col1Loading &&
					<View style={[styles.col1, col1Style]}>
						<ActivityIndicator size="large" color={colors.lightPurple} />
					</View>}
					{!col1Loading && col1Image !== "" &&
					<View style={[styles.col1, col1Style]}>
						{col1Image}
					</View>}
					
					{!col2Loading && col2Image === "" &&
					<View style={[styles.col2, col2Style]}>
						<Text style={[styles.text, valueStyle]}>{value}</Text>
					</View>}
					{col2Loading &&
					<View style={[styles.col2, col2Style]}>
						<ActivityIndicator size="large" color={colors.lightPurple} />
					</View>}
					
					{!col2Loading && col2Image !== "" &&
					<View style={[styles.col2, col2Style]}>
						<MaterialCommunityIcons name={col2Image} size={50} color={colors.purple} />
					</View>
					}
				
				</View>
			</TouchableOpacity>
		);
	} catch (e) {
		return <View />;
	}
};

_SettingGeneral.propTypes = {
	onPress: PropTypes.func.isRequired,
	title: PropTypes.string,
	value: PropTypes.string,
	col1Loading: PropTypes.bool,
	col2Loading: PropTypes.bool,
	col1Image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
	col2Image: PropTypes.string,
	rowStyle: PropTypes.object,
	col1Style: PropTypes.object,
	col2Style: PropTypes.object,
	titleStyle: PropTypes.object,
	valueStyle: PropTypes.object
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
		backgroundColor: colors.white,
		borderRadius: 11.5,
		width: "80%",
		minHeight: 80,
		paddingVertical: 10
	},
	col1: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "flex-start",
	},
	col2: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	title: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 20,
		textAlign: "left"
	},
	text: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left"
	},
});

//ComponentShouldNotUpdate
const SettingGeneral = memo(
	_SettingGeneral,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.value === prevProps.value && nextProps.col1Loading === prevProps.col1Loading && nextProps.col2Loading === prevProps.col2Loading
		);
	}
);

export default SettingGeneral;
