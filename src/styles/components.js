import styled from "styled-components";
import {themes} from "./themes";
import _LinearGradient from "react-native-linear-gradient";
import _QRCode from 'react-native-qrcode-svg';
import _EvilIcon from "react-native-vector-icons/EvilIcons";
import _FontAwesome from "react-native-vector-icons/FontAwesome";
import _FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import _MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import _MaterialIcons from "react-native-vector-icons/MaterialIcons";
import _Fontisto from "react-native-vector-icons/Fontisto";
import _Foundation from "react-native-vector-icons/Foundation";
import _Ionicons from "react-native-vector-icons/Ionicons";
/**********************
General styles
 **********************/
export const LinearGradient = styled(_LinearGradient).attrs((props) => ({
	colors: themes[props.theme.mode].gradient
}))`
  flex: 1
`;

export const View = styled.View`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.background};
  ${props => props.borderColor ? `border-color: ${props.theme[props.borderColor]}` : null};
`;

export const ScrollView = styled.ScrollView`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.background};
`;

export const Text = styled.Text`
  color: ${props => props.type ? props.theme[props.type] : props.theme.text};
  ${props => props.backgroundColor ? `background-color: ${props.theme[props.backgroundColor]}` : null};
`;

export const TouchableOpacity = styled.TouchableOpacity`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.text};
  border-color: ${props => props.borderColor ? props.theme[props.borderColor] : props.theme.white}
`;

export const TouchableHighlight = styled.TouchableHighlight`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.text};
  border-color: ${props => props.theme.white};
  border-width: 1px
`;

export const TextInput = styled.TextInput.attrs((props) => ({
	placeholderTextColor: props.theme.mode === "light" ? props.theme.gray2 : props.theme.card,
	keyboardAppearance: props.theme.mode === "light" ? "light" : "dark"
}))`
  background-color: ${props => props.editable === false ? props.theme.uneditable : props.theme.background2};
  color: ${props => props.theme.text};
  border-color: ${props => props.theme.mode === "light" ? props.theme.text2 : "transparent"}
`;

export const EvilIcon = styled(_EvilIcon).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const FontAwesome = styled(_FontAwesome).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const FontAwesome5 = styled(_FontAwesome5).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const MaterialCommunityIcons = styled(_MaterialCommunityIcons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const MaterialIcons = styled(_MaterialIcons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Fontisto = styled(_Fontisto).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Foundation = styled(_Foundation).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Ionicons = styled(_Ionicons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const ActivityIndicator = styled.ActivityIndicator.attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

/**********************
Component-specific styles
 **********************/
export const XButton = styled.View`
  background-color: ${props => props.theme.background};
  border-color: ${props => props.theme.text};
  border-width: ${props => props.theme.mode === "light" ? "3px" : "1.5px"};
`;

export const QRCode = styled(_QRCode).attrs((props) => ({
	color: props.theme.PRIMARY,
	backgroundColor: props.theme.white
}))`
`;

export const CopiedLinearGradient = styled(_LinearGradient).attrs((props) => ({
	colors: props.theme.mode === "light" ? ["#7232a3", "#6e2fa0", "#662798", "#662898", "#632596"] : ["#393654", "#383552", "#373450", "#36344e", "#36334d"]
}))`
  flex: 1;
  border-color: ${props => props.theme.white};
`;
