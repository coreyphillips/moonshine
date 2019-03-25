import React, { PureComponent } from "react";
import Feather from "react-native-vector-icons/Feather";
import PropTypes from "prop-types";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity
} from "react-native";
import { systemWeights } from "react-native-typography";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");
const {
	setKeychainValue,
	getKeychainValue,
	vibrate,
	shuffleArray
} = require("../utils/helpers");

const ACTIVE_OPACITY = 0.2;

makeDots = (num) => {
	let ret = '';
	while (num > 0) {
		ret += ' ○ ';
		num--;
	}
	return ret;
};

class Pin extends PureComponent {
	constructor(props) {
		super(props);

		let digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		digits = shuffleArray(digits);
		let pinSetup = props.pinSetup ? props.pinSetup : false;

		this.state = {
			digits,
			value: "",
			tmpPin: "",
			pinSetup,
			pinSetupStep: 1,
			invalidPin: false
		}
	}

	async componentDidMount() {
		if (this.state.pinSetup === true) {
			await this.props.updateSettings({pin: false});
		}
	}

	async wipeDevice() {
		await this.props.wipeDevice();
		await this.props.onFailure();
		await this.props.updateSettings({ pinAttemptsRemaining: 5 });
	}

	handleClear({ ignoreVibrate = false} = {}) {
		if (!ignoreVibrate) vibrate();
		this.setState({value: ""});
	}

	handleRemove = () => {
		vibrate();
		const { value } = this.state;
		this.setState({value: value.substr(0, value.length - 1)});
	};

	handlePress(num) {
		vibrate();
		let { value } = this.state;
		value += String(num);

		this.setState({ value });
	}

	attemptToSignInWithPin = async () => {
		try {
			const pin = await getKeychainValue({ key: "pin" });
			//If Invalid Pin
			if (pin.error === false && this.state.value !== pin.data.password) {
				const { pinAttemptsRemaining } = this.props.settings;

				if (pinAttemptsRemaining <= 1) {
					//Wipe device. Too many attempts
					console.log("Pin attempt threshold breached. Wiping device. Hope you made a backup, friend.");
					await this.wipeDevice();
					if (pinAttemptsRemaining > 0)await this.props.updateSettings({ pinAttemptsRemaining: pinAttemptsRemaining-1 });
					vibrate(2000);
				} else {
					//Reduce the amount of pin attempts remaining.
					this.props.updateSettings({ pinAttemptsRemaining: pinAttemptsRemaining-1 });
				}

				this.handleClear();
				return;
			}

			//If Valid Pin
			if (pin.error === false && this.state.value === pin.data.password) {
				await this.props.updateSettings({ pinAttemptsRemaining: 5 });
				this.handleClear({ ignoreVibrate: true });
				this.props.onSuccess();
			}
		} catch (e) {
			console.log(e)
		}
	};

	setupPin = async () => {
		try {
			if (this.state.pinSetup && this.state.pinSetupStep === 1) {
				if (this.state.value.length < 1) return;
				await this.setState({ tmpPin: this.state.value });
				//await setKeychainValue({ key: "pin", value: this.state.value });
				//Randomize The Digits & Clear The Value
				const newDigits = shuffleArray(this.state.digits);
				this.setState({ digits: newDigits, pinSetupStep: 2, value: "", invalidPin: false });
				return;
			}

			if (this.state.pinSetup && this.state.pinSetupStep === 2) {
				const pin = this.state.tmpPin;
				if (this.state.value === pin) {
					await setKeychainValue({ key: "pin", value: this.state.value });
					await this.props.updateSettings({ pin: true });
					this.props.onSuccess();
					return;
				} else {
					//Invalid Pin (Try Again)
					vibrate(1000);
					//Randomize The Digits
					const newDigits = shuffleArray(this.state.digits);
					await this.setState({ tmpPin: "" });
					this.setState({ digits: newDigits, pinSetupStep: 1, value: "", invalidPin: true });
				}
			}
		} catch (e) {}
	};

	handleSubmit = () => {
		if (this.state.value.length < 1) return;
		vibrate();
		if (this.state.pinSetup === true) {
			this.setupPin();
		} else {
			this.attemptToSignInWithPin();
		}
	};

	renderButton(num) {
		return (
			<TouchableOpacity onPress={()=> this.handlePress(num)} activeOpacity={ACTIVE_OPACITY} style={styles.buttonContainer}>
				<Text
					style={styles.button}
				>
					{num}
				</Text>
			</TouchableOpacity>
		);
	}

	getDots = () => {
		try {
			if (this.state.value.length > 4) {
				return ` ● ● ● ●  +${this.state.value.length - 4}`
			} else {
				const marks = this.state.value.replace(/./g, ' ● ');
				const dots = makeDots(4-this.state.value.length);
				return `${marks}${dots}`;
			}
		} catch (e) {
			return makeDots(4);
		}
	};

	getHeaderText = () => {
		try {
			if (this.state.pinSetup) {
				if (this.state.pinSetupStep === 1) {
					return (
						<View style={{alignItems: "center", justifyContent: "center"}}>
							{this.state.invalidPin &&
							<Text style={styles.text}>
								Pins Did Not Match
							</Text>
							}
							<Text style={[styles.text, { fontSize: 24 }]}>
								Please Enter Your Pin
							</Text>
						</View>
					)
				} else {
					return (
						<View style={{ alignItems: "center", justifyContent: "center" }}>
							<Text style={[styles.text, { fontSize: 24 }]}>
								Please Re-Enter Your Pin
							</Text>
						</View>
					)
				}
			}
			return (
				<View style={{ alignItems: "center", justifyContent: "center" }}>
					<Text style={styles.header} >
						Enter pin:
					</Text>
					<Text style={styles.text}>
						{`Attempts Remaining: ${this.props.settings.pinAttemptsRemaining}`}
					</Text>
				</View>
			)
		} catch (e) {}
	};

	render() {
		return (
			<View style={[styles.container, { ...this.props.style }]}>

				<View style={[styles.row, { paddingHorizontal: 20 }]} >
					{this.getHeaderText()}
				</View>

				<View style={[styles.row, { paddingHorizontal: 20 }]} >
					<Text style={styles.dots} >{this.getDots()}</Text>
				</View>

				<View style={styles.row} >
					{this.renderButton(this.state.digits[0])}
					{this.renderButton(this.state.digits[1])}
					{this.renderButton(this.state.digits[2])}
				</View>

				<View style={styles.row} >
					{this.renderButton(this.state.digits[3])}
					{this.renderButton(this.state.digits[4])}
					{this.renderButton(this.state.digits[5])}
				</View>

				<View style={styles.row} >
					{this.renderButton(this.state.digits[6])}
					{this.renderButton(this.state.digits[7])}
					{this.renderButton(this.state.digits[8])}
				</View>

				<View style={styles.row} >
					<TouchableOpacity onPress={()=> this.handleClear()} activeOpacity={ACTIVE_OPACITY} style={[styles.buttonContainer, { borderWidth: 0 }]}>
						<Text style={styles.button}>C</Text>
					</TouchableOpacity>
					{this.renderButton(this.state.digits[9])}
					<TouchableOpacity onPress={this.handleRemove} activeOpacity={ACTIVE_OPACITY} style={[styles.buttonContainer, { borderWidth: 0 }]}>
						<Feather name={"arrow-left"} size={30} color={colors.white}/>
					</TouchableOpacity>
				</View>

				<View style={[styles.row, { marginTop: 20 }]} >
					<TouchableOpacity onPress={this.handleSubmit} activeOpacity={ACTIVE_OPACITY} style={styles.submitButton}>
						<Text style={styles.text}>Submit</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}
}

Pin.defaultProps = {
	style: {},
	onSuccess: () => null,
	onFailure: () => null
};

Pin.propTypes = {
	style: PropTypes.object,
	onSuccess: PropTypes.func.isRequired,
	onFailure: PropTypes.func.isRequired
};

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}, props) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		marginVertical: 80,
		zIndex: 300
	},
	header: {
		...systemWeights.light,
		color: colors.white,
		fontSize: 35
	},
	text: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 18,
		textAlign: "center",
		marginHorizontal: 20
	},
	dots: {
		...systemWeights.bold,
		color: colors.white,
		fontSize: 25
	},
	buttonContainer: {
		width: 60,
		height: 60,
		borderRadius: 100,
		borderWidth: 1,
		marginHorizontal: 25,
		backgroundColor: "transparent",
		borderColor: colors.white,
		alignItems:"center",
		justifyContent:"center"
	},
	submitButton: {
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderWidth: 1,
		borderColor: colors.white,
		backgroundColor: "transparent"
	},
	button: {
		...systemWeights.regular,
		fontSize: 25,
		justifyContent: "center",
		alignItems: "center",
		textAlign: "center",
		color: colors.white,
		opacity: 1
	},
	row: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	}
});

module.exports = connect(mapStateToProps, mapDispatchToProps)(Pin);