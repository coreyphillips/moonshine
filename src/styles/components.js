import styled from "styled-components";
import {themes} from "./themes";
import _LinearGradient from "react-native-linear-gradient";

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
  border-width: ${props => props.theme.mode === "light" ? 3 : 1.5};
`;
