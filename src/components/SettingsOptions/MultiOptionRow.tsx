import React, { memo } from "react";
import {
	ActivityIndicator,
	StyleSheet,
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import { View, Text, TouchableOpacity } from "../../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../../ProjectData.json");
const {
	openUrl
} = require("../../utils/helpers");

interface MultiOptionRowComponent {
	title: string,
	subTitle?: string,
	currentValue: string,
	options: [{ key?: string, value: string, onPress: () => void }],
	subTitleIsLink?: boolean,
	loading?: boolean
}

const _MultiOptionRow = ({ title = "", subTitle = "", currentValue = "", options = [{ key: "", value: "", onPress: () => null }], subTitleIsLink = false, loading = false }: MultiOptionRowComponent) => {
	return (
		<View type="card" style={styles.container}>
			<View type="card" style={styles.row}>
				<View style={{ flex: 1, backgroundColor: "transparent" }}>
					<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 10, backgroundColor: "transparent" }}>
						<Text style={styles.title}>{title}</Text>
						{subTitle !== "" && !subTitleIsLink && <Text style={styles.subTitle}>{subTitle}</Text>}
						{subTitle !== "" && subTitleIsLink &&
						<TouchableOpacity type="transparent" onPress={() => openUrl(`https://${subTitle}`)} style={styles.centerContent}>
							<Text style={styles.subTitle}>{subTitle}</Text>
						</TouchableOpacity>}
					</View>
					<View style={styles.optionContainer}>
						{!loading && options.map(({ key = "", value = "", onPress = () => null }) => {
							let isMatch = false;
							try {isMatch = value.toLowerCase() === currentValue.toLowerCase();} catch (e) {}
							if (!isMatch) isMatch = key.toLowerCase() === currentValue.toLowerCase();
							return (
								<TouchableOpacity type={isMatch ? "lightPurple" : "transparent"} key={value} onPress={onPress} style={[styles.cryptoUnitButton]}>
									<Text type={isMatch ? "white" : "text"} style={[styles.text]}>{value}</Text>
								</TouchableOpacity>
							);
						})}
						{loading && <ActivityIndicator size="large" color={colors.lightPurple} />}
					</View>
				</View>
			</View>
		</View>
	);
};

_MultiOptionRow.propTypes = {
	title: PropTypes.string.isRequired,
	subTitle: PropTypes.string,
	currentValue: PropTypes.string.isRequired,
	options: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string,
			value: PropTypes.string.isRequired,
			onPress: PropTypes.func.isRequired
		})
	),
	subTitleIsLink: PropTypes.bool,
	loading: PropTypes.bool
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
		backgroundColor: "transparent",
		alignItems: "center",
		marginBottom: 20
	},
	optionContainer: {
		flexDirection: "row",
		width: "80%",
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		marginHorizontal: 20
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
	subTitle: {
		...systemWeights.light,
		fontSize: 16,
		textAlign: "left"
	},
	centerContent: {
		alignItems: "center",
		justifyContent: "center"
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
	},
	cryptoUnitButton: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 5,
		borderWidth: 2,
		flex: 1,
		borderColor: colors.lightPurple,
		marginHorizontal: 5,
		paddingVertical: 4
	},
});

//ComponentShouldNotUpdate
const MultiOptionRow = memo(
	_MultiOptionRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default MultiOptionRow;
