### [1.6.2](https://github.com/rvagg/cborg/compare/v1.6.1...v1.6.2) (2022-02-21)


### Bug Fixes

* **diagnostic:** rework indenting algorithm to better handle recursives ([af47da1](https://github.com/rvagg/cborg/commit/af47da12835bd6d82982784ca4cd8903c4a966f1))

### [1.6.1](https://github.com/rvagg/cborg/compare/v1.6.0...v1.6.1) (2022-01-17)


### Bug Fixes

* **diagnostic:** handle zero-length recursives properly in diag output ([38ec7ea](https://github.com/rvagg/cborg/commit/38ec7ea054726bb8d71cc836019949e6b0e28d78))


### Trivial Changes

* **no-release:** bump actions/setup-node from 2.5.0 to 2.5.1 ([#38](https://github.com/rvagg/cborg/issues/38)) ([d46fae2](https://github.com/rvagg/cborg/commit/d46fae2c02641ddda0dfab21aa028d06ae6a8c13))

## [1.6.0](https://github.com/rvagg/cborg/compare/v1.5.4...v1.6.0) (2021-12-13)


### Features

* add support for coerceUndefinedToNull option ([fd61bbe](https://github.com/rvagg/cborg/commit/fd61bbe95bfbc255fa371ae8e1e241a96f31e211))


### Trivial Changes

* test and document coerceUndefinedToNull ([61fd015](https://github.com/rvagg/cborg/commit/61fd0150be586aef5518f2fa9f64456639bd2011))
* update deps & test setup ([1246122](https://github.com/rvagg/cborg/commit/1246122ace46bbc6ba18b07a66afd4cfb057a3e7))

### [1.5.4](https://github.com/rvagg/cborg/compare/v1.5.3...v1.5.4) (2021-12-08)


### Bug Fixes

* remove 'util' dependency ([875d5ea](https://github.com/rvagg/cborg/commit/875d5ea6cf226c6db8fc0a3fce6089592c9aadcd))


### Trivial Changes

* **deps-dev:** bump polendina from 1.1.1 to 2.0.0 ([9aeed6b](https://github.com/rvagg/cborg/commit/9aeed6bd2bbec7996b16dc8c2e00daa06721527e))
* expand browser testing to esm ([cc2a626](https://github.com/rvagg/cborg/commit/cc2a6261a9600abf005e46dc799940dca6626aaf))
* **no-release:** bump actions/setup-node from 2.4.1 to 2.5.0 ([#32](https://github.com/rvagg/cborg/issues/32)) ([5f7dba1](https://github.com/rvagg/cborg/commit/5f7dba1d1ade3e3da13db18d16635c2e01e71334))

### [1.5.3](https://github.com/rvagg/cborg/compare/v1.5.2...v1.5.3) (2021-11-04)


### Trivial Changes

* **deps:** bump actions/checkout from 2.3.5 to 2.4.0 ([8a76824](https://github.com/rvagg/cborg/commit/8a7682419ebc854cf83395627d67823e0403ef46))

### [1.5.2](https://github.com/rvagg/cborg/compare/v1.5.1...v1.5.2) (2021-10-18)


### Trivial Changes

* **deps,no-release:** bump actions/checkout from 2.3.4 to 2.3.5 ([#29](https://github.com/rvagg/cborg/issues/29)) ([fd0db75](https://github.com/rvagg/cborg/commit/fd0db75e19690541969d2aac8fb0d7d940be72a1))

### [1.5.1](https://github.com/rvagg/cborg/compare/v1.5.0...v1.5.1) (2021-09-28)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.4.0 to 2.4.1 ([a7a1d0c](https://github.com/rvagg/cborg/commit/a7a1d0cd11ce59481d8b1a0b9120cec27fda835d))

## [1.5.0](https://github.com/rvagg/cborg/compare/v1.4.2...v1.5.0) (2021-08-25)


### Features

* enhance CLI - more commands & accept stdin ([333b379](https://github.com/rvagg/cborg/commit/333b379190b9a27ce9ab4811a8417a566eaeb7ed))

### [1.4.2](https://github.com/rvagg/cborg/compare/v1.4.1...v1.4.2) (2021-08-23)


### Bug Fixes

* add a decimal point for whole number float tokens ([3a18861](https://github.com/rvagg/cborg/commit/3a18861dd8faff2af6ebd06f82b2d1a6dc691fbc))

### [1.4.1](https://github.com/rvagg/cborg/compare/v1.4.0...v1.4.1) (2021-08-05)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.3.2 to 2.4.0 ([eda1936](https://github.com/rvagg/cborg/commit/eda19366cb093caac5f3ce6e5bb94bd9b94dc988))

## [1.4.0](https://github.com/rvagg/cborg/compare/v1.3.8...v1.4.0) (2021-08-05)


### Features

* handle JSON decoding of large integers as BigInt ([dc87eb4](https://github.com/rvagg/cborg/commit/dc87eb47f7afcd71d51f2d849a92951567f9d565))
* use `allowBigInt` option so BigInt handling isn't a breaking change ([66d61b5](https://github.com/rvagg/cborg/commit/66d61b51ada9e5f189d4fbc0f52b2423052f5bb1))

### [1.3.8](https://github.com/rvagg/cborg/compare/v1.3.7...v1.3.8) (2021-08-05)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.3.1 to 2.3.2 ([3a3cdc1](https://github.com/rvagg/cborg/commit/3a3cdc18ef9aaccff971950279a5470623841b53))

### [1.3.7](https://github.com/rvagg/cborg/compare/v1.3.6...v1.3.7) (2021-08-03)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.3.0 to 2.3.1 ([8cd4583](https://github.com/rvagg/cborg/commit/8cd45837e249f23558f08dfa60193a020571a7d7))

### [1.3.6](https://github.com/rvagg/cborg/compare/v1.3.5...v1.3.6) (2021-07-20)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.2.0 to 2.3.0 ([7d4a786](https://github.com/rvagg/cborg/commit/7d4a786217281b0041d3003cf96246eca85a8630))

### [1.3.5](https://github.com/rvagg/cborg/compare/v1.3.4...v1.3.5) (2021-07-01)


### Trivial Changes

* **deps:** bump actions/setup-node from 2.1.5 to 2.2.0 ([661f195](https://github.com/rvagg/cborg/commit/661f195ebccf6da72e92478b8f3ba98c7b5a7f7c))

### [1.3.4](https://github.com/rvagg/cborg/compare/v1.3.3...v1.3.4) (2021-06-08)


### Trivial Changes

* **deps-dev:** bump mocha from 8.4.0 to 9.0.0 ([8ad0905](https://github.com/rvagg/cborg/commit/8ad0905f714a82a431e50d07390d2fc5f80070e8))

### [1.3.3](https://github.com/rvagg/cborg/compare/v1.3.2...v1.3.3) (2021-05-31)


### Trivial Changes

* **deps-dev:** bump ipld-garbage from 3.0.6 to 4.0.1 ([1615ec2](https://github.com/rvagg/cborg/commit/1615ec2251afed7bad4eb581c4975bf4913a10f7))

### [1.3.2](https://github.com/rvagg/cborg/compare/v1.3.1...v1.3.2) (2021-05-28)


### Bug Fixes

* handle tag indenting properly with diagnostic output ([5312923](https://github.com/rvagg/cborg/commit/5312923c5feb05224dd920efa4e7735208e971fe))


### Trivial Changes

* add semantic-release for auto-releases ([155de4c](https://github.com/rvagg/cborg/commit/155de4c06e00bfbbeb397f0b31142dc6a609c742))
* s/15/16 in node test matrix ([363920f](https://github.com/rvagg/cborg/commit/363920f48af7592453f630d6102db2714ebaa92c))
* **deps:** bump actions/checkout from 2 to 2.3.4 ([0846f50](https://github.com/rvagg/cborg/commit/0846f502204660ca3c7d76d675edff315a8695c7))
