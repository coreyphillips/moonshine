import React, {useEffect, memo} from "react";
import {StyleSheet, View, LayoutAnimation, Platform, Text, Image, Linking} from "react-native";
import {systemWeights} from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const updates = [
	`Users can now request a specific amount of BTC or Fiat from the "Receive Transaction" view by tapping the "Specify Amount" button.`,
	`A bug was fixed in the "Electrum Options" setting that would occasionally cause the app to hang when attempting to connect to a server.`,
	"Added a proper splash screen to prevent/reduce any flicker when launching the app.",
	"Fixed a typo that would occur when sweeping private keys."
];

const _Welcome = ({ children }) => {
	
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
					onPress={() => Linking.openURL("https://twitter.com/coreylphillips").catch((e) => console.log(e))}
					style={[styles.text, { marginTop: 5 }]}
				>
					<Text style={styles.semiBoldText}>Twitter: </Text>@coreylphillips
				</Text>
			</View>
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
		color: colors.purple,
		textAlign: "center",
		fontSize: 24
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		marginTop: 10,
		color: colors.purple,
	},
	semiBoldText: {
		...systemWeights.semibold,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		marginTop: 10,
		color: colors.purple,
	},
	subHeader: {
		...systemWeights.light,
		fontSize: 18,
		alignSelf: "flex-start",
		textAlign: "left",
		color: colors.purple,
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
