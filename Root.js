import React from "react";
import {
	SafeAreaView,
	StyleSheet
} from "react-native";
import App from "./src/components/App";
import { createStore, applyMiddleware } from "redux";
import reducers from "./src/reducers";
import thunk from "redux-thunk";
import logger from "redux-logger";
import { PersistGate } from "redux-persist/integration/react";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-community/async-storage";

const {
	Constants: {
		colors
	}
} = require("./ProjectData.json");

const Provider = require("react-redux").Provider;
const { persistStore, persistReducer } = require("redux-persist");
const createStoreWithMiddleware = applyMiddleware(thunk, logger)(createStore);

const persistConfig = {
	key: 'root',
	storage: AsyncStorage,
};

const persistedReducer = persistReducer(persistConfig, reducers);

const store = createStoreWithMiddleware(persistedReducer);
const persistor = persistStore(store);

const Root = () => {
	return (
		<Provider store={store}>
			<PersistGate
				loading={<LinearGradient style={{ flex: 1 }} colors={["#8e45bf", "#7931ab", "#7931ab", "#68219b", "#5e1993", "#59158e", "#56128b"]} start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}} />}
				onBeforeLift={null}
				persistor={persistor}
			>
				<SafeAreaView style={styles.container}>
					<App />
				</SafeAreaView>
			</PersistGate>
		</Provider>
	);
};

module.exports = Root;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.darkPurple
	}
});
