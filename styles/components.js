import styled from "styled-components";
import {themes} from "./themes";
import _LinearGradient from "react-native-linear-gradient";

export const LinearGradient = styled(_LinearGradient).attrs((props) => ({
	colors: themes[props.theme.mode].gradient
}))`
  flex: 1
`;
