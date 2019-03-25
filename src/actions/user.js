const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");

export const updateUser = (payload) => ({
	type: actions.UPDATE_USER,
	payload
});