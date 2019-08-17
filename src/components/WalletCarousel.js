import React, { Component } from 'react';
import {
	Dimensions,
	StyleSheet,
	View
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

export default class WalletCarousel extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			activeSlide: Object.keys(this.props.wallet.wallets).indexOf(this.props.wallet.selectedWallet)
		};
	}
	
	_renderItem({ walletId, onCoinPress = () => null, onClose = () => null, updateActiveSlide = () => null } = {}) {
		try {
			return (
				<WalletSliderEntry
					walletId={walletId}
					onCoinPress={onCoinPress}
					onClose={onClose}
					updateActiveSlide={updateActiveSlide}
					wallet={this.props.wallet}
					cryptoUnit={this.props.settings.cryptoUnit}
					updateWallet={this.props.updateWallet}
					deleteWallet={this.props.deleteWallet}
					displayTestnet={this.props.settings.testnet}
				/>
			);
		} catch (e) {
			console.log(e);
		}
	}
	
	shouldComponentUpdate(nextProps, nextState) {
		try {
			return nextProps.wallet !== this.props.wallet ||
				nextState.activeSlide !== this.state.activeSlide;
			
		} catch (e) {return false;}
	}
	
	updateActiveSlide = (index = 0) => {
		this.setState({ activeSlide: index });
	};
	
	render() {
		return (
			<View style={styles.container}>
				<View style={styles.walletContainer}>
					<Carousel
						ref={c => this._slider1Ref = c}
						data={Object.keys(this.props.wallet.wallets)}
						renderItem={({ item }) => this._renderItem({walletId: item, onCoinPress: this.props.onCoinPress, onClose: this.props.onClose, updateActiveSlide: this.updateActiveSlide })}
						sliderWidth={sliderWidth}
						itemWidth={itemWidth}
						firstItem={this.state.activeSlide}
						inactiveSlideScale={0.94}
						inactiveSlideOpacity={0.7}
						containerCustomStyle={styles.slider}
						contentContainerCustomStyle={styles.sliderContentContainer}
						onSnapToItem={index => this.updateActiveSlide(index)}
						enableMomentum={true}
						decelerationRate={0.9}
					/>
					<Pagination
						dotsLength={Object.keys(this.props.wallet.wallets).length}
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
