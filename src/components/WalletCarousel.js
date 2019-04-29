import React, { PureComponent } from 'react';
import {
	Dimensions,
	StyleSheet,
	View
} from 'react-native';
import PropTypes from "prop-types";
import Carousel, { Pagination } from 'react-native-snap-carousel';
import WalletSliderEntry from "./WalletSliderEntry";

const { width } = Dimensions.get("window");

function wp (percentage) {
	const value = (percentage * width) / 100;
	return Math.round(value);
}

const slideWidth = wp(75);
const itemHorizontalMargin = wp(2);

const sliderWidth = width;
const itemWidth = slideWidth + itemHorizontalMargin * 2;

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

export default class WalletCarousel extends PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			activeSlide: this.props.wallet.wallets.indexOf(this.props.wallet.selectedWallet)
		};
	}

	_renderItem({ item, index, onCoinPress = () => null, onClose = () => null, updateActiveSlide = () => null } = {}) {
		return (
			<WalletSliderEntry
				data={item}
				even={(index + 1) % 2 === 0}
				//onCoinPress={index === this.state.activeSlide ? onCoinPress : () => null}
				onCoinPress={onCoinPress}
				onClose={onClose}
				updateActiveSlide={updateActiveSlide}
			/>
		);
	}

	carousel() {
		return (
			<View style={styles.walletContainer}>
				<Carousel
					ref={c => this._slider1Ref = c}
					data={this.props.wallet.wallets}
					renderItem={({ item, index }) => this._renderItem({ item, index, onCoinPress: this.props.onCoinPress, onClose: this.props.onClose, updateActiveSlide: (index) => this.setState({ activeSlide: index }) })}
					sliderWidth={sliderWidth}
					itemWidth={itemWidth}
					firstItem={this.state.activeSlide}
					inactiveSlideScale={0.94}
					inactiveSlideOpacity={0.7}
					// inactiveSlideShift={20}
					containerCustomStyle={styles.slider}
					contentContainerCustomStyle={styles.sliderContentContainer}
					loopClonesPerSide={2}
					onSnapToItem={index => {
						this.setState({ activeSlide: index });
					}}
					enableMomentum={true}
					decelerationRate={0.9}
				/>
				<Pagination
					dotsLength={this.props.wallet.wallets.length}
					activeDotIndex={this.state.activeSlide}
					containerStyle={styles.paginationContainer}
					dotColor={'rgba(255, 255, 255, 0.92)'}
					dotStyle={styles.paginationDot}
					inactiveDotColor={colors.black}
					inactiveDotOpacity={0.7}
					inactiveDotScale={0.8}
					carouselRef={this._slider1Ref}
					tappableDots={!!this._slider1Ref}
				/>
			</View>
		);
	}

	render() {
		const Carousel = this.carousel();
		return (
			<View style={styles.container}>
				{Carousel}
			</View>
		);
	}
}

// Default values for props
WalletCarousel.defaultProps = {
	onCoinPress: () => null,
	onClose: () => null
};

WalletCarousel.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	gradient: {
		...StyleSheet.absoluteFillObject
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(WalletCarousel);