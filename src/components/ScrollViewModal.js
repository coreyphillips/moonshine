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

class ScrollViewModal extends Component {
	
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
				<View style={styles.modalContainer}>
					<ScrollView style={styles.modalScrollView}>
						{this.props.children}
					</ScrollView>
				</View>
			</Modal>
		);
	}
}

ScrollViewModal.defaultProps = {
	style: {},
	isVisible: false,
	onClose: () => null
};

ScrollViewModal.protoTypes = {
	style: PropTypes.object,
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
		borderWidth: 1,
		borderColor: colors.white,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 5,
		backgroundColor: colors.white
	}
});


module.exports = ScrollViewModal;