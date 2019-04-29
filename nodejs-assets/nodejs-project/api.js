class API {
	constructor() {
		this.coin = "bitcoin";
		this.mainClient = {
			bitcoin: false,
			litecoin: false,
			bitcoinTestnet: false,
			litecoinTestnet: false
		};
		this.peer = {
			bitcoin: {},
			litecoin: {},
			bitcoinTestnet: {},
			litecoinTestnet: {}
		};
		this.peers = {
			bitcoin: [],
			litecoin: [],
			bitcoinTestnet: [],
			litecoinTestnet: []
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