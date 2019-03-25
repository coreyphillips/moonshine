// @flow weak
const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");

const {
	availableCoins
} = require("../utils/networks");

let customPeers = {};
availableCoins.map(coin => ( customPeers[coin] = [] ));

module.exports = (state = {
	loading: false,
	error: false,
	errorTitle: "",
	errorMsg: "",
	fiatSymbol: "$",
	biometrics: false,
	biometricsIsSupported: false,
	biometricTypeSupported: "", //Either "FaceID" or "TouchID" if any
	pin: false,
	pinAttemptsRemaining: 5,
	cryptoUnit: "satoshi", //BTC, mBTC, μBTC or satoshi
	customPeers, //Takes { host: "", port: "", protocol: "ssl" } Default ports for BTC are: "s": "50002" && "t": "50001"
	currentPeer: {
		host: "",
		port: "", //Default ports for BTC are: "s": "50002" && "t": "50001"
	}
}, action) => {
	switch (action.type) {

		case actions.WIPE_DEVICE:
			return {
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: "",
				fiatSymbol: "$",
				biometrics: false,
				pin: false,
				pinAttemptsRemaining: 5,
				cryptoUnit: "satoshi", //BTC, mBTC, μBTC or satoshi
				customPeers,
				currentPeer: {
					host: "",
					port: "", //Default BTC ports are: "s": "50002" && "t": "50001"
				}
			};

		case actions.UPDATE_SETTINGS:
			return {
				...state,
				...action.payload
			};

		case actions.CLEAR_LOADING_SPINNER:
			return {
				...state,
				error: false,
				errorTitle: "",
				errorMsg: "",
				loading: false
			};

		case actions.RESET:
			return {
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: ""
			};

		default:
			return state;
	}
};
