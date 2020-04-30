import React, { useState, useEffect, memo } from 'react';
import {
	Dimensions,
	StyleSheet,
	View,
	LayoutAnimation,
	Platform
} from 'react-native';
import PropTypes from "prop-types";
import Carousel, { Pagination } from 'react-native-snap-carousel';
import WalletSliderEntry from "./WalletSliderEntry";

const { width } = Dimensions.get("window");

const wp = (percentage: number): number => {
	const value = (percentage * width) / 100;
	return Math.round(value);
};

const slideWidth = wp(75);
const itemHorizontalMargin = wp(2);

const sliderWidth = width;
const itemWidth = slideWidth + itemHorizontalMargin * 2;

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface WalletCarouselComponent {
	wallet: { wallets: {}, selectedWallet: string, walletOrder: string[] },
	onCoinPress: Function,
	updateWallet: Function,
	deleteWallet: Function,
	cryptoUnit: string, //satoshi or btc
	displayTestnet: boolean
}
const _WalletCarousel = ({ wallet = { wallets: {}, selectedWallet: "wallet0", walletOrder: [] }, onCoinPress = () => null, updateWallet = () => null, deleteWallet = () => null, cryptoUnit = "satoshi", displayTestnet = true }: WalletCarouselComponent) => {

	if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());

	const [activeSlide, setActiveSlide] = useState(wallet.walletOrder.indexOf(wallet.selectedWallet));

	interface RenderItem {
		walletId: string
	}
	const _renderItem = ({ walletId = "wallet0" }: RenderItem) => {
		try {
			return (
				<WalletSliderEntry
					walletId={walletId}
					wallet={wallet}
					cryptoUnit={cryptoUnit}
					updateWallet={updateWallet}
					deleteWallet={deleteWallet}
					displayTestnet={displayTestnet}
					onCoinPress={onCoinPress}
					updateActiveSlide={updateActiveSlide}
				/>
			);
		} catch (e) {
			console.log(e);
		}
	};

	const updateActiveSlide = (index = 0) => setActiveSlide(index);
	const walletOrder = wallet.walletOrder;
	return (
		<View style={styles.container}>
			<View style={styles.walletContainer}>
				<Carousel
					// @ts-ignore
					ref={c => this._slider1Ref = c}
					data={walletOrder}
					renderItem={({ item }) => _renderItem({ walletId: item })}
					sliderWidth={sliderWidth}
					itemWidth={itemWidth}
					firstItem={activeSlide}
					inactiveSlideScale={0.94}
					inactiveSlideOpacity={0.7}
					containerCustomStyle={styles.slider}
					contentContainerCustomStyle={styles.sliderContentContainer}
					onSnapToItem={index => updateActiveSlide(index)}
				/>
				<Pagination
					dotsLength={walletOrder.length}
					activeDotIndex={activeSlide}
					containerStyle={styles.paginationContainer}
					dotColor={'rgba(255, 255, 255, 0.92)'}
					dotStyle={styles.paginationDot}
					inactiveDotColor={colors.black}
					inactiveDotOpacity={0.7}
					inactiveDotScale={0.8}
					// @ts-ignore
					carouselRef={this._slider1Ref}
					// @ts-ignore
					tappableDots={!!this._slider1Ref}
				/>
			</View>
		</View>
	);
};

_WalletCarousel.propTypes = {
	wallet: PropTypes.object.isRequired,
	onCoinPress: PropTypes.func.isRequired,
	updateWallet: PropTypes.func.isRequired,
	deleteWallet: PropTypes.func.isRequired,
	cryptoUnit: PropTypes.string.isRequired, //satoshi or btc
	displayTestnet: PropTypes.bool.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	walletContainer: {
		marginVertical: 20
	},
	slider: {
		marginTop: 15
	},
	sliderContentContainer: {
	},
	paginationContainer: {
		position: "absolute",
		top: -35,
		left: 0,
		right: 0
	},
	paginationDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginHorizontal: 8
	}
});

//ComponentShouldNotUpdate
const WalletCarousel = memo(
	_WalletCarousel,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.wallet === nextProps.wallet;
	}
);

export default WalletCarousel;
