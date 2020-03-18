import React, { memo } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import { MaterialCommunityIcons, View, Text } from "../../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../../ProjectData.json");

interface HeaderRowComponent {
	header: string,
	value: string,
	onPress: (value: string) => void,
	title?: string,
	col1Loading?: boolean,
	col2Loading?: boolean,
	col1Image?: string,
	col1ImageColor?: string,
	col2Image?: string,
	headerStyle?: object,
	col1Style?: object,
	col2Style?: object,
	titleStyle?: object,
	valueStyle?: object
}

const _HeaderRow = ({ header = "", value = "", onPress = () => null, title = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", headerStyle = {}, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} }: HeaderRowComponent) => {
	return (
		<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.container}>
			<View type="card" style={styles.row}>
				
				<View style={{ flex: 1 }}>
					<View type="card" style={{ alignItems: "center", justifyContent: "center" }}>
						{!col1Loading && col1Image === "" &&
						<View style={[styles.header, col1Style]}>
							<Text style={[styles.title, headerStyle]}>{header}</Text>
						</View>}
					</View>
					<View type="card" style={{ flexDirection: "row" }}>
						{!col1Loading && col1Image === "" &&
						<View style={[styles.col1, col1Style]}>
							<Text style={[styles.title, titleStyle]}>{title}</Text>
						</View>}
						{col1Loading &&
						<View style={[styles.col1, col1Style]}>
							<ActivityIndicator size="large" color={colors.lightPurple} />
						</View>}
						{!col1Loading && col1Image !== "" &&
						<View style={[styles.col1, col1Image]}>
							<MaterialCommunityIcons name={col1Image} size={50} color={col1ImageColor} />
						</View>
						}
						
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
				</View>
			
			</View>
		</TouchableOpacity>
	);
};

_HeaderRow.propTypes = {
	header: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	onPress: PropTypes.func.isRequired,
	title: PropTypes.string,
	col1Loading: PropTypes.bool,
	col2Loading: PropTypes.bool,
	col1Image: PropTypes.string,
	col1ImageColor: PropTypes.string,
	col2Image: PropTypes.string,
	headerStyle: PropTypes.object,
	col1Style: PropTypes.object,
	col2Style: PropTypes.object,
	titleStyle: PropTypes.object,
	valueStyle: PropTypes.object
};

const styles = StyleSheet.create({
	container: {
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
		paddingVertical: 10
	},
	col1: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	col2: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "transparent"
	},
	title: {
		...systemWeights.regular,
		fontSize: 20,
		textAlign: "left"
	},
	text: {
		...systemWeights.regular,
		fontSize: 16,
		textAlign: "left"
	}
});

//ComponentShouldNotUpdate
const HeaderRow = memo(
	_HeaderRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default HeaderRow;
