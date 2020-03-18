import React, {useState, memo} from 'react';
import {
	StyleSheet,
	Dimensions,
	Animated,
	Text
} from 'react-native';
import PropTypes from "prop-types";
import XButton from "./XButton";
import Button from "./Button";
import {systemWeights} from "react-native-typography";
import { View, TextInput, Foundation } from "../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const { height } = Dimensions.get("window");
const {
	openTxId
} = require("../utils/helpers");

interface BroadcastTransactionComponent {
	// @ts-ignore
	broadcastTransaction: ({ txHex: string, sendTransactionFallback: boolean, selectedCrypto: string }) => { error: boolean, data: string },
	sendTransactionFallback: boolean,
	refreshWallet: Function,
	selectedCrypto: string,
	onBack: Function
}
// eslint-disable-next-line no-unused-vars
const _defaultBroadcastTransaction = ({txHex = "", sendTransactionFallback = false, selectedCrypto = "bitcoin"} = {}) => {
	return { error: true, data: "" };
};

const _BroadcastTransaction = ({ broadcastTransaction = _defaultBroadcastTransaction, sendTransactionFallback = false, refreshWallet = () => null, selectedCrypto = "bitcoin", onBack = () => null }: BroadcastTransactionComponent) => {
	const [transaction, setTransaction] = useState("");
	const [broadcasting, setBroadcasting] = useState(false);
	const [hash, setHash] = useState("");
	
	const updateTransaction = (transaction = ""): void => {
		try {
			if (hash) setHash("");
			if (transaction === "") setTransaction(transaction);
			setTransaction(transaction);
		} catch (e) {}
	};
	
	const _broadcastTransaction = async () => {
		try {
			if (hash) setHash("");
			if (!transaction) {
				alert("Please enter a transaction to broadcast.");
				return;
			}
			let sendTransactionResult = await broadcastTransaction({ txHex: transaction, sendTransactionFallback, selectedCrypto });
			if (sendTransactionResult.error) {
				alert("There was an error broadcasting this transaction. Please check your transaction and try again.");
			} else {
				setTransaction("");
				if (sendTransactionResult.data) setHash(sendTransactionResult.data);
				refreshWallet();
			}
			setBroadcasting(false);
		} catch (e) {}
	};
	
	const viewTransaction = () => {
		try {
			openTxId(hash, selectedCrypto);
		} catch (e) {}
	};
	
	return (
		<View type="transparent" style={styles.container}>
			
			<View style={styles.textInputContainer}>
				
				<View type="PRIMARY_DARK" style={styles.broadcastIcon}>
					<Foundation type="white" name="mobile-signal" size={50} />
				</View>
				
				<TextInput
					placeholder="Please enter your raw transaction here."
					style={styles.textInput}
					selectionColor={colors.lightPurple}
					autoCapitalize="none"
					autoCompleteType="off"
					autoCorrect={false}
					onChangeText={(transaction) => updateTransaction(transaction)}
					value={transaction}
					multiline={true}
				/>
				
				{hash !== "" &&
				<Text style={[styles.text, { marginVertical: 25 }]}>
					Success!
				</Text>}
				
				{hash !== "" &&
				<View style={styles.sendButton}>
					<Button title="View Transaction" onPress={viewTransaction} />
				</View>}
				
				{hash === "" &&
				<View style={[styles.sendButton, { marginTop: 50 }]}>
					<Button title="Broadcast Transaction" onPress={_broadcastTransaction} loading={broadcasting} />
				</View>}
			</View>
			
			<Animated.View style={styles.xButton}>
				<XButton style={{ borderColor: "transparent" }} onPress={onBack} />
			</Animated.View>
		</View>
	);
};

_BroadcastTransaction.propTypes = {
	broadcastTransaction: PropTypes.func.isRequired,
	refreshWallet: PropTypes.func.isRequired,
	selectedCrypto: PropTypes.string.isRequired,
	onBack: PropTypes.func.isRequired,
	sendTransactionFallback: PropTypes.bool,
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	textInputContainer: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		top: height*-0.2,
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "transparent"
	},
	textInput: {
		width: "80%",
		minHeight: 150,
		borderRadius: 10,
		padding: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: "bold"
	},
	broadcastIcon: {
		width: 80,
		height: 80,
		borderRadius: 80/2,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20
	},
	sendButton: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
	},
	text: {
		...systemWeights.bold,
		color: colors.white,
		fontSize: 20,
		textAlign: "center"
	},
});

//ComponentShouldNotUpdate
const BroadcastTransaction = memo(
	_BroadcastTransaction,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);
export default BroadcastTransaction;
