/**
 * @format
 * @lint-ignore-every XPLATJSCOPYRIGHT1
 */

/** @format */

import {AppRegistry} from 'react-native';
import Root from './src/components/Root';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => Root);