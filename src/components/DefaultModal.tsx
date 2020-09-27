import React, { memo } from "react";
import {
	StyleSheet,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import Modal from "react-native-modal";
import { View, ScrollView } from "../styles/components";

interface DefaultModalComponent {
	isVisible: boolean,
	onClose?: () => void,
	style?: object,
	contentStyle?: object,
	type?: string,
	children: object
}
const _DefaultModal = ({ isVisible = false, onClose = () => null, style = {}, contentStyle = {}, type = "ScrollView", children = {} }: DefaultModalComponent) => {

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={onClose}
			backdropOpacity={0.1}
			propagateSwipe={true}
			onBackButtonPress={onClose}
		>
			<View type="background" borderColor="gray3" style={[styles.modalContainer, style]}>
				{type === "ScrollView" &&
				<ScrollView
					type="background"
					style={[styles.modalScrollView,
						{ ...contentStyle }]}
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}
					keyboardShouldPersistTaps={"handled"}
					contentContainerStyle={{ flexGrow:1 }}
				>
					{children}
				</ScrollView>}
				{type !== "ScrollView" &&
				<View type="background" style={[styles.modalScrollView, { ...contentStyle }]}>
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
		height: Platform.OS === "ios" ? "80%" : "84%",
		borderWidth: 5,
		borderRadius: 20
	},
	modalScrollView: {
		flex: 1,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 5
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
