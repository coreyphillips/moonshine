// @flow weak
const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");

const {
	availableCoins
} = require("../utils/networks");

let peers = {};
let customPeers = {};
availableCoins.map(coin => {
	peers[coin] = [];
	customPeers[coin] = [];
});

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
	selectedService: "coingecko", //Exchange Rate Data Source (coincap, coingecko)
	testnet: false,
	cryptoUnit: "satoshi", //BTC, mBTC, μBTC or satoshi
	peers, //A list of peers acquired from default electrum servers using the getPeers method. Takes { host: "", port: "", protocol: "ssl" } Default ports for BTC are: "s": "50002" && "t": "50001"
	customPeers, //A list of peers added by the user to connect to by default in lieu of the default peer list. Takes { host: "", port: "", protocol: "ssl" } Default ports for BTC are: "s": "50002" && "t": "50001"
	currentPeer: {
		host: "",
		port: "", //Default ports for BTC are: "s": "50002" && "t": "50001"
	},
	sendTransactionFallback: true, //If electrum fails to broadcast a transaction for any reason the app will attempt to use an api to broadcast instead. Can be toggled on & off in Settings
	rbf: true,
	signMessage: {
		message: "",
		signature: "",
		selectedAddressIndex: 0
	},
	verifyMessage: {
		address: "",
		message: "",
		signature: ""
	},
	version: ""
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
				selectedService: "coingecko", //Exchange Rate Data Source (coincap, coingecko)
				testnet: true,
				cryptoUnit: "satoshi", //BTC, mBTC, μBTC or satoshi
				peers,
				customPeers,
				currentPeer: {
					host: "",
					port: "", //Default BTC ports are: "s": "50002" && "t": "50001"
				},
				sendTransactionFallback: true,
				rbf: true
			};

		case actions.UPDATE_SETTINGS:
			return {
				...state,
				...action.payload
			};
		
		case actions.UPDATE_PEERS_LIST:
			return {
				...state,
				peers: {
					...state.peers,
					[action.payload.coin]: action.payload.peers
				}
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
