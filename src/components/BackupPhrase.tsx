import React, {memo} from "react";
import { StyleSheet } from "react-native";
import {systemWeights} from "react-native-typography";
import PropTypes from "prop-types";
import { View, TouchableOpacity, Text } from "../styles/components";

const ListItem = ({ id = 0, word = "" } = {}) => {
	return (
		<View type="transparent" style={styles.listItem}>
			<Text type="text" style={styles.text}>{id}. {word}</Text>
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
			<TouchableOpacity type="background" onPress={onPress} activeOpacity={1} style={styles.container}>
				<View type="transparent" style={[styles.column, { right: "-10%" }]}>
					{p1.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
				<View type="transparent" style={[styles.column, { right: "-5%" }]}>
					{p2.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
			</TouchableOpacity>
		);
	} catch (e) {
		return <View />;
	}
};

_BackupPhrase.propTypes = {
	onPress: PropTypes.func,
	phrase: PropTypes.array.isRequired
};


const styles = StyleSheet.create({
	container: {
		width: "90%",
		height: "75%",
		flexDirection: "row",
		borderRadius: 15,
		alignSelf: "center",
		marginVertical: 20
	},
	listItem: {
		flexDirection: "row"
	},
	text: {
		...systemWeights.semibold,
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
