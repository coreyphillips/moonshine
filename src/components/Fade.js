import React, { PureComponent } from "react";
import {
	StyleSheet,
	View
} from "react-native";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

class Fade extends PureComponent {
	getFade() {
		try {
			let arr = new Array(this.props.size).fill(null);
			const increment = 1/this.props.size;
			arr.map((item, i) => {
				return (
					<View key={i+increment} style={[ styles.opacityContainer, { height: 1, opacity: increment*i }]} />
				);
			});
		} catch (e) {
			console.log(e);
		}
	};

	render() {
		let arr = new Array(this.props.size).fill(null);
		const increment = 1/this.props.size;
		return (
			<View style={{ height: this.props.size }}>
				{arr.map((item, i) => {
					return (
						<View key={i+increment} style={[ styles.opacityContainer, { height: 1, opacity: increment*i }]} />
					);
				})}
			</View>
		);
	}
}

// Default values for props
Fade.defaultProps = {
	size: 30
};

const styles = StyleSheet.create({
	opacityContainer: {
		backgroundColor: colors.purple
	}
});


module.exports = Fade;