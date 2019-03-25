import { combineReducers } from "redux";

const appReducers = combineReducers({
	user: require("./user"),
	wallet: require("./wallet"),
	transaction: require("./transaction"),
	settings: require("./settings")
});

export default appReducers;
