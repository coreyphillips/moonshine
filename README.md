# Bitbip

![](header.png)

> Bitbip is an open-source, non-custodial, Bitcoin/Litecoin Electrum wallet for iOS & Android.

CAUTION: **Caution:**
This app is still heavily in development. I encourage users to only utilize the Testnet chains at this time. Otherwise, please use at your own risk.

Built with React Native, Bitbip utilizes Electrum's JSON-RPC methods to interact with the Bitcoin/Litecoin network.

Bitbip's intended use is as a hot wallet.
Meaning, your keys are only as safe as the device you install this wallet on.
As with any hot wallet, please ensure that you keep only a small, responsible amount of Bitcoin/Litecoin on it at any given time.

If you are looking for secure cold storage solutions please consider purchasing a [Trezor](https://wallet.trezor.io) or a [Ledger](https://www.ledger.com/)

Bitbip's Alpha is available for download here:

* [iOS](https://testflight.apple.com/join/yTLqj9Xn)
* [Android](https://play.google.com/store/apps/details?id=com.kisswallet)

## Installation
* `git clone https://github.com/coreyphillips/bitbip`
* `cd bitbip`
* `yarn install && cd nodejs-assets/nodejs-project && yarn install && cd ../../`
* `react-native run ios` or `react-native run-android`

## Roadmap

* 0.1.0 Alpha - *Complete*
    * Bitcoin/Litecoin Mainnet & Testnet supported
    * Bech32 support
    * Multiple wallet support
    * Electrum
        * Support for both random and custom peer selection
    * Encrypted storage
    * Biometric + Pin authentication
    * Custom fee selection
    * Import mnemonic phrases via manual entry or scanning
* 0.2.0 Alpha
    * Add a UTXO selector to create custom transactions
        * This will allow users to select from a list of available utxo's to include in their transaction.
    * Implement coinselect (https://github.com/bitcoinjs/coinselect)
    * Add support for UTXO blacklisting
        * This will allow users to blacklist any utxo that they do not wish to include in their list of available utxo's when sending transactions. Blacklisting a utxo will also exclude it's amount from their total balance.
    * Allow users to manually select which public Electrum servers to randomly use if not connecting to their own node
    * Add support for p2sh & legacy addresses in settings
    * Add support for additional currencies in the settings
    * Support individual private key sweeping functionality
    * UI Improvements/Redesign:
        * Settings View
        * SelectCoin View

## Contributing

1. Fork it (<https://github.com/coreyphillips/bitbip>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

TODOS:
* Features:
    * Please see "0.2.0 Alpha" in Roadmap.
* Known, High-Priority Bugs:
    * Continuous manual refreshes can cause the app to improperly display transaction and balance data and sometimes requires the user to use the "Rescan Wallet" feature in Settings to correct it. This can be frustrating and stressful to the user for obvious reasons.
    * Quickly swapping between coins can cause the nodejs instance to hang, requiring the user restart the app in order to establish a stable connection to the Electrum server.

## Support

If you have any questions please feel free to create an issue on [Github](https://github.com/coreyphillips/bitbip/issues), reach out to me on [Twitter](https://twitter.com/coreylphillips) or send an email to support@ferrymanfin.com.

Please forward all feature requests to [Github](https://github.com/coreyphillips/bitbip/issues). 

## Meta

Corey Phillips – [@coreylphillips](https://twitter.com/coreylphillips)

Distributed under the MIT license. See ``LICENSE`` for more information.

[https://github.com/coreyphillips/bitbip](https://github.com/coreyphillips/bitbip)

## License [MIT](https://github.com/coreyphillips/bitbip/blob/master/LICENSE)
