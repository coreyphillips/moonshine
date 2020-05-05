import React, {useEffect, memo} from "react";
import {StyleSheet, View, LayoutAnimation, Platform, Image, Linking} from "react-native";
import {systemWeights} from "react-native-typography";
import XButton from "./XButton";
import { Text } from "../styles/components";

const updates = [
	"Upgraded to PSBT.",
	"Removed slow or unresponsive Electrum servers from the default peer list.",
	"Added a fee estimate modal to the Send Transaction view.",
	"Further optimized fees for Bech32 & Segwit-Compatible addresses.",
	"Refresh the random peer list more frequently for more reliable connections.",
	"Slight style updates to the RBF section of the transaction detail view.",
	"Fixed BitId login functionality.",
	"Blacklisted UTXO's are now labeled in the coin control modal.",
	"Improved fee calculation when adding a transaction message.",
	"Fixed request payment bug when using BTC as the crypto unit.",
	"Improved UX when importing mnemonic phrases.",
	"Fixed BackHandler issues on certain screens for Android devices.",
	"Fixed issue with keyboards that replace periods with a comma based on the device language preference."
];

const _Welcome = ({ onClose = () => null, children = <View /> } = {}) => {

	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	return (
		<View style={styles.container}>
			<Image
				style={styles.icon}
				source={require("../assets/main_icon.png")}
			/>
			<Text style={styles.header}>Welcome!</Text>
			<View style={{ width: "85%" }}>
				{children}
				<Text style={[styles.subHeader, { textAlign: "center" }]}>Updates in this build include:</Text>
				{updates.map((update, i) => <Text key={update} style={styles.text}><Text style={styles.semiBoldText}>{i+1}. </Text>{update}</Text>)}

				<Text style={styles.subHeader}>Questions?</Text>

				<Text style={styles.text}>Never hesitate to reach out:</Text>
				<Text
					onPress={() => Linking.openURL("mailto:support@moonshinewallet.com?subject=Requesting Some Help").catch((e) => console.log(e))}
					style={[styles.text, { marginTop: 5 }]}
				>
					<Text style={styles.semiBoldText}>Email: </Text>support@moonshinewallet.com
				</Text>
				<Text
					onPress={() => Linking.openURL("https://twitter.com/moonshinewallet").catch((e) => console.log(e))}
					style={[styles.text, { marginTop: 5 }]}
				>
					<Text style={styles.semiBoldText}>Twitter: </Text>@moonshinewallet
				</Text>
			</View>
			<XButton style={{marginVertical: 30}} onPress={onClose} />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		marginVertical: 10,
		paddingBottom: 20
	},
	icon: {
		width: 80, height: 80, marginBottom: 20
	},
	header: {
		...systemWeights.semibold,
		textAlign: "center",
		fontSize: 24
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		marginTop: 10
	},
	semiBoldText: {
		...systemWeights.semibold,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		marginTop: 10
	},
	subHeader: {
		...systemWeights.light,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		marginTop: 20,
		...systemWeights.semibold
	}
});

//ComponentShouldNotUpdate
const Welcome = memo(
	_Welcome,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);

export default Welcome;
