import bitcoinUnits from "bitcoin-units";

const {
	Constants: {
		actions
	}
} = require("../../ProjectData.json");
const {
	walletHelpers
} = require("../utils/walletApi");
const moment = require("moment");

export const updateTransaction = (payload) => ({
	type: actions.UPDATE_TRANSACTION,
	payload
});

export const resetTransaction = (payload) => ({
	type: actions.RESET_TRANSACTION,
	payload
});

/*
TODO:
Recommended fees are always grossly overestimated.
Until this is resolved, getRecommendedFee divides that estimation by 4.
 */
export const getRecommendedFee = ({ coin = "bitcoin", transactionSize = 256 } = {}) => (dispatch) => {
	const DIVIDE_RECOMMENDED_FEE_BY = 4;
	const MAX_FEE_MULTIPLIER = 4;
	return new Promise(async (resolve) => {

		const failure = (errorTitle = "", errorMsg = "") => {
			resolve({ error: true, errorTitle, errorMsg });
		};

		let recommendedFee = 6;
		let maximumFee = 128;
		try {
			if (coin === "litecoin") {
				//TODO: Random Litecoin Electrum servers appear to have difficulty with the feeEstimate method. Remove this condition once the issue is resolved.
				const response = await fetch("https://bitcoinfees.earn.com/api/v1/fees/recommended");
				const jsonResponse = await response.json();
				recommendedFee = Math.round(jsonResponse.hourFee/DIVIDE_RECOMMENDED_FEE_BY);
			} else {
				const feeResponse = await walletHelpers.feeEstimate.default({ selectedCrypto: coin });
				if (!feeResponse.data.error && feeResponse.data > 0) {
					let feeInSats = bitcoinUnits(feeResponse.data, "BTC").to("satoshi").value();
					feeInSats = Math.round(feeInSats / transactionSize);
					try {recommendedFee = Math.round(feeInSats / DIVIDE_RECOMMENDED_FEE_BY);} catch (e) {}
				}
			}
			try {
				const suggestedMaximumFee = recommendedFee * MAX_FEE_MULTIPLIER;
				if (suggestedMaximumFee > maximumFee) maximumFee = suggestedMaximumFee;
			} catch (e) {}
		} catch (e) {
			console.log(e);
			failure();
		}
		if (recommendedFee < 1) recommendedFee = 1;
		const feeTimestamp = moment().format();
		const data = {
			recommendedFee,
			maximumFee,
			feeTimestamp
		};
		dispatch({
			type: actions.UPDATE_TRANSACTION,
			payload: data
		});

		resolve({ error: false, data });
	});
};

/*
export const sendTransactions = ({ transaction = {}, selectedCrypto = "", selectedCrypto = "", network = "mainnet" } = {}) => (dispatch: any) => {
	return new Promise(async (resolve) => {

		const failure = (errorTitle = "", errorMsg = "") => {
			resolve({ error: true, errorTitle, errorMsg });
		};

		const from = options.from;
		const to = transaction.address;
		const amount = transaction.amount;
		const amtSatoshi = amount;
		const bitcoinNetwork = bitcoin.networks[network];

		const feePerByte = await getFees(options.feesProvider, options.fee);
		const utxos = await options.utxoProvider(from);

		//Setup inputs from utxos
		var tx = new bitcoin.TransactionBuilder(bitcoinNetwork);
		var ninputs = 0;
		var availableSat = 0;
		for (var i = 0; i < utxos.length; i++) {
			var utxo = utxos[i];
			tx.addInput(utxo.txid, utxo.vout);
			availableSat += utxo.value;
			ninputs++;

			if (availableSat >= amtSatoshi) break;
			//}
		}

		if (availableSat < amtSatoshi) failure("You do not have enough in your wallet to send that much.");

		var change = availableSat - amtSatoshi;
		var fee = getTransactionSize(ninputs, change > 0 ? 2 : 1) * feePerByte;

		if (fee > amtSatoshi) failure("Bitcoin amount should be larger than the fee. (Ideally it should be MUCH larger)");
		tx.addOutput(to, amtSatoshi);
		if (change > 0) tx.addOutput(from, change - fee);

		var keyPair = bitcoin.ECPair.fromWIF(options.privKeyWIF, bitcoinNetwork);
		for (var i = 0; i < ninputs; i++) {
			tx.sign(i, keyPair);
		}
		var msg = tx.build().toHex();
		if (options.dryrun) {
			resolve({ error: false, data: msg });
		} else {
			const response = await options.pushtxProvider(msg);
			resolve({ error: false, data: {response, msg} })
		}

		dispatch({
			type: actions.SEND_TRANSACTION,
			payload: { recommendedFee, feeTimestamp: moment().format() }
		});

		resolve({ error: false, data: { recommendedFee } });
	});
};
*/

export const sendTransaction = ({ txHex = "", selectedCrypto = "bitcoin", sendTransactionFallback = true } = {}) => (dispatch) => {
	return new Promise(async (resolve) => {
		const failure = (data = "") => {
			resolve({ error: true, data });
		};
		try {
			//Attempt to push transaction via the currently connected electrum server
			let response = await walletHelpers.pushtx.default({ rawTx: txHex, selectedCrypto });
			//If an error occurred and sendTransactionFallback is enabled in Settings attempt to broadcast the transaction using either Blockstream or Chain.so's api.
			if (response.error === true && sendTransactionFallback === true) {
				response = await walletHelpers.pushtx.fallback({ rawTx: txHex, selectedCrypto });
			}
			//Dispatch SEND_TRANSACTION_SUCCESS if error === false
			if (response.error === false) {
				dispatch({
					type: actions.SEND_TRANSACTION_SUCCESS,
					payload: response
				});
			}
			resolve({ error: response.error, data: response.data });
		} catch (e) {
			console.log(e);
			failure(e);
		}
		failure();
	});
};
