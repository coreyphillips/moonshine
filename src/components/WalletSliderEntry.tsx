import React, { memo } from "react";
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
import { systemWeights } from "react-native-typography";
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

interface FormatBalance {
	coin: string,
	cryptoUnit: string,
	balance: number
}
const formatBalance = ({ coin = "", cryptoUnit = "satoshi", balance = 0 }: FormatBalance): string => {
	try {
		let formattedBalance = "0";
		if (balance === 0 && cryptoUnit === "BTC") {
			formattedBalance = "0";
		} else {
			//This prevents the view from displaying 0 for values less than 50000 BTC
			if (balance < 50000 && cryptoUnit === "BTC") {
				formattedBalance = `${(Number(balance) * 0.00000001).toFixed(8)}`;
			} else {
				formattedBalance = bitcoinUnits(balance, "satoshi").to(cryptoUnit).value();
			}
		}
		formattedBalance = formatNumber(formattedBalance);
		return `${formattedBalance} ${getCoinData({ selectedCrypto: coin, cryptoUnit }).acronym}`;
	} catch (e) {
		return "0";
	}
};

interface CoinButtonComponent {
	onCoinPress: Function,
	cryptoUnit: string,
	coin: string,
	label: string,
	walletId: string,
	balance: number
}
const CoinButton = ({ onCoinPress, cryptoUnit = "satoshi", coin = "bitcoin", label = "Bitcoin", walletId = "wallet0", balance = 0 }: CoinButtonComponent) => {
	return (
		<TouchableOpacity key={`${coin}${walletId}`} onPress={() => onCoinPress({coin, walletId})} style={styles.button}>
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
};

interface WalletSliderEntryComponent {
	walletId: string,
	wallet: { wallets: {}, selectedWallet: string, walletOrder: string[] },
	cryptoUnit: string,
	updateWallet: Function,
	deleteWallet: Function,
	displayTestnet: boolean,
	onCoinPress: Function,
	updateActiveSlide: Function
}
const _WalletSliderEntry = ({ walletId = "bitcoin", wallet = { wallets: {}, selectedWallet: "wallet0", walletOrder: [] }, cryptoUnit = "satoshi", updateWallet = () => null, deleteWallet = () => null, displayTestnet = true, onCoinPress = () => null, updateActiveSlide }: WalletSliderEntryComponent) => {
	const Header = () => (
		<View style={styles.header}>
			<Text style={styles.headerText}>
				{`Wallet ${wallet.walletOrder.indexOf(walletId)}`}
			</Text>
		</View>
	);
	
	const _delWallet = async ({ walletIndex = 0 } = {}) => {
		try {
			if (Object.keys(wallet.wallets).length > 1) {
				let newWalletIndex = 0;
				if (walletIndex === 0 && Object.keys(wallet.wallets).length <= 2) newWalletIndex = walletIndex;
				newWalletIndex = walletIndex > 0 ? walletIndex - 1 : walletIndex;
				await deleteWallet({ wallet: walletId });
				await updateWallet({ selectedWallet: Object.keys(wallet.wallets)[newWalletIndex]});
				updateActiveSlide(newWalletIndex);
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	const delWallet = async () => {
		try {
			const index = Object.keys(wallet.wallets).indexOf(walletId);
			Alert.alert(
				"Delete Wallet",
				`Are you sure you wish to delete Wallet ${index}?`,
				[
					{
						text: "No",
						onPress: () => {},
						style: "cancel",
					},
					{text: "Yes", onPress: () => _delWallet({ walletIndex: index })},
				]
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	return (
		<View style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.innerContainer}>
				<Header />
				<View style={styles.scrollViewContent}>
					{availableCoins.map((coin, i) => {
						if (!displayTestnet && coin.toLowerCase().includes("testnet")) return;
						return (
							<CoinButton
								key={`${coin}${i}`}
								coin={coin}
								label={capitalize(coin)}
								onCoinPress={() => onCoinPress({coin, walletId})}
								walletId={walletId}
								balance={wallet.wallets[walletId].confirmedBalance[coin]}
								cryptoUnit={cryptoUnit}
							/>
						);
					})}
					{Object.keys(wallet.wallets).length > 1 &&
					<TouchableOpacity onPress={delWallet} style={styles.deleteButton}>
						<Text style={[styles.text, { color: colors.white }]}>Delete Wallet</Text>
					</TouchableOpacity>}
				</View>
				<View style={{ paddingVertical: 70 }} />
			</ScrollView>
		
		</View>
	);
};

_WalletSliderEntry.propTypes = {
	walletId: PropTypes.string.isRequired,
	wallet: PropTypes.object.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	updateWallet: PropTypes.func.isRequired,
	deleteWallet: PropTypes.func.isRequired,
	displayTestnet: PropTypes.bool.isRequired,
	onCoinPress: PropTypes.func.isRequired,
	updateActiveSlide: PropTypes.func.isRequired
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

//ComponentShouldNotUpdate
const WalletSliderEntry = memo(
	_WalletSliderEntry,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.wallet.selectedWallet === nextProps.wallet.selectedWallet;
	}
);

export default WalletSliderEntry;
