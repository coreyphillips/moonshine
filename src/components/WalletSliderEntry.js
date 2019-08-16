import React, { PureComponent } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	ScrollView,
	Image,
	Alert
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography/dist/index";
import bitcoinUnits from "bitcoin-units";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const { height, width } = Dimensions.get("window");
const {
	formatNumber,
	capitalize
} = require("../utils/helpers");

const {
	availableCoins,
	getCoinImage,
	getCoinData
} = require("../utils/networks");

formatBalance = ({ coin = "", cryptoUnit = "satoshi", balance = 0 } = {}) => {
	try {
		//This prevents the view from displaying 0 BTC
		if (balance < 50000 && cryptoUnit === "BTC") {
			balance = `${Number((balance * 0.00000001).toFixed(8))}`;
		} else {
			balance = bitcoinUnits(balance, "satoshi").to(cryptoUnit).value();
		}
		balance = formatNumber(balance);
		return `${balance} ${getCoinData({ selectedCrypto: coin, cryptoUnit }).acronym}`;
	} catch (e) {
		return 0;
	}
};

class CoinButton extends PureComponent {
	render() {
		const { onCoinPress, cryptoUnit, coin, label, wallet, balance  } = this.props;
		return (
			<TouchableOpacity key={`${coin}${Math.random()}`} onPress={() => onCoinPress({ coin, wallet })} style={styles.button}>
				<View style={styles.buttonContent}>
					
					<Image
						style={styles.buttonImage}
						source={getCoinImage(coin)}
					/>
					
					<Text style={styles.text}>{label}</Text>
					<Text style={styles.subText}>{formatBalance({ balance, coin, cryptoUnit })}</Text>
				
				</View>
			</TouchableOpacity>
		);
	}
}

CoinButton.defaultProps = {
	onCoinPress: () => null,
	cryptoUnit: "satoshi",
	coin: "bitcoin",
	label: "Bitcoin",
	wallet: "wallet0",
	balance : 0
};

class WalletSliderEntry extends PureComponent {
	
	Header = (wallet = "") => (
		<View style={styles.header}>
			<Text style={styles.headerText}>
				{`Wallet ${Object.keys(this.props.wallet.wallets).indexOf(wallet)}`}
			</Text>
		</View>
	);
	
	_deleteWallet = async ({ wallet = "", walletIndex = 0 } = {}) => {
		try {
			if (Object.keys(this.props.wallet.wallets).length > 1) {
				let newWalletIndex = walletIndex;
				if (walletIndex === 0) {
					newWalletIndex = walletIndex + 1;
				} else {
					newWalletIndex = walletIndex > 0 ? walletIndex - 1 : walletIndex;
				}
				await this.props.updateWallet({ selectedWallet: Object.keys(this.props.wallet.wallets)[newWalletIndex]});
				await this.props.deleteWallet({ wallet });
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	deleteWallet = async ({ wallet = "" } = {}) => {
		try {
			const selectedWallet = wallet;
			let walletIndex = 0;
			try {
				const index = Object.keys(this.props.wallet.wallets).indexOf(wallet);
				if (Object.keys(this.props.wallet.wallets).length - 1 > walletIndex) {
					walletIndex = index;
				} else {
					walletIndex = index - 1;
				}
			} catch (e) {}
			Alert.alert(
				"Delete Wallet",
				`Are you sure you wish to delete Wallet ${Object.keys(this.props.wallet.wallets).indexOf(selectedWallet)}?`,
				[
					{
						text: "No",
						onPress: () => {},
						style: "cancel",
					},
					{text: "Yes", onPress: () => this._deleteWallet({ wallet, walletIndex })},
				]
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	render () {
		return (
			<View style={styles.container}>
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.innerContainer}>
					{this.Header(this.props.data)}
					<View style={styles.scrollViewContent}>
						{this.props.coins.map((coin, i) => {
							if (!this.props.settings.testnet && coin.toLowerCase().includes("testnet")) return;
							return (
								<CoinButton
									key={`${coin}${i}`}
									coin={coin}
									label={capitalize(coin)}
									onCoinPress={this.props.onCoinPress}
									wallet={this.props.data}
									balance={this.props.wallet.wallets[this.props.data].confirmedBalance[coin]}
									cryptoUnit={this.props.settings.cryptoUnit}
								/>
							);
						})}
						{Object.keys(this.props.wallet.wallets).length > 1 &&
						<TouchableOpacity onPress={() => this.deleteWallet({wallet: this.props.data })} style={styles.deleteButton}>
							<Text style={[styles.text, { color: colors.white }]}>Delete Wallet</Text>
						</TouchableOpacity>}
					</View>
					<View style={{ paddingVertical: 70 }} />
				</ScrollView>
			
			</View>
		);
	}
}

// Default values for props
WalletSliderEntry.defaultProps = {
	onCoinPress: () => null,
	coins: availableCoins,
	wallet: "wallet0",
	data: {}
};

WalletSliderEntry.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	coins: PropTypes.array.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	header: {
		marginBottom: 20
	},
	headerText: {
		...systemWeights.thin,
		fontSize: 40,
		color: colors.white,
		textAlign: "center"
	},
	innerContainer: {
		flex: 1,
		backgroundColor: "transparent",
		height: height * .9,
		width: width * .9
	},
	scrollViewContent: {
		alignItems: "center",
		justifyContent: "flex-start"
	},
	button: {
		width: "82%",
		minHeight: 80,
		flexDirection: "row",
		backgroundColor: "transparent",
		marginBottom: 15
	},
	deleteButton: {
		width: "82%",
		minHeight: 80,
		marginBottom: 15,
		borderRadius: 22,
		backgroundColor: colors.red,
		borderColor: colors.red,
		alignItems: "center",
		justifyContent: "center"
	},
	buttonContent: {
		flex: 1,
		alignItems: "center",
		borderRadius: 40,
		justifyContent: "center",
		backgroundColor: colors.white
	},
	buttonImage: {
		width: 48,
		height: 48,
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		left: 10
	},
	text: {
		...systemWeights.semibold,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	},
	subText: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(WalletSliderEntry);
