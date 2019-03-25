// @flow weak
const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");

module.exports = (state = {
	loading: false,
	error: false,
	errorTitle: "",
	errorMsg: "",

	address: "",
	amount: 0, //In satoshis
	fiatAmount: 0,
	fee: 0, //In satoshis
	recommendedFee: 6, //In satoshis
	maximumFee: 24, //In satoshis
	transactionSize: 250, //In bytes (250 is about normal)
	feeTimestamp: "",
	message: ""
}, action) => {
	switch (action.type) {

		case actions.WIPE_DEVICE:
			return {
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: "",
				address: "",
				amount: 0, //In satoshis
				fiatAmount: 0,
				fee: 0, //In satoshis
				recommendedFee: 6, //In satoshis
				maximumFee: 24, //In satoshis
				transactionSize: 250, //In bytes (250 is about normal)
				feeTimestamp: "",
				message: ""
			};

		case actions.UPDATE_TRANSACTION:
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

		case actions.RESET_TRANSACTION:
		case actions.SEND_TRANSACTION_SUCCESS:
		case actions.RESET:
			return {
				...state,
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: "",

				address: "",
				amount: 0,
				fiatAmount: 0,
				fee: 0,
				message: ""
			};

		default:
			return state;
	}
};
