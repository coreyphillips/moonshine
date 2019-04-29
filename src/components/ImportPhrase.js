import React, { PureComponent } from 'react';
import {
	StyleSheet,
	View,
	TextInput,
	Dimensions,
	Animated,
	TouchableOpacity
} from 'react-native';
import Camera from "./Camera";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import XButton from "./XButton";
import Button from "./Button";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const bip39 = require("bip39");
const { height } = Dimensions.get("window");

class ImportPhrase extends PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			mnemonic: "",
			displayCamera: false,
			cameraOpacity: new Animated.Value(0)
		};
	}

	mnemonicIsValid = (mnemonic = "") => {
		try {
			//const regex = /^[a-z][a-z\s]*$/;
			const re = /^[ a-z ]+$/;
			return re.test(mnemonic);
		} catch (e) {
		}
	};

	updateMnemonic = (mnemonic = "") => {
		try {
			if (mnemonic === "") this.setState({ mnemonic });
			mnemonic = mnemonic.toLowerCase();
			//Remove duplicate whitespaces/tabs/newlines
			mnemonic = mnemonic.replace(/\s\s+/g, " ");
			if (this.mnemonicIsValid(mnemonic)) {
				this.setState({ mnemonic });
			}
		} catch (e) {}
	};

	//Handles The "Camera" View Opacity Animation
	updateCamera = async ({ display = true, duration = 400 } = {}) => {
		return new Promise(async (resolve) => {
			try {
				this.setState({ displayCamera: display });
				Animated.timing(
					this.state.cameraOpacity,
					{
						toValue: display ? 1 : 0,
						duration
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({error: false});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	onBarCodeRead = async ({ data }) => {
		try {
			if (bip39.validateMnemonic(data)) {
				this.updateMnemonic(data);
				this.updateCamera({display: false});
				this.props.createNewWallet({ mnemonic: data });
			} else {
				await this.updateCamera({display: false});
				alert(`Unable to parse the following data:\n${data}`);
			}
		} catch (e) {
			console.log(e);
		}
	};

	createNewWallet = () => {
		try {
			const mnemonic = this.state.mnemonic;
			if (this.state.displayCamera) this.updateCamera({ display: false });
			if (mnemonic === "" || !bip39.validateMnemonic(mnemonic)) {
				alert("Invalid Mnemonic");
				return;
			}
			this.props.createNewWallet({ mnemonic });
		} catch (e) {
			console.log(e);
		}
	};

	render() {
		return (
			<View style={styles.container}>

				<View style={styles.textInputContainer}>
					<TextInput
						placeholder="Please enter your mnemonic phrase here with each word seperated by a space... Ex: (project globe magnet)"
						style={styles.textInput}
						selectionColor={colors.lightPurple}
						autoCapitalize="none"
						onChangeText={(mnemonic) => this.updateMnemonic(mnemonic)}
						value={this.state.mnemonic}
						multiline={true}
					/>
					<View style={styles.centerItem}>
						<TouchableOpacity onPress={() => this.updateCamera({ display: true })} style={styles.cameraIcon}>
							<EvilIcon style={{ bottom: -2 }} name={"camera"} size={40} color={colors.darkPurple} />
						</TouchableOpacity>
					</View>

					{bip39.validateMnemonic(this.state.mnemonic) &&
					<View style={styles.sendButton}>
						<Button title="Import Phrase" onPress={this.createNewWallet} />
					</View>}
				</View>

				{this.state.displayCamera &&
					<Animated.View style={[styles.camera, { opacity: this.state.cameraOpacity, zIndex: 1000 }]}>
						<Camera onClose={() => this.updateCamera({ display: false })} onBarCodeRead={this.onBarCodeRead} />
					</Animated.View>
				}

				{!this.state.displayCamera &&
				<Animated.View style={styles.xButton}>
					<XButton style={{ borderColor: "transparent" }} onPress={this.props.onBack} />
				</Animated.View>}
			</View>
		);
	}
}

ImportPhrase.defaultProps = {
	data: {},
	onBack: () => null
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	textInputContainer: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		top: height*-0.2,
		bottom: 0,
		left: 0,
		right: 0
	},
	textInput: {
		width: "80%",
		minHeight: 150,
		backgroundColor: colors.white,
		borderRadius: 10,
		padding: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		color: colors.purple,
		fontWeight: "bold"
	},
	camera: {
		flex: 1,
		zIndex: 500
	},
	centerItem: {
		zIndex: 10,
		alignItems:"center",
		justifyContent:"center",
		marginTop: 10
	},
	cameraIcon: {
		alignItems:"center",
		justifyContent:"center",
		width: 64,
		height: 64,
		backgroundColor: colors.white,
		borderRadius: 100
	},
	sendButton: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 50
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
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

module.exports = connect(mapStateToProps, mapDispatchToProps)(ImportPhrase);