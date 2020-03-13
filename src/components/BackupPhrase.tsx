import React, {memo} from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import {systemWeights} from "react-native-typography";
import PropTypes from "prop-types";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const ListItem = ({ id = 0, word = "" } = {}) => {
	return (
		<View style={styles.listItem}>
			<Text style={styles.text}>{id}. {word}</Text>
		</View>
	);
};

interface BackupPhraseComponent {
	onPress: () => null,
	phrase: [{id: number, word: string}]
}
const _BackupPhrase = ({ phrase = [{ id: 0, word: "" }], onPress = () => null }: BackupPhraseComponent) => {
	let p1, p2 = [];
	try {
		const halfway = Math.floor(phrase.length / 2);
		p1 = phrase.slice(0, halfway);
		p2 = phrase.slice(halfway, phrase.length);
	} catch (e) {}
	
	try {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={1} style={styles.container}>
				<View style={[styles.column, { right: "-10%" }]}>
					{p1.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
				<View style={[styles.column, { right: "-5%" }]}>
					{p2.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
			</TouchableOpacity>
		);
	} catch (e) {
		return <View />;
	}
};

_BackupPhrase.propTypes = {
	onPress: PropTypes.func.isRequired,
	phrase: PropTypes.array.isRequired
};


const styles = StyleSheet.create({
	container: {
		width: "90%",
		height: "75%",
		flexDirection: "row",
		backgroundColor: colors.white,
		borderRadius: 15,
		alignSelf: "center",
		marginVertical: 20
	},
	listItem: {
		flexDirection: "row"
	},
	text: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center",
		marginVertical: 10
	},
	column: {
		flex: 1,
		justifyContent: "center",
		alignItems: "flex-start"
	}
});

//ComponentShouldNotUpdate
const BackupPhrase = memo(
	_BackupPhrase,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (nextProps.phrase === prevProps.phrase);
	}
);

export default BackupPhrase;
