import React, { PureComponent } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	ScrollView,
	Image
} from "react-native";
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
	getCoinData
} = require("../utils/helpers");

const getImage = (coin = "bitcoin") => {
	try {
		switch (coin) {
			case "bitcoin":
			case "bitcoinTestnet":
				return require("../assets/bitcoin.png");
			case "litecoin":
			case "litecoinTestnet":
				return require("../assets/litecoin.png");
			default:
				return require("../assets/bitcoin.png");
		}
	} catch (e) {
		console.log(e);
		return require("../assets/bitcoin.png");
	}
};

formatBalance = ({ coin = "", cryptoUnit = "satoshi", balance = 0 } = {}) => {
	try {
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
						source={getImage(coin)}
					/>

					<Text style={styles.text}>{label}</Text>
					<Text style={styles.subText}>{formatBalance({ balance, coin, cryptoUnit })}</Text>

				</View>
			</TouchableOpacity>
		)
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

	Header = () => (
		<View style={styles.header}>
			<Text style={styles.headerText}>
				{this.props.data.split('wallet').join('Wallet ')}
			</Text>
		</View>
	);

	deleteWallet = async ({ wallet = "" } = {}) => {
		try {
			if (this.props.wallet.wallets.length > 1) {
				let index = 0;
				const walletIndex =  this.props.wallet.wallets.indexOf(wallet);
				if (this.props.wallet.wallets.length-1 > walletIndex) {
					index = walletIndex;
				} else {
					index = walletIndex - 1;
				}
				await this.props.updateWallet({ selectedWallet: this.props.wallet.wallets[index]});
				await this.props.deleteWallet({ wallet });
				await this.props.updateActiveSlide(index);
			}
		} catch (e) {
			console.log(e);
		}
	};

	render () {
		return (
			<View style={styles.container}>
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.innerContainer}>
					{this.Header()}
					<View style={styles.scrollViewContent}>
						{this.props.coins.map((coin, i) => (
							<CoinButton key={`${coin}${i}`} coin={coin.coin} label={coin.label} onCoinPress={this.props.onCoinPress} wallet={this.props.data} balance={this.props.wallet[this.props.data].confirmedBalance[coin.coin]} cryptoUnit={this.props.settings.cryptoUnit} />
						))}
						{this.props.wallet.wallets.length > 1 &&
						<TouchableOpacity onPress={() => this.deleteWallet({wallet: this.props.data })} style={[styles.button, { backgroundColor: colors.red, borderColor: colors.red, borderRadius: 10 }]}>
							<View style={{ flex: 1, borderRadius: 11.5, backgroundColor: colors.red }}>
								<View style={{ flexDirection: "row", flex: 1 }}>
									<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
										<Text style={[styles.text, { color: colors.white }]}>Delete Wallet</Text>
									</View>
								</View>
							</View>
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
	coins: [
		{ coin: "bitcoin", label: "Bitcoin" },
		{ coin: "bitcoinTestnet", label: "Bitcoin Testnet" },
		{ coin: "litecoin", label: "Litecoin" },
		{ coin: "litecoinTestnet", label: "Litecoin Testnet" }
	],
	wallet: "wallet0"
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
		width: "80%",
		minHeight: 60,
		flexDirection: "row",
		backgroundColor: "transparent",
		marginBottom: 15
	},
	buttonContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 10,
		backgroundColor: colors.white
	},
	buttonImage: {
		width: 40,
		height: 40,
		position: "absolute",
		bottom: 0,
		top: 9,
		left: 10
	},
	text: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 18,
		textAlign: "center"
	},
	subText: {
		...systemWeights.light,
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

const mapStateToProps = ({...state}, props) => ({
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