/*
This file prevents the following issue:
https://github.com/janeasystems/nodejs-mobile-react-native#duplicate-module-name
*/
const blacklist = require('metro-config/src/defaults/blacklist');

module.exports = {
	resolver:{
		blacklistRE: blacklist([
			/nodejs-assets\/.*/,
			/android\/.*/,
			/ios\/.*/
		])
	},
};