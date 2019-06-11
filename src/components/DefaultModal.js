import React, { Component } from "react";
import {
	StyleSheet,
	View,
	ScrollView
} from "react-native";
import PropTypes from "prop-types";
import Modal from "react-native-modal";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

class DefaultModal extends Component {
	
	shouldComponentUpdate(nextProps){
		return nextProps.isVisible !== this.props.isVisible;
	}
	
	render() {
		return (
			<Modal
				isVisible={this.props.isVisible}
				onBackdropPress={this.props.onClose}
				backdropOpacity={0.1}
				propagateSwipe={true}
			>
				<View style={[styles.modalContainer, { ...this.props.style }]}>
					{this.props.type === "ScrollView" &&
					<ScrollView  style={[styles.modalScrollView, { ...this.props.contentStyle }]}>
						{this.props.children}
					</ScrollView>}
					{this.props.type !== "ScrollView" &&
					<View  style={[styles.modalScrollView, { ...this.props.contentStyle }]}>
						{this.props.children}
					</View>
					}
				</View>
			</Modal>
		);
	}
}

DefaultModal.defaultProps = {
	style: {},
	contentStyle: {},
	isVisible: false,
	type: "ScrollView",
	onClose: () => null
};

DefaultModal.protoTypes = {
	style: PropTypes.object,
	contentStyle: PropTypes.object,
	type: PropTypes.string,
	isVisible: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
		alignSelf: "center",
		marginBottom: 80,
		marginTop: 25
	},
	modalScrollView: {
		flex: 1,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 5,
		backgroundColor: colors.white
	}
});


module.exports = DefaultModal;