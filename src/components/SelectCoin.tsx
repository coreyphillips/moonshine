import React, { useEffect, memo } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Platform,
	LayoutAnimation
} from "react-native";
import PropTypes from "prop-types";
import WalletCarousel from "./WalletCarousel";
import EvilIcon from "react-native-vector-icons/EvilIcons";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface SelectCoinComponent {
	wallet: { wallets: {}, selectedWallet: string, walletOrder: string[] },
	createNewWallet: Function,
	onCoinPress: Function,
	cryptoUnit: string, //satoshi or btc
	updateWallet: Function,
	deleteWallet: Function,
	displayTestnet: boolean
}
const _SelectCoin = ({ wallet = { wallets: {}, selectedWallet: "wallet0", walletOrder: [] }, createNewWallet = () => null, onCoinPress = () => null, cryptoUnit = "satoshi", updateWallet = () => null, deleteWallet = () => null, displayTestnet = true }: SelectCoinComponent) => {
	
	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	const walletsLen = Object.keys(wallet.wallets).length;
	return (
		<View style={styles.container}>
			{walletsLen < 6 &&
			<TouchableOpacity onPress={() => createNewWallet()} style={styles.plusIcon}>
				<EvilIcon name={"plus"} size={40} color={colors.white} />
			</TouchableOpacity>}
			<WalletCarousel
				wallet={wallet}
				onCoinPress={onCoinPress}
				cryptoUnit={cryptoUnit}
				updateWallet={updateWallet}
				deleteWallet={deleteWallet}
				displayTestnet={displayTestnet}
			/>
		</View>
	);
};

_SelectCoin.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	createNewWallet: PropTypes.func.isRequired,
	wallet: PropTypes.object.isRequired,
	cryptoUnit: PropTypes.string.isRequired, //satoshi or btc
	updateWallet: PropTypes.func.isRequired,
	deleteWallet: PropTypes.func.isRequired,
	displayTestnet: PropTypes.bool.isRequired
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

//ComponentShouldNotUpdate
const SelectCoin = memo(
	_SelectCoin,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.wallet === nextProps.wallet;
	}
);

export default SelectCoin;
