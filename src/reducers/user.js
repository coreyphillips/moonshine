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
	isHydrated: false,
	isOnline: true
}, action) => {
	switch (action.type) {

		case actions.WIPE_DEVICE:
			return {
				loading: false,
				error: false,
				errorTitle: "",
				errorMsg: "",
				isHydrated: false,
				isOnline: true
			};

		case actions.UPDATE_USER:
			return {
				...state,
				...action.payload
			};

		//This allows the app to finish retrieving the persisted state
		case "persist/REHYDRATE":
			try {
				if (action.payload._persist.rehydrated === true) {
					return {
						...state,
						isHydrated: true
					};
				}
			} catch (e) {}
			return state;

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
				errorMsg: "",
				isHydrated: false
			};

		default:
			return state;
	}
};
