import React, { PureComponent } from "react";
import {
	View,
	Text,
	StyleSheet,
	Dimensions
} from "react-native";
import { systemWeights } from "react-native-typography/dist/index";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const { height, width } = Dimensions.get("window");
const {
	formatNumber
} = require("../utils/helpers");

class MnemonicSliderEntry extends PureComponent {

	getWalletBalance = () => {
		try {
			const p = this.props.wallet[this.props.data.wallet].confirmedBalance;
			let balance = 0;
			for (let key in p) {
				if (p.hasOwnProperty(key)) {
					if (!key.includes("Testnet") && key !== "timestamp") {
						balance = balance + Number(p[key]);
					}
				}
			}
			return balance;
		} catch (e) {
			return 0;
		}
	};

	Header = () => (
		<View style={styles.header}>
			<Text style={styles.headerText}>
				{this.props.data.wallet.split('wallet').join('Wallet ')}
			</Text>
			<Text style={styles.headerSubText}>
				{formatNumber(this.getWalletBalance())} sats
			</Text>
		</View>
	);

	render () {
		return (
			<View style={styles.container}>
				{this.Header()}
				<View style={styles.innerContainer}>
					{this.Header()}
				</View>

			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "white"
	},
	header: {
		marginVertical: 20
	},
	headerText: {
		...systemWeights.thin,
		fontSize: 50,
		color: colors.white,
		textAlign: "center"
	},
	headerSubText: {
		...systemWeights.thin,
		color: colors.white,
		fontSize: 28,
		textAlign: "center"
	},
	innerContainer: {
		flex: 1,
		backgroundColor: "transparent",
		height: height * .9,
		width: width * .9
	}
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("../actions/user");
const walletActions = require("../actions/wallet");
const transactionActions = require("../actions/transaction");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...userActions,
		...walletActions,
		...transactionActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(MnemonicSliderEntry);