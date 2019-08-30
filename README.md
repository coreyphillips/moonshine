<img align="left" width="80" height="80" src="./src/assets/main_icon.png" alt="Moonshine Icon">

# Moonshine
Moonshine's alpha is available for testing on [iOS](https://testflight.apple.com/join/yTLqj9Xn) & [Android](https://play.google.com/store/apps/details?id=com.kisswallet)

<p style="align-items: center">
  <img src="./src/assets/screenshots/send_transaction.png" width="33%" alt="Send Transaction" />
  <img src="./src/assets/screenshots/main.png" width="33%" alt="Main"/> 
  <img src="./src/assets/screenshots/receive_transaction.png" width="33%" alt="Receive Transaction" />
</p>

> Moonshine is a homebrewed, open-source, non-custodial, Bitcoin/Litecoin Electrum wallet for iOS & Android.

CAUTION: **Caution:**
This app is still heavily in development. Please use at your own risk.

Built with React Native, Moonshine utilizes Electrum's JSON-RPC methods to interact with the Bitcoin/Litecoin network.

Moonshine's intended use is as a hot wallet.
Meaning, your keys are only as safe as the device you install this wallet on.
As with any hot wallet, please ensure that you keep only a small, responsible amount of Bitcoin/Litecoin on it at any given time.

If you are looking for secure cold storage solutions please consider purchasing a [Trezor](https://wallet.trezor.io) or a [Ledger](https://www.ledger.com/)

## Installation
#### Without LND:
1. LND isn't fully implemented in this app yet so if you do not wish to use Lightning or go through the process of generating any .aar & .framework files you can simply checkout the commit prior to the LND implementation and run the project like so:
    ```
    git clone https://github.com/coreyphillips/moonshine
    cd moonshine
    git checkout 79d1e65879dac8dc2fd5bcd4401ec8e462100813
    yarn install && cd nodejs-assets/nodejs-project && yarn install && cd ../../
    react-native run ios or react-native run-android
    ```
#### With LND:
1. Generate the Lndmobile.aar & Lndmobile.framework files:
    * For the most recent build to work you will need to generate the Lndmobile.aar & Lndmobile.framework files and add them to `moonshine/android/Lndmobile` & `moonshine/ios/lightning` respectively. The instructions to generate these files can be found [here](https://github.com/lightningnetwork/lnd/pull/3282) for now.
2. Clone and Install Project Dependencies:
   ```
    git clone https://github.com/coreyphillips/moonshine
    cd moonshine
    yarn install && cd nodejs-assets/nodejs-project && yarn install && cd ../../
    ```
3. Add the Lndmobile.aar file to `moonshine/android/Lndmobile` and Lndmobile.framework file to `moonshine/ios/lightning` and run the project:
    ```
    react-native run ios or react-native run-android
    ```
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
* 0.2.0 Alpha - *Complete*
    * Implement RBF functionality
    * Add BIP39 Passphrase functionality
    * Add support for Segwit-compatible & legacy addresses in settings
    * Allow users to select the key derivation path in settings
    * Support individual private key sweeping functionality
    * *Partially Complete (0.1.1)* - Add support for UTXO blacklisting - Blacklist functionality can be accessed via the Transaction Detail view for now.
        * This allows users to blacklist any utxo that they do not wish to include in their list of available utxo's when sending transactions. Blacklisting a utxo excludes it's amount from the wallet's total balance.
* 0.3.0 Alpha
    * Add support for Lightning via Neutrino
    * Transition to TypeScript
    * Add a UTXO selector to create custom transactions
        * This will allow users to select from a list of available utxo's to include in their transaction.
    * Add support for additional currencies in the settings
    * Allow users to manually select which public Electrum servers to randomly use if not connecting to their own node
    
## Contributing

1. Fork it (<https://github.com/coreyphillips/moonshine>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

## Altcoin Support
Please be aware and take note that my primary focus is on expanding the core functionality of this wallet and not on adding altcoins. However, for those wishing to add a specific altcoin for personal use, I have created the following guide so that you may fork off in a proper fashion:
[Altcoin Implementation Guide](https://gist.github.com/coreyphillips/91de5d15964797054988522664cc3150)
 
 If you have any questions regarding this guide I'm always happy to help so don't hesitate to reach out.

## Support

Supported Derivation Paths: m/0' | 44' | 49' | 84' /0'/0'

If you have any questions, feature requests, etc., please feel free to create an issue on [Github](https://github.com/coreyphillips/moonshine/issues), reach out to me on [Twitter](https://twitter.com/coreylphillips) or send an email to corey@ferrymanfin.com.

## Meta

Corey Phillips – [@coreylphillips](https://twitter.com/coreylphillips)

Distributed under the MIT license. See ``LICENSE`` for more information.

[https://github.com/coreyphillips/moonshine](https://github.com/coreyphillips/moonshine)

## License [MIT](https://github.com/coreyphillips/moonshine/blob/master/LICENSE)

## Acknowledgments
* Giant shoutout to the authors and contributors of the following projects along with everyone who has taken the time to provide feedback and help me through this process of learning and development. You are all awesome:
    * [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
        * For providing a powerful library with detailed documentation capable of handling all of the necessary client-side, Bitcoin-related heavy-lifting.
    * [Electrum](https://electrum.org)
        * For providing a simple and flexible way to interact with the Bitcoin network.
    * [Lightning-App](https://github.com/lightninglabs/lightning-app)
        * For providing the initial inspiration for the main UI of this app and for providing a wonderful guide/example of how to implement Lightning via Neutrino.
