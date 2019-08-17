import React, {useState, memo} from 'react';
import {
	StyleSheet,
	View,
	TextInput,
	Dimensions,
	Animated,
	TouchableOpacity
} from 'react-native';
import PropTypes from "prop-types";
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

interface ImportPhraseComponent {
	createNewWallet: Function,
	onBack: Function
}
const _ImportPhrase = ({ createNewWallet = () => null, onBack = () => null }: ImportPhraseComponent) => {
	const [mnemonic, setMnemonic] = useState("");
	const [displayCamera, setDisplayCamera] = useState(false);
	const [cameraOpacity] = useState(new Animated.Value(0));

	const mnemonicIsValid = (mnemonic = ""): boolean => {
		try {
			//const regex = /^[a-z][a-z\s]*$/;
			const re = /^[ a-z ]+$/;
			return re.test(mnemonic);
		} catch (e) {return false;}
	};

	const updateMnemonic = (mnemonic = ""): void => {
		try {
			if (mnemonic === "") setMnemonic(mnemonic);
			mnemonic = mnemonic.toLowerCase();
			//Remove duplicate whitespaces/tabs/newlines
			mnemonic = mnemonic.replace(/\s\s+/g, " ");
			if (mnemonicIsValid(mnemonic)) {
				setMnemonic(mnemonic);
			}
		} catch (e) {}
	};

	//Handles The "Camera" View Opacity Animation
	const updateCamera = async ({ display = true, duration = 400 } = {}): Promise<{ error: boolean, data: object | string }> => {
		return new Promise(async (resolve) => {
			try {
				setDisplayCamera(display);
				Animated.timing(
					cameraOpacity,
					{
						toValue: display ? 1 : 0,
						duration,
						useNativeDriver: true
					}
				).start(async () => {
					//Perform any other action after the update has been completed.
					resolve({error: false, data: ""});
				});
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};

	const onBarCodeRead = async (data): Promise<void> => {
		try {
			if (bip39.validateMnemonic(data)) {
				updateMnemonic(data);
				updateCamera({display: false});
				createNewWallet({ mnemonic: data });
			} else {
				await updateCamera({display: false});
				alert(`Unable to parse the following data:\n${data}`);
			}
		} catch (e) {
			console.log(e);
		}
	};

	const _createNewWallet = (): void => {
		try {
			if (displayCamera) updateCamera({ display: false });
			if (mnemonic === "" || !bip39.validateMnemonic(mnemonic)) {
				alert("Invalid Mnemonic");
				return;
			}
			createNewWallet({ mnemonic });
		} catch (e) {
			console.log(e);
		}
	};
	
	return (
		<View style={styles.container}>

			<View style={styles.textInputContainer}>
				<TextInput
					placeholder="Please enter your mnemonic phrase here with each word seperated by a space... Ex: (project globe magnet)"
					style={styles.textInput}
					selectionColor={colors.lightPurple}
					autoCapitalize="none"
					onChangeText={(mnemonic) => updateMnemonic(mnemonic)}
					value={mnemonic}
					multiline={true}
				/>
				<View style={styles.centerItem}>
					<TouchableOpacity onPress={() => updateCamera({ display: true })} style={styles.cameraIcon}>
						<EvilIcon style={{ bottom: -2 }} name={"camera"} size={40} color={colors.darkPurple} />
					</TouchableOpacity>
				</View>

				{bip39.validateMnemonic(mnemonic) &&
				<View style={styles.sendButton}>
					<Button title="Import Phrase" onPress={_createNewWallet} />
				</View>}
			</View>

			{displayCamera &&
				<Animated.View style={[styles.camera, { opacity: cameraOpacity, zIndex: 1000 }]}>
					<Camera onClose={() => updateCamera({ display: false })} onBarCodeRead={(data) => onBarCodeRead(data)} />
				</Animated.View>
			}

			{!displayCamera &&
			<Animated.View style={styles.xButton}>
				<XButton style={{ borderColor: "transparent" }} onPress={onBack} />
			</Animated.View>}
		</View>
	);
};

_ImportPhrase.propTypes = {
	createNewWallet: PropTypes.func.isRequired,
	onBack: PropTypes.func.isRequired
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

//ComponentShouldNotUpdate
const ImportPhrase = memo(
	_ImportPhrase,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps === nextProps;
	}
);
export default ImportPhrase;
