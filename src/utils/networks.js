// https://en.bitcoin.it/wiki/List_of_address_prefixes
const networks = {
	bitcoin: {
		messagePrefix: '\x18Bitcoin Signed Message:\n',
		bech32: 'bc',
		bip32: {
			public: 0x0488b21e,
			private: 0x0488ade4
		},
		pubKeyHash: 0x00,
		scriptHash: 0x05,
		wif: 0x80
	},
	bitcoinTestnet: {
		messagePrefix: '\x18Bitcoin Signed Message:\n',
		bech32: 'tb',
		bip32: {
			public: 0x043587cf,
			private: 0x04358394
		},
		pubKeyHash: 0x6f,
		scriptHash: 0xc4,
		wif: 0xef
	},
	litecoin: {
		messagePrefix: '\x19Litecoin Signed Message:\n',
		bech32: 'ltc',
		bip32: {
			public: 0x019da462,
			private: 0x019d9cfe
		},
		pubKeyHash: 0x30,
		scriptHash: 0x32,
		wif: 0xb0
	},
	litecoinTestnet: {
		messagePrefix: '\x18Litecoin Signed Message:\n',
		bech32: 'tltc',
		bip32: {
			public: 0x0436f6e1,
			private: 0x0436ef7d
		},
		pubKeyHash: 0x6f,
		scriptHash: 0x3a,
		wif: 0xef
	}
};

//Max amount of BTC/LTC.
const maxCoins = {
	bitcoin: 2100000000000000,
	bitcoinTestnet: 2100000000000000,
	litecoin: 8400000000000000,
	litecoinTestnet: 8400000000000000
};

//Returns an array of all available coins from the networks object.
const availableCoins = Object.keys(networks).map(coin => coin);

const supportsRbf = {
	bitcoin: true,
	bitcoinTestnet: true,
	litecoin: false,
	litecoinTestnet: false
};

const zeroValueItems = {
	bitcoin: 0,
	bitcoinTestnet: 0,
	litecoin: 0,
	litecoinTestnet: 0,
	timestamp: null
};

const arrayTypeItems = {
	bitcoin: [],
	bitcoinTestnet: [],
	litecoin: [],
	litecoinTestnet: [],
	timestamp: null
};

const objectTypeItems = {
	bitcoin: {},
	bitcoinTestnet: {},
	litecoin: {},
	litecoinTestnet: {},
	timestamp: null
};

const defaultWalletShape = {
	id: "",
	name: "",
	type: "default",
	addresses: arrayTypeItems,
	addressIndex: zeroValueItems,
	changeAddresses: arrayTypeItems,
	changeAddressIndex: zeroValueItems,
	utxos: arrayTypeItems,
	transactions: arrayTypeItems,
	blacklistedUtxos: arrayTypeItems,
	confirmedBalance: zeroValueItems,
	unconfirmedBalance: zeroValueItems,
	lastUpdated: zeroValueItems,
	hasBackedUpWallet: false,
	walletBackupTimestamp: "",
	keyDerivationPath: {
		bitcoin: "84",
		bitcoinTestnet: "84",
		litecoin: "84",
		litecoinTestnet: "84"
	},
	coinTypePath: {
		bitcoin: "0",
		bitcoinTestnet: "1",
		litecoin: "2",
		litecoinTestnet: "1"
	},
	addressType: { //Accepts bech32, segwit, legacy
		bitcoin: "bech32",
		bitcoinTestnet: "bech32",
		litecoin: "bech32",
		litecoinTestnet: "bech32"
	},
	rbfData: objectTypeItems
};

const getCoinImage = (coin = "bitcoin") => {
	try {
		coin = coin.toLowerCase();
		coin = coin.replace("testnet", "");

		switch (coin) {
			case "bitcoin":
				return require(`../assets/bitcoin.png`);
			case "litecoin":
				return require(`../assets/litecoin.png`);
			default:
				return require(`../assets/bitcoin.png`);
		}
	} catch (e) {
		return require(`../assets/bitcoin.png`);
	}
};

const getCoinData = ({ selectedCrypto = "bitcoin", cryptoUnit = "satoshi" }) => {
	try {
		let acronym = "BTC";
		let satoshi = "satoshi";
		let oshi = "sats";
		let blockTime = 10; //min
		switch (selectedCrypto) {
			case "bitcoin":
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				oshi = "sats";
				return { acronym, label: "Bitcoin", crypto: "BTC", satoshi, oshi, blockTime };
			case "bitcoinTestnet":
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				oshi = "sats";
				return { acronym, label: "Bitcoin Testnet", crypto: "BTC", satoshi, oshi, blockTime };
			case "litecoin":
				satoshi = "litoshi";
				oshi = "lits";
				acronym = cryptoUnit === "satoshi" ? "lits" : "LTC";
				blockTime = 2.5;
				return { acronym, label: "Litecoin", crypto: "LTC", satoshi, oshi, blockTime };
			case "litecoinTestnet":
				satoshi = "litoshi";
				oshi = "lits";
				acronym = cryptoUnit === "satoshi" ? "lits" : "LTC";
				blockTime = 2.5;
				return { acronym, label: "Litecoin Testnet", crypto: "LTC", satoshi, oshi, blockTime };
			default:
				acronym = cryptoUnit === "satoshi" ? "sats" : "BTC";
				return { acronym, label: "Bitcoin", crypto: "BTC", satoshi, oshi, blockTime };
		}
	} catch (e) {
		console.log(e);
	}
};

module.exports = {
	networks,
	availableCoins,
	defaultWalletShape,
	maxCoins,
	supportsRbf,
	zeroValueItems,
	arrayTypeItems,
	getCoinImage,
	getCoinData
};
