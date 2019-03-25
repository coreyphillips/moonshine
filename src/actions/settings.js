const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");
const {
	resetKeychainValue
} = require("../utils/helpers");

export const updateSettings = (payload) => ({
	type: actions.UPDATE_SETTINGS,
	payload
});

export const wipeDevice = () => (dispatch: any) => {
	return new Promise(async (resolve) => {
		const failure = (errorTitle = "", errorMsg = "") => {
			resolve({ error: true, errorTitle, errorMsg });
			return;
		};
		try {
			for(let i = 0; i < 100; i++) {
				const key = `wallet${i}`;
				await resetKeychainValue({ key });
			}
			dispatch({
				type: actions.WIPE_DEVICE
			});
			resolve({ error: false, data: "" });
		} catch (e) {
			console.log(e);
			failure(e);
		}
		failure();
	});
};