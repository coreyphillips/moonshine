import React, { useEffect, memo } from "react";
import {
	StyleSheet,
	View,
	ScrollView,
	LayoutAnimation,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import Modal from "react-native-modal";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface DefaultModalComponent {
	isVisible: boolean,
	onClose: () => void,
	style?: object,
	contentStyle?: object,
	type?: string,
	children: object
}
const _DefaultModal = ({ isVisible = false, onClose = () => null, style = {}, contentStyle = {}, type = "ScrollView", children = {} }: DefaultModalComponent) => {
	
	//if (Platform.OS === "ios") useEffect(() => LayoutAnimation.easeInEaseOut());
	
	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={onClose}
			backdropOpacity={0.1}
			propagateSwipe={true}
		>
			<View style={[styles.modalContainer, style]}>
				{type === "ScrollView" &&
				<ScrollView  style={[styles.modalScrollView, { ...contentStyle }]}>
					{children}
				</ScrollView>}
				{type !== "ScrollView" &&
				<View  style={[styles.modalScrollView, { ...contentStyle }]}>
					{children}
				</View>
				}
			</View>
		</Modal>
	);
};

_DefaultModal.protoTypes = {
	isVisible: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	children: PropTypes.object.isRequired,
	style: PropTypes.object,
	contentStyle: PropTypes.object,
	type: PropTypes.string
};

const styles = StyleSheet.create({
	modalContainer: {
		alignSelf: "center",
		width: "100%",
		height: Platform.OS === "ios" ? "80%" : "84%"
	},
	modalScrollView: {
		flex: 1,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 5,
		backgroundColor: colors.white
	},
});

//ComponentShouldNotUpdate
const DefaultModal = memo(
	_DefaultModal,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.isVisible === prevProps.isVisible &&
			nextProps.children === prevProps.children
		);
	}
);

export default DefaultModal;
