class API {
	constructor() {
		this.coin = "bitcoin";
		this.mainClient = {
			bitcoin: false,
			litecoin: false,
			bitcoinTestnet: false,
			litecoinTestnet: false,
			vertcoin: false
		};
		this.peer = {
			bitcoin: {},
			litecoin: {},
			bitcoinTestnet: {},
			litecoinTestnet: {},
			vertcoin: {}
		};
		this.peers = {
			bitcoin: [],
			litecoin: [],
			bitcoinTestnet: [],
			litecoinTestnet: [],
			vertcoin: []
		};
	}

	updateCoin(coin) {
		this.coin = coin;
	};

	updateMainClient(mainClient) {
		this.mainClient = mainClient;
	}

	updatePeer(peer) {
		this.peer = peer;
	}

}

module.exports = new API();