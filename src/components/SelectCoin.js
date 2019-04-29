import React, { PureComponent } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import WalletCarousel from "./WalletCarousel";
import EvilIcon from "react-native-vector-icons/EvilIcons";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

class SelectCoin extends PureComponent {
	render () {
		const walletsLen = this.props.wallet.wallets.length;
		return (
			<View style={styles.container}>
				{walletsLen < 6 &&
				<TouchableOpacity onPress={this.props.createNewWallet} style={styles.plusIcon}>
					<EvilIcon name={"plus"} size={40} color={colors.white} />
				</TouchableOpacity>}
				<WalletCarousel itemToRender="wallet" onCoinPress={this.props.onCoinPress} onClose={this.props.onClose} />
			</View>
		);
	}
}

// Default values for props
SelectCoin.defaultProps = {
	onCoinPress: () => null,
	createNewWallet: () => null,
	onClose: () => null
};

SelectCoin.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	createNewWallet: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	plusIcon: {
		position: "absolute",
		top: 0,
		right: 0,
		padding: 20,
		zIndex: 300
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(SelectCoin);