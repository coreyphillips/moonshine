import React, { memo } from "react";
import {
	StyleSheet,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import { TextInput, View, Text } from "../../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../../ProjectData.json");

interface TextInputRowComponent {
	title: string,
	onChangeText: () => void,
	currentValue: string,
	subTitle: string,
	onPress: () => void,
	submitText: string,
	secureTextEntry?: boolean,
}
const _TextInputRow = ({ title = "", onChangeText = () => null, currentValue = "", subTitle = "", onPress = () => null, submitText = "", secureTextEntry = false}: TextInputRowComponent) => {
	return (
		<View style={styles.container}>
			<View type="card" style={styles.row}>
				<View type="card">
					<View type="card" style={styles.textInputContainer}>
						<Text type="text" style={styles.title}>{title}</Text>
						<TextInput
							style={styles.textInput}
							secureTextEntry={secureTextEntry}
							autoCapitalize="none"
							autoCompleteType="off"
							autoCorrect={false}
							selectionColor={colors.lightPurple}
							onChangeText={onChangeText}
							value={currentValue}
							placeholder={subTitle}
						/>
					</View>
					<View style={styles.displayOptionContainer}>
						<TouchableOpacity key={submitText} onPress={onPress} style={[styles.cryptoUnitButton, { backgroundColor: colors.lightPurple }]}>
							<Text style={[styles.text, { color: colors.white}]}>{submitText}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
};

_TextInputRow.propTypes = {
	title: PropTypes.string.isRequired,
	currentValue: PropTypes.string.isRequired,
	subTitle: PropTypes.string.isRequired,
	onChangeText: PropTypes.func.isRequired,
	onPress: PropTypes.func.isRequired,
	submitText: PropTypes.string.isRequired,
	secureTextEntry: PropTypes.bool,
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
	textInputContainer: {
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10
	},
	textInput: {
		flex: 1,
		height: 30,
		width: "90%",
		borderRadius: 5,
		padding: 5,
		borderWidth: 1,
		fontWeight: "bold"
	},
	displayOptionContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 20,
		backgroundColor: "transparent"
	},
	cryptoUnitButton: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 5,
		width: "90%",
		borderWidth: 1,
		borderColor: colors.lightPurple,
		marginHorizontal: 5,
		paddingVertical: 4
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
const TextInputRow = memo(
	_TextInputRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default TextInputRow;
