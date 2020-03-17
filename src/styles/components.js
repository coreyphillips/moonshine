import styled from "styled-components";
import {themes} from "./themes";
import _LinearGradient from "react-native-linear-gradient";
import _QRCode from 'react-native-qrcode-svg';

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
`;

export const Text = styled.Text`
  color: ${props => props.type ? props.theme[props.type] : props.theme.text};
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
