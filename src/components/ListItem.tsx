import React, { memo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface ListItemComponent {
	onPress: (item?: string) => void,
	item: string,
	title: string,
	isSelected: boolean
}
const _ListItem = ({ onPress = () => null, item = "", title = "", isSelected = false }: ListItemComponent) => {
	return (
		<TouchableOpacity
			onPress={() => onPress(item)}
			style={styles.container}
		>
			<View style={styles.titleContainer}>
				<Text style={[styles.title, {color: colors.purple}]}>
					{title}
				</Text>
			</View>
			<View style={styles.iconContainer}>
				<MaterialCommunityIcons
					name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
					size={30}
					color={colors.darkPurple}
				/>
			</View>
		</TouchableOpacity>
	);
};

_ListItem.propTypes = {
	onPress: PropTypes.func.isRequired,
	item: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	isSelected: PropTypes.bool.isRequired
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 10,
		flexDirection: "row",
		width: "100%"
	},
	titleContainer: {
		flex: 2,
		alignItems: "flex-start",
		justifyContent: "center"
	},
	title: {
		...systemWeights.semibold,
		color: colors.darkPurple,
		fontSize: 18,
		textAlign: "left"
	},
	iconContainer: {
		flex: 1,
		alignItems: "flex-end",
		justifyContent: "center",
		marginRight: 20
	}
});


//ComponentShouldNotUpdate
const ListItem = memo(
	_ListItem,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.isSelected === nextProps.isSelected &&
			prevProps.item === nextProps.item &&
			prevProps.title === nextProps.title;
	}
);

export default ListItem;
