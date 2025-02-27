'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, OrderNotFound, InvalidOrder, BadRequest, AuthenticationError, RateLimitExceeded, RequestTimeout, BadSymbol, AddressPending, PermissionDenied, InsufficientFunds } = require ('./base/errors');
const { ROUND, TICK_SIZE } = require ('./base/functions/number');
const Precise = require ('./base/Precise');

// ---------------------------------------------------------------------------

module.exports = class vcc extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'vcc',
            'name': 'VCC Exchange',
            'countries': [ 'VN' ], // Vietnam
            'rateLimit': 1000,
            'version': 'v3',
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'addMargin': false,
                'cancelAllOrders': true,
                'cancelOrder': true,
                'createOrder': true,
                'createReduceOnlyOrder': false,
                'createStopLimitOrder': true,
                'createStopMarketOrder': true,
                'createStopOrder': true,
                'editOrder': undefined,
                'fetchBalance': true,
                'fetchBorrowRate': false,
                'fetchBorrowRateHistories': false,
                'fetchBorrowRateHistory': false,
                'fetchBorrowRates': false,
                'fetchBorrowRatesPerSymbol': false,
                'fetchClosedOrders': true,
                'fetchCurrencies': true,
                'fetchDepositAddress': true,
                'fetchDeposits': true,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchLeverage': false,
                'fetchLeverageTiers': false,
                'fetchMarginMode': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenInterestHistory': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrders': undefined,
                'fetchPosition': false,
                'fetchPositionMode': false,
                'fetchPositions': false,
                'fetchPositionsRisk': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': 'emulated',
                'fetchTickers': true,
                'fetchTrades': true,
                'fetchTradingFee': true,
                'fetchTradingFees': undefined,
                'fetchTransactions': true,
                'fetchTransfer': false,
                'fetchTransfers': false,
                'fetchWithdrawals': true,
                'reduceMargin': false,
                'setLeverage': false,
                'setMarginMode': false,
                'setPositionMode': false,
                'transfer': false,
                'withdraw': false,
            },
            'timeframes': {
                '1m': '60000',
                '5m': '300000',
                '15m': '900000',
                '30m': '1800000',
                '1h': '3600000',
                '2h': '7200000',
                '4h': '14400000',
                '6h': '21600000',
                '12h': '43200000',
                '1d': '86400000',
                '1w': '604800000',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/100545356-8427f500-326c-11eb-9539-7d338242d61b.jpg',
                'api': {
                    'public': 'https://api.vcc.exchange',
                    'private': 'https://api.vcc.exchange',
                },
                'www': 'https://vcc.exchange',
                'doc': [
                    'https://vcc.exchange/api',
                ],
                'fees': 'https://support.vcc.exchange/hc/en-us/articles/360016401754',
                'referral': 'https://vcc.exchange?ref=l4xhrH',
            },
            'api': {
                'public': {
                    'get': [
                        'summary',
                        'exchange_info',
                        'assets', // Available Currencies
                        'ticker', // Ticker list for all symbols
                        'trades/{market_pair}', // Recent trades
                        'orderbook/{market_pair}', // Orderbook
                        'chart/bars', // Candles
                        'tick_sizes',
                    ],
                },
                'private': {
                    'get': [
                        'user',
                        'balance', // Get trading balance
                        'orders/{order_id}', // Get a single order by order_id
                        'orders/open', // Get open orders
                        'orders', // Get closed orders
                        'orders/trades', // Get trades history
                        'deposit-address', // Generate or get deposit address
                        'transactions', // Get deposit/withdrawal history
                    ],
                    'post': [
                        'orders', // Create new order
                    ],
                    'put': [
                        'orders/{order_id}/cancel', // Cancel order
                        'orders/cancel-by-type',
                        'orders/cancel-all',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': this.parseNumber ('0.002'),
                    'taker': this.parseNumber ('0.002'),
                },
            },
            'precisionMode': TICK_SIZE,
            'exceptions': {
                'exact': {},
                'broad': {
                    'limit may not be greater than': BadRequest, // {"message":"The given data was invalid.","errors":{"limit":["The limit may not be greater than 1000."]}}
                    'Insufficient balance': InsufficientFunds, // {"message":"Insufficient balance."}
                    'Unauthenticated': AuthenticationError, // {"message":"Unauthenticated."} // wrong api key
                    'signature is invalid': AuthenticationError, // {"message":"The given data was invalid.","errors":{"signature":["HMAC signature is invalid"]}}
                    'Timeout': RequestTimeout, // {"code":504,"message":"Gateway Timeout","description":""}
                    'Too many requests': RateLimitExceeded, // {"code":429,"message":"Too many requests","description":"Too many requests"}
                    'quantity field is required': InvalidOrder, // {"message":"The given data was invalid.","errors":{"quantity":["The quantity field is required when type is market."]}}
                    'price field is required': InvalidOrder,  // {"message":"The given data was invalid.","errors":{"price":["The price field is required when type is limit."]}}
                    'error_security_level': PermissionDenied, // {"message":"error_security_level"}
                    'pair is invalid': BadSymbol, // {"message":"The given data was invalid.","errors":{"coin":["Trading pair is invalid","Trading pair is offline"]}}
                    // {"message":"The given data was invalid.","errors":{"type":["The selected type is invalid."]}}
                    // {"message":"The given data was invalid.","errors":{"trade_type":["The selected trade type is invalid."]}}
                    'type is invalid': InvalidOrder,
                    'Data not found': OrderNotFound, // {"message":"Data not found"}
                },
            },
        });
    }

    async fetchMarkets (params = {}) {
        /**
         * @method
         * @name vcc#fetchMarkets
         * @description retrieves data on all markets for vcc
         * @param {dict} params extra parameters specific to the exchange api endpoint
         * @returns {[dict]} an array of objects representing market data
         */
        const response = await this.publicGetExchangeInfo (params);
        //
        //     {
        //         "message":null,
        //         "dataVersion":"4677e56a42f0c29872f3a6e75f5d39d2f07c748c",
        //         "data":{
        //             "timezone":"UTC",
        //             "serverTime":1605821914333,
        //             "symbols":[
        //                 {
        //                     "id":"btcvnd",
        //                     "symbol":"BTC\/VND",
        //                     "coin":"btc",
        //                     "currency":"vnd",
        //                     "baseId":1,
        //                     "quoteId":0,
        //                     "active":true,
        //                     "base_precision":"0.0000010000",
        //                     "quote_precision":"1.0000000000",
        //                     "minimum_quantity":"0.0000010000",
        //                     "minimum_amount":"250000.0000000000",
        //                     "precision":{"price":0,"amount":6,"cost":6},
        //                     "limits":{
        //                         "amount":{"min":"0.0000010000"},
        //                         "price":{"min":"1.0000000000"},
        //                         "cost":{"min":"250000.0000000000"},
        //                     },
        //                 },
        //             ],
        //         },
        //     }
        //
        const data = this.safeValue (response, 'data');
        const markets = this.safeValue (data, 'symbols', []);
        const result = [];
        for (let i = 0; i < markets.length; i++) {
            const market = this.safeValue (markets, i);
            const symbol = this.safeString (market, 'symbol');
            const id = symbol.replace ('/', '_');
            const baseId = this.safeString (market, 'coin');
            const quoteId = this.safeString (market, 'currency');
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            const precision = this.safeValue (market, 'precision', {});
            const limits = this.safeValue (market, 'limits', {});
            const amountLimits = this.safeValue (limits, 'amount', {});
            const priceLimits = this.safeValue (limits, 'price', {});
            const costLimits = this.safeValue (limits, 'cost', {});
            const entry = {
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'settle': undefined,
                'baseId': baseId,
                'quoteId': quoteId,
                'settledId': undefined,
                'type': 'spot',
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'active': this.safeValue (market, 'active'),
                'contract': false,
                'linear': undefined,
                'inverse': undefined,
                'contractSize': undefined,
                'expiry': undefined,
                'expiryDatetime': undefined,
                'strike': undefined,
                'optionType': undefined,
                'precision': {
                    'amount': this.parseNumber (this.parsePrecision (this.safeString (precision, 'amount'))),
                    'price': this.parseNumber (this.parsePrecision (this.safeString (precision, 'price'))),
                    'cost': this.parseNumber (this.parsePrecision (this.safeString (precision, 'cost'))),
                },
                'limits': {
                    'leverage': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'amount': {
                        'min': this.safeNumber (amountLimits, 'min'),
                        'max': undefined,
                    },
                    'price': {
                        'min': this.safeNumber (priceLimits, 'min'),
                        'max': undefined,
                    },
                    'cost': {
                        'min': this.safeNumber (costLimits, 'min'),
                        'max': undefined,
                    },
                },
                'info': market,
            };
            result.push (entry);
        }
        return result;
    }

    async fetchCurrencies (params = {}) {
        /**
         * @method
         * @name vcc#fetchCurrencies
         * @description fetches all available currencies on an exchange
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} an associative dictionary of currencies
         */
        const response = await this.publicGetAssets (params);
        //
        //     {
        //         "message":null,
        //         "dataVersion":"2514c8012d94ea375018fc13e0b5d4d896e435df",
        //         "data":{
        //             "BTC":{
        //                 "name":"Bitcoin",
        //                 "unified_cryptoasset_id":1,
        //                 "can_withdraw":1,
        //                 "can_deposit":1,
        //                 "min_withdraw":"0.0011250000",
        //                 "max_withdraw":"100.0000000000",
        //                 "maker_fee":"0.002",
        //                 "taker_fee":"0.002",
        //                 "decimal":8,
        //                 "withdrawal_fee":"0.0006250000",
        //             },
        //         },
        //     }
        //
        const result = {};
        const data = this.safeValue (response, 'data', []);
        const ids = Object.keys (data);
        for (let i = 0; i < ids.length; i++) {
            const id = this.safeStringLower (ids, i);
            const currency = this.safeValue (data, ids[i]);
            const code = this.safeCurrencyCode (id);
            const canDeposit = this.safeInteger (currency, 'can_deposit');
            const canWithdraw = this.safeInteger (currency, 'can_withdraw');
            const active = (canDeposit && canWithdraw);
            const depositEnabled = (canDeposit === 1);
            const withdrawEnabled = (canWithdraw === 1);
            result[code] = {
                'id': id,
                'code': code,
                'name': this.safeString (currency, 'name'),
                'active': active,
                'deposit': depositEnabled,
                'withdraw': withdrawEnabled,
                'fee': this.safeNumber (currency, 'withdrawal_fee'),
                'precision': this.parseNumber (this.parsePrecision (this.safeString (currency, 'decimal'))),
                'limits': {
                    'withdraw': {
                        'min': this.safeNumber (currency, 'min_withdraw'),
                        'max': this.safeNumber (currency, 'max_withdraw'),
                    },
                },
            };
        }
        return result;
    }

    async fetchTradingFee (symbol, params = {}) {
        /**
         * @method
         * @name vcc#fetchTradingFee
         * @description fetch the trading fees for a market
         * @param {str} symbol unified market symbol
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} a [fee structure]{@link https://docs.ccxt.com/en/latest/manual.html#fee-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = this.extend ({
            'symbol': market['id'],
        }, this.omit (params, 'symbol'));
        const response = await this.privateGetTradingFeeSymbol (request);
        //
        //     {
        //         takeLiquidityRate: '0.001',
        //         provideLiquidityRate: '-0.0001'
        //     }
        //
        return {
            'info': response,
            'maker': this.safeNumber (response, 'provideLiquidityRate'),
            'taker': this.safeNumber (response, 'takeLiquidityRate'),
        };
    }

    parseBalance (response) {
        const data = this.safeValue (response, 'data', {});
        const result = {
            'info': response,
            'timestamp': undefined,
            'datetime': undefined,
        };
        const currencyIds = Object.keys (data);
        for (let i = 0; i < currencyIds.length; i++) {
            const currencyId = currencyIds[i];
            const code = this.safeCurrencyCode (currencyId);
            const balance = this.safeValue (data, currencyId);
            const account = this.account ();
            account['free'] = this.safeString (balance, 'available_balance');
            account['total'] = this.safeString (balance, 'balance');
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    async fetchBalance (params = {}) {
        /**
         * @method
         * @name vcc#fetchBalance
         * @description query for balance and get the amount of funds available for trading or funds locked in orders
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} a [balance structure]{@link https://docs.ccxt.com/en/latest/manual.html?#balance-structure}
         */
        await this.loadMarkets ();
        const response = await this.privateGetBalance (params);
        //
        //     {
        //         "message":null,
        //         "dataVersion":"7168e6c99e90f60673070944d987988eef7d91fa",
        //         "data":{
        //             "vnd":{"balance":0,"available_balance":0},
        //             "btc":{"balance":0,"available_balance":0},
        //             "eth":{"balance":0,"available_balance":0},
        //         },
        //     }
        //
        return this.parseBalance (response);
    }

    parseOHLCV (ohlcv, market = undefined) {
        //
        //     {
        //         "low":"415805323.0000000000",
        //         "high":"415805323.0000000000",
        //         "open":"415805323.0000000000",
        //         "close":"415805323.0000000000",
        //         "time":"1605845940000",
        //         "volume":"0.0065930000",
        //         "opening_time":1605845963263,
        //         "closing_time":1605845963263
        //     }
        //
        return [
            this.safeInteger (ohlcv, 'time'),
            this.safeNumber (ohlcv, 'open'),
            this.safeNumber (ohlcv, 'high'),
            this.safeNumber (ohlcv, 'low'),
            this.safeNumber (ohlcv, 'close'),
            this.safeNumber (ohlcv, 'volume'),
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchOHLCV
         * @description fetches historical candlestick data containing the open, high, low, and close price, and the volume of a market
         * @param {str} symbol unified symbol of the market to fetch OHLCV data for
         * @param {str} timeframe the length of time each candle represents
         * @param {int|undefined} since timestamp in ms of the earliest candle to fetch
         * @param {int|undefined} limit the maximum amount of candles to fetch
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[[int]]} A list of candles ordered as timestamp, open, high, low, close, volume
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'coin': market['baseId'],
            'currency': market['quoteId'],
            'resolution': this.timeframes[timeframe],
        };
        limit = (limit === undefined) ? 100 : limit;
        limit = Math.min (100, limit);
        const duration = this.parseTimeframe (timeframe);
        if (since === undefined) {
            const end = this.seconds ();
            request['to'] = end;
            request['from'] = end - limit * duration;
        } else {
            const start = parseInt (since / 1000);
            request['from'] = start;
            request['to'] = this.sum (start, limit * duration);
        }
        const response = await this.publicGetChartBars (this.extend (request, params));
        //
        //     [
        //         {"low":"415805323.0000000000","high":"415805323.0000000000","open":"415805323.0000000000","close":"415805323.0000000000","time":"1605845940000","volume":"0.0065930000","opening_time":1605845963263,"closing_time":1605845963263},
        //         {"low":"416344148.0000000000","high":"416344148.0000000000","open":"415805323.0000000000","close":"416344148.0000000000","time":"1605846000000","volume":"0.0052810000","opening_time":1605846011490,"closing_time":1605846011490},
        //         {"low":"416299269.0000000000","high":"417278376.0000000000","open":"416344148.0000000000","close":"417278376.0000000000","time":"1605846060000","volume":"0.0136750000","opening_time":1605846070727,"closing_time":1605846102282},
        //     ]
        //
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchOrderBook
         * @description fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
         * @param {str} symbol unified symbol of the market to fetch the order book for
         * @param {int|undefined} limit the maximum amount of order book entries to return
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} A dictionary of [order book structures]{@link https://docs.ccxt.com/en/latest/manual.html#order-book-structure} indexed by market symbols
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market_pair': market['id'],
            // 'depth': 0, // 0 = full orderbook, 5, 10, 20, 50, 100, 500
            'level': 2, // 1 = best bidask, 2 = aggregated by price, 3 = no aggregation
        };
        if (limit !== undefined) {
            if ((limit !== 0) && (limit !== 5) && (limit !== 10) && (limit !== 20) && (limit !== 50) && (limit !== 100) && (limit !== 500)) {
                throw new BadRequest (this.id + ' fetchOrderBook() limit must be 0, 5, 10, 20, 50, 100, 500 if specified');
            }
            request['depth'] = limit;
        }
        const response = await this.publicGetOrderbookMarketPair (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"376cee43af26deabcd3762ab11a876b6e7a71e82",
        //         "data":{
        //             "bids":[
        //                 ["413342637.0000000000","0.165089"],
        //                 ["413274576.0000000000","0.03"],
        //                 ["413274574.0000000000","0.03"],
        //             ],
        //             "asks":[
        //                 ["416979125.0000000000","0.122835"],
        //                 ["417248934.0000000000","0.030006"],
        //                 ["417458879.0000000000","0.1517"],
        //             ],
        //             "timestamp":"1605841619147"
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data');
        const timestamp = this.safeValue (data, 'timestamp');
        return this.parseOrderBook (data, symbol, timestamp, 'bids', 'asks', 0, 1);
    }

    parseTicker (ticker, market = undefined) {
        //
        //     {
        //         "base_id":1,
        //         "quote_id":0,
        //         "last_price":"411119457",
        //         "max_price":"419893173.0000000000",
        //         "min_price":"401292577.0000000000",
        //         "open_price":null,
        //         "base_volume":"10.5915050000",
        //         "quote_volume":"4367495977.4484430060",
        //         "isFrozen":0
        //     }
        //
        const timestamp = this.milliseconds ();
        const baseVolume = this.safeString (ticker, 'base_volume');
        const quoteVolume = this.safeString (ticker, 'quote_volume');
        const open = this.safeString (ticker, 'open_price');
        const last = this.safeString (ticker, 'last_price');
        const symbol = this.safeSymbol (undefined, market);
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeString (ticker, 'max_price'),
            'low': this.safeString (ticker, 'min_price'),
            'bid': this.safeString (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeString (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        }, market);
    }

    async fetchTickers (symbols = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchTickers
         * @description fetches price tickers for multiple markets, statistical calculations with the information calculated over the past 24 hours each market
         * @param {[str]|undefined} symbols unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} an array of [ticker structures]{@link https://docs.ccxt.com/en/latest/manual.html#ticker-structure}
         */
        await this.loadMarkets ();
        const response = await this.publicGetTicker (params);
        //
        //     {
        //         "message":null,
        //         "dataVersion":"fc521161aebe506178b8588cd2adb598eaf1018e",
        //         "data":{
        //             "BTC_VND":{
        //                 "base_id":1,
        //                 "quote_id":0,
        //                 "last_price":"411119457",
        //                 "max_price":"419893173.0000000000",
        //                 "min_price":"401292577.0000000000",
        //                 "open_price":null,
        //                 "base_volume":"10.5915050000",
        //                 "quote_volume":"4367495977.4484430060",
        //                 "isFrozen":0
        //             },
        //         }
        //     }
        //
        const result = {};
        const data = this.safeValue (response, 'data', {});
        const marketIds = Object.keys (data);
        for (let i = 0; i < marketIds.length; i++) {
            const marketId = marketIds[i];
            const market = this.safeMarket (marketId, undefined, '_');
            const symbol = market['symbol'];
            result[symbol] = this.parseTicker (data[marketId], market);
        }
        return this.filterByArray (result, 'symbol', symbols);
    }

    parseTrade (trade, market = undefined) {
        //
        // public fetchTrades
        //
        //     {
        //         "trade_id":181509285,
        //         "price":"415933022.0000000000",
        //         "base_volume":"0.0022080000",
        //         "quote_volume":"918380.1125760000",
        //         "trade_timestamp":1605842150357,
        //         "type":"buy",
        //     }
        //
        // private fetchMyTrades
        //
        //     {
        //         "trade_type":"sell",
        //         "fee":"0.0610578086",
        //         "id":1483372,
        //         "created_at":1606581578368,
        //         "currency":"usdt",
        //         "coin":"btc",
        //         "price":"17667.1900000000",
        //         "quantity":"0.0017280000",
        //         "amount":"30.5289043200",
        //     }
        //
        const timestamp = this.safeInteger2 (trade, 'trade_timestamp', 'created_at');
        const baseId = this.safeStringUpper (trade, 'coin');
        const quoteId = this.safeStringUpper (trade, 'currency');
        let marketId = undefined;
        if ((baseId !== undefined) && (quoteId !== undefined)) {
            marketId = baseId + '_' + quoteId;
        }
        market = this.safeMarket (marketId, market, '_');
        const symbol = market['symbol'];
        const priceString = this.safeString (trade, 'price');
        const amountString = this.safeString2 (trade, 'base_volume', 'quantity');
        const price = this.parseNumber (priceString);
        const amount = this.parseNumber (amountString);
        let cost = this.safeNumber2 (trade, 'quote_volume', 'amount');
        if (cost === undefined) {
            cost = this.parseNumber (Precise.stringMul (priceString, amountString));
        }
        const side = this.safeString2 (trade, 'type', 'trade_type');
        const id = this.safeString2 (trade, 'trade_id', 'id');
        const feeCost = this.safeNumber (trade, 'fee');
        let fee = undefined;
        if (feeCost !== undefined) {
            fee = {
                'cost': feeCost,
                'currency': market['quote'],
            };
        }
        return {
            'info': trade,
            'id': id,
            'order': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': side,
            'takerOrMaker': undefined,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchTrades
         * @description get the list of most recent trades for a particular symbol
         * @param {str} symbol unified symbol of the market to fetch trades for
         * @param {int|undefined} since timestamp in ms of the earliest trade to fetch
         * @param {int|undefined} limit the maximum amount of trades to fetch
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [trade structures]{@link https://docs.ccxt.com/en/latest/manual.html?#public-trades}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market_pair': market['id'],
            // 'type': 'buy', // 'sell'
            // 'count': limit, // default 500, max 1000
        };
        if (limit !== undefined) {
            request['count'] = Math.min (1000, limit);
        }
        const response = await this.publicGetTradesMarketPair (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"1f811b533143f739008a3e4ecaaab2ec82ea50d4",
        //         "data":[
        //             {
        //                 "trade_id":181509285,
        //                 "price":"415933022.0000000000",
        //                 "base_volume":"0.0022080000",
        //                 "quote_volume":"918380.1125760000",
        //                 "trade_timestamp":1605842150357,
        //                 "type":"buy",
        //             },
        //         ],
        //     }
        //
        const data = this.safeValue (response, 'data');
        return this.parseTrades (data, market, since, limit);
    }

    async fetchTransactions (code = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchTransactions
         * @description fetch history of deposits and withdrawals
         * @param {str|undefined} code unified currency code for the currency of the transactions, default is undefined
         * @param {int|undefined} since timestamp in ms of the earliest transaction, default is undefined
         * @param {int|undefined} limit max number of transactions to return, default is undefined
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} a list of [transaction structure]{@link https://docs.ccxt.com/en/latest/manual.html#transaction-structure}
         */
        await this.loadMarkets ();
        const request = {
            // 'type': type, // 'deposit', 'withdraw'
            // 'start': parseInt (since / 1000),
            // 'end': this.seconds (),
        };
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
            request['currency'] = currency['id'];
        }
        if (limit !== undefined) {
            request['limit'] = Math.min (1000, limit);
        }
        if (since !== undefined) {
            request['start'] = since;
        }
        const response = await this.privateGetTransactions (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"1fdfb0ec85b666871d62fe59d098d01839b05e97",
        //         "data":{
        //             "current_page":1,
        //             "data":[
        //                 {
        //                     "id":85391,
        //                     "user_id":253063,
        //                     "transaction_id":"0x885719cee5910ca509a223d208797510e80eb27a2f1d51a71bb4ccb82d538131",
        //                     "internal_transaction_id":null,
        //                     "temp_transaction_id":"2367",
        //                     "currency":"usdt",
        //                     "amount":"30.0000000000",
        //                     "btc_amount":"0.0000000000",
        //                     "usdt_amount":"0.0000000000",
        //                     "fee":"0.0000000000",
        //                     "tx_cost":"0.0000000000",
        //                     "confirmation":0,
        //                     "deposit_code":null,
        //                     "status":"success",
        //                     "bank_name":null,
        //                     "foreign_bank_account":null,
        //                     "foreign_bank_account_holder":null,
        //                     "blockchain_address":"0xd54b84AD27E4c4a8C9E0b2b53701DeFc728f6E44",
        //                     "destination_tag":null,
        //                     "error_detail":null,
        //                     "refunded":"0.0000000000",
        //                     "transaction_date":"2020-11-28",
        //                     "transaction_timestamp":"1606563143.959",
        //                     "created_at":1606563143959,
        //                     "updated_at":1606563143959,
        //                     "transaction_email_timestamp":0,
        //                     "network":null,
        //                     "collect_tx_id":null,
        //                     "collect_id":null
        //                 }
        //             ],
        //             "first_page_url":"http:\/\/api.vcc.exchange\/v3\/transactions?page=1",
        //             "from":1,
        //             "last_page":1,
        //             "last_page_url":"http:\/\/api.vcc.exchange\/v3\/transactions?page=1",
        //             "next_page_url":null,
        //             "path":"http:\/\/api.vcc.exchange\/v3\/transactions",
        //             "per_page":10,
        //             "prev_page_url":null,
        //             "to":1,
        //             "total":1
        //         }
        //     }
        //
        let data = this.safeValue (response, 'data', {});
        data = this.safeValue (data, 'data', []);
        return this.parseTransactions (data, currency, since, limit);
    }

    async fetchDeposits (code = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchDeposits
         * @description fetch all deposits made to an account
         * @param {str|undefined} code unified currency code
         * @param {int|undefined} since the earliest time in ms to fetch deposits for
         * @param {int|undefined} limit the maximum number of deposits structures to retrieve
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [transaction structures]{@link https://docs.ccxt.com/en/latest/manual.html#transaction-structure}
         */
        const request = { 'type': 'deposit' };
        return await this.fetchTransactions (code, since, limit, this.extend (request, params));
    }

    async fetchWithdrawals (code = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchWithdrawals
         * @description fetch all withdrawals made from an account
         * @param {str|undefined} code unified currency code
         * @param {int|undefined} since the earliest time in ms to fetch withdrawals for
         * @param {int|undefined} limit the maximum number of withdrawals structures to retrieve
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [transaction structures]{@link https://docs.ccxt.com/en/latest/manual.html#transaction-structure}
         */
        const request = { 'type': 'withdraw' };
        return await this.fetchTransactions (code, since, limit, this.extend (request, params));
    }

    parseTransaction (transaction, currency = undefined) {
        //
        // fetchTransactions, fetchDeposits, fetchWithdrawals
        //
        //     {
        //         "id":85391,
        //         "user_id":253063,
        //         "transaction_id":"0x885719cee5910ca509a223d208797510e80eb27a2f1d51a71bb4ccb82d538131",
        //         "internal_transaction_id":null,
        //         "temp_transaction_id":"2367",
        //         "currency":"usdt",
        //         "amount":"30.0000000000",
        //         "btc_amount":"0.0000000000",
        //         "usdt_amount":"0.0000000000",
        //         "fee":"0.0000000000",
        //         "tx_cost":"0.0000000000",
        //         "confirmation":0,
        //         "deposit_code":null,
        //         "status":"success",
        //         "bank_name":null,
        //         "foreign_bank_account":null,
        //         "foreign_bank_account_holder":null,
        //         "blockchain_address":"0xd54b84AD27E4c4a8C9E0b2b53701DeFc728f6E44",
        //         "destination_tag":null,
        //         "error_detail":null,
        //         "refunded":"0.0000000000",
        //         "transaction_date":"2020-11-28",
        //         "transaction_timestamp":"1606563143.959",
        //         "created_at":1606563143959,
        //         "updated_at":1606563143959,
        //         "transaction_email_timestamp":0,
        //         "network":null,
        //         "collect_tx_id":null,
        //         "collect_id":null
        //     }
        //
        const id = this.safeString (transaction, 'id');
        const timestamp = this.safeInteger (transaction, 'created_at');
        const updated = this.safeInteger (transaction, 'updated_at');
        const currencyId = this.safeString (transaction, 'currency');
        const code = this.safeCurrencyCode (currencyId, currency);
        const status = this.parseTransactionStatus (this.safeString (transaction, 'status'));
        let amount = this.safeNumber (transaction, 'amount');
        if (amount !== undefined) {
            amount = Math.abs (amount);
        }
        const address = this.safeString (transaction, 'blockchain_address');
        const txid = this.safeString (transaction, 'transaction_id');
        const tag = this.safeString (transaction, 'destination_tag');
        let fee = undefined;
        const feeCost = this.safeNumber (transaction, 'fee');
        if (feeCost !== undefined) {
            fee = {
                'cost': feeCost,
                'currency': code,
            };
        }
        const type = (amount > 0) ? 'deposit' : 'withdrawal';
        const network = this.safeString (transaction, 'network');
        return {
            'info': transaction,
            'id': id,
            'txid': txid,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'network': network,
            'address': address,
            'addressTo': address,
            'addressFrom': undefined,
            'tag': tag,
            'tagTo': tag,
            'tagFrom': undefined,
            'type': type,
            'amount': amount,
            'currency': code,
            'status': status,
            'updated': updated,
            'fee': fee,
        };
    }

    parseTransactionStatus (status) {
        const statuses = {
            'pending': 'pending',
            'error': 'failed',
            'success': 'ok',
            'cancel': 'canceled',
        };
        return this.safeString (statuses, status, status);
    }

    parseTransactionType (type) {
        const types = {
            'deposit': 'deposit',
            'withdraw': 'withdrawal',
        };
        return this.safeString (types, type, type);
    }

    costToPrecision (symbol, cost) {
        return this.decimalToPrecision (cost, ROUND, this.markets[symbol]['precision']['cost'], this.precisionMode, this.paddingMode);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        /**
         * @method
         * @name vcc#createOrder
         * @description create a trade order
         * @param {str} symbol unified symbol of the market to create an order in
         * @param {str} type 'market' or 'limit'
         * @param {str} side 'buy' or 'sell'
         * @param {float} amount how much of currency you want to trade in units of base currency
         * @param {float|undefined} price the price at which the order is to be fullfilled, in units of the quote currency, ignored in market orders
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} an [order structure]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'coin': market['baseId'],
            'currency': market['quoteId'],
            'trade_type': side,
            'type': type,
        };
        if (type === 'ceiling_market') {
            const ceiling = this.safeValue (params, 'ceiling');
            if (ceiling !== undefined) {
                request['ceiling'] = this.costToPrecision (symbol, ceiling);
            } else if (price !== undefined) {
                request['ceiling'] = this.costToPrecision (symbol, amount * price);
            } else {
                throw new InvalidOrder (this.id + ' createOrder() requires a price argument or a ceiling parameter for ' + type + ' orders');
            }
        } else {
            request['quantity'] = this.amountToPrecision (symbol, amount);
        }
        if (type === 'limit') {
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const stopPrice = this.safeValue2 (params, 'stop_price', 'stopPrice');
        if (stopPrice !== undefined) {
            request['is_stop'] = 1;
            request['stop_condition'] = (side === 'buy') ? 'le' : 'ge'; // ge = greater than or equal, le = less than or equal
            request['stop_price'] = this.priceToPrecision (symbol, stopPrice);
        }
        params = this.omit (params, [ 'stop_price', 'stopPrice' ]);
        const response = await this.privatePostOrders (this.extend (request, params));
        //
        // ceiling_market order
        //
        //     {
        //         "message":null,
        //         "dataVersion":"213fc0d433f38307f736cae1cbda4cc310469b7a",
        //         "data":{
        //             "coin":"btc",
        //             "currency":"usdt",
        //             "trade_type":"buy",
        //             "type":"ceiling_market",
        //             "ceiling":"30",
        //             "user_id":253063,
        //             "email":"igor.kroitor@gmail.com",
        //             "side":"buy",
        //             "quantity":"0.00172800",
        //             "status":"pending",
        //             "fee":0,
        //             "created_at":1606571333035,
        //             "updated_at":1606571333035,
        //             "instrument_symbol":"BTCUSDT",
        //             "remaining":"0.00172800",
        //             "fee_rate":"0.002",
        //             "id":88214435
        //         }
        //     }
        //
        // limit order
        //
        //     {
        //         "message":null,
        //         "dataVersion":"d9b1159d2bcefa2388be156e32ddc7cc324400ee",
        //         "data":{
        //             "id":41230,
        //             "trade_type":"sell",
        //             "type":"limit",
        //             "quantity":"1",
        //             "price":"14.99",
        //             "currency":"usdt",
        //             "coin":"neo",
        //             "status":"pending",
        //             "is_stop": "1",
        //             "stop_price": "13",
        //             "stop_condition": "ge",
        //             "fee":0,
        //             "created_at":1560244052168,
        //             "updated_at":1560244052168
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data');
        return this.parseOrder (data, market);
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        /**
         * @method
         * @name vcc#cancelOrder
         * @description cancels an open order
         * @param {str} id order id
         * @param {str|undefined} symbol not used by vcc cancelOrder ()
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} An [order structure]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        await this.loadMarkets ();
        const request = {
            'order_id': id,
        };
        const response = await this.privatePutOrdersOrderIdCancel (this.extend (request, params));
        return this.parseOrder (response);
    }

    async cancelAllOrders (symbol = undefined, params = {}) {
        /**
         * @method
         * @name vcc#cancelAllOrders
         * @description cancel all open orders
         * @param {str|undefined} symbol unified market symbol, only orders in the market of this symbol are cancelled when symbol is not undefined
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [order structures]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        const type = this.safeString (params, 'type');
        const method = (type === undefined) ? 'privatePutOrdersCancelAll' : 'privatePutOrdersCancelByType';
        const request = {};
        if (type !== undefined) {
            request['type'] = type;
        }
        await this.loadMarkets ();
        const response = await this[method] (this.extend (request, params));
        //
        //     {
        //         "dataVersion":"6d72fb82a9c613c8166581a887e1723ce5a937ff",
        //         "data":{
        //             "data":[
        //                 {
        //                     "id":410,
        //                     "trade_type":"sell",
        //                     "currency":"usdt",
        //                     "coin":"neo",
        //                     "type":"limit",
        //                     "quantity":"1.0000000000",
        //                     "price":"14.9900000000",
        //                     "executed_quantity":"0.0000000000",
        //                     "executed_price":"0.0000000000",
        //                     "fee":"0.0000000000",
        //                     "status":"canceled",
        //                     "created_at":1560244052168,
        //                     "updated_at":1560244052168,
        //                 },
        //             ],
        //         },
        //     }
        //
        let data = this.safeValue (response, 'data', {});
        data = this.safeValue (response, 'data', []);
        return this.parseOrders (data);
    }

    parseOrderStatus (status) {
        const statuses = {
            'pending': 'open',
            'stopping': 'open',
            'executing': 'open',
            'executed': 'closed',
            'canceled': 'canceled',
        };
        return this.safeString (statuses, status, status);
    }

    parseOrder (order, market = undefined) {
        //
        // ceiling_market
        //
        //     {
        //         "coin":"btc",
        //         "currency":"usdt",
        //         "trade_type":"buy",
        //         "type":"ceiling_market",
        //         "ceiling":"30",
        //         "user_id":253063,
        //         "email":"igor.kroitor@gmail.com",
        //         "side":"buy",
        //         "quantity":"0.00172800",
        //         "status":"pending",
        //         "fee":0,
        //         "created_at":1606571333035,
        //         "updated_at":1606571333035,
        //         "instrument_symbol":"BTCUSDT",
        //         "remaining":"0.00172800",
        //         "fee_rate":"0.002",
        //         "id":88214435
        //     }
        //
        // limit order
        //
        //     {
        //         "id":41230,
        //         "trade_type":"sell",
        //         "type":"limit",
        //         "quantity":"1",
        //         "price":"14.99",
        //         "currency":"usdt",
        //         "coin":"neo",
        //         "status":"pending",
        //         "is_stop": "1",
        //         "stop_price": "13",
        //         "stop_condition": "ge",
        //         "fee":0,
        //         "created_at":1560244052168,
        //         "updated_at":1560244052168
        //     }
        //
        const created = this.safeValue (order, 'created_at');
        const updated = this.safeValue (order, 'updated_at');
        const baseId = this.safeStringUpper (order, 'coin');
        const quoteId = this.safeStringUpper (order, 'currency');
        const marketId = baseId + '_' + quoteId;
        market = this.safeMarket (marketId, market, '_');
        const symbol = market['symbol'];
        const amount = this.safeString (order, 'quantity');
        const filled = this.safeString (order, 'executed_quantity');
        const status = this.parseOrderStatus (this.safeString (order, 'status'));
        const cost = this.safeString (order, 'ceiling');
        const id = this.safeString (order, 'id');
        const price = this.safeString (order, 'price');
        const average = this.safeString (order, 'executed_price');
        const remaining = this.safeString (order, 'remaining');
        const type = this.safeString (order, 'type');
        const side = this.safeString (order, 'trade_type');
        const fee = {
            'currency': market['quote'],
            'cost': this.safeNumber (order, 'fee'),
            'rate': this.safeNumber (order, 'fee_rate'),
        };
        let lastTradeTimestamp = undefined;
        if (updated !== created) {
            lastTradeTimestamp = updated;
        }
        const stopPrice = this.safeNumber (order, 'stopPrice');
        return this.safeOrder ({
            'id': id,
            'clientOrderId': id,
            'timestamp': created,
            'datetime': this.iso8601 (created),
            'lastTradeTimestamp': lastTradeTimestamp,
            'status': status,
            'symbol': symbol,
            'type': type,
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': side,
            'price': price,
            'stopPrice': stopPrice,
            'average': average,
            'amount': amount,
            'cost': cost,
            'filled': filled,
            'remaining': remaining,
            'fee': fee,
            'trades': undefined,
            'info': order,
        }, market);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchOrder
         * @description fetches information on an order made by the user
         * @param {str|undefined} symbol not used by vcc fetchOrder
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} An [order structure]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        await this.loadMarkets ();
        const request = {
            'order_id': id,
        };
        const response = await this.privateGetOrdersOrderId (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"57448aa1fb8f227254e8e2e925b3ade8e1e5bbef",
        //         "data":{
        //             "id":88265741,
        //             "user_id":253063,
        //             "email":"igor.kroitor@gmail.com",
        //             "updated_at":1606581578141,
        //             "created_at":1606581578141,
        //             "coin":"btc",
        //             "currency":"usdt",
        //             "type":"market",
        //             "trade_type":"sell",
        //             "executed_price":"17667.1900000000",
        //             "price":null,
        //             "executed_quantity":"0.0017280000",
        //             "quantity":"0.0017280000",
        //             "fee":"0.0610578086",
        //             "status":"executed",
        //             "is_stop":0,
        //             "stop_condition":null,
        //             "stop_price":null,
        //             "ceiling":null
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data');
        return this.parseOrder (data);
    }

    async fetchOrdersWithMethod (method, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            // 'page': 1,
            // 'limit': limit, // max 1000
            // 'start_date': since,
            // 'end_date': this.milliseconds (),
            // 'currency': market['quoteId'],
            // 'coin': market['baseId'],
            // 'trade_type': 'buy', // or 'sell'
            // 'hide_canceled': 0, // 1 to exclude canceled orders
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['coin'] = market['baseId'];
            request['currency'] = market['quoteId'];
        }
        if (since !== undefined) {
            request['start_date'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = Math.min (1000, limit); // max 1000
        }
        const response = await this[method] (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"89aa11497f23fdd34cf9de9c55acfad863c78780",
        //         "data":{
        //             "current_page":1,
        //             "data":[
        //                 {
        //                     "id":88489678,
        //                     "email":"igor.kroitor@gmail.com",
        //                     "updated_at":1606628593567,
        //                     "created_at":1606628593567,
        //                     "coin":"btc",
        //                     "currency":"usdt",
        //                     "type":"limit",
        //                     "trade_type":"buy",
        //                     "executed_price":"0.0000000000",
        //                     "price":"10000.0000000000",
        //                     "executed_quantity":"0.0000000000",
        //                     "quantity":"0.0010000000",
        //                     "fee":"0.0000000000",
        //                     "status":"pending",
        //                     "is_stop":0,
        //                     "stop_condition":null,
        //                     "stop_price":null,
        //                     "ceiling":null,
        //                 },
        //             ],
        //             "first_page_url":"http:\/\/api.vcc.exchange\/v3\/orders\/open?page=1",
        //             "from":1,
        //             "last_page":1,
        //             "last_page_url":"http:\/\/api.vcc.exchange\/v3\/orders\/open?page=1",
        //             "next_page_url":null,
        //             "path":"http:\/\/api.vcc.exchange\/v3\/orders\/open",
        //             "per_page":10,
        //             "prev_page_url":null,
        //             "to":1,
        //             "total":1,
        //         },
        //     }
        //
        let data = this.safeValue (response, 'data', {});
        data = this.safeValue (data, 'data', []);
        return this.parseOrders (data, market, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchOpenOrders
         * @description fetch all unfilled currently open orders
         * @param {str|undefined} symbol unified market symbol
         * @param {int|undefined} since the earliest time in ms to fetch open orders for
         * @param {int|undefined} limit the maximum number of  open orders structures to retrieve
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [order structures]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        return await this.fetchOrdersWithMethod ('privateGetOrdersOpen', symbol, since, limit, params);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchClosedOrders
         * @description fetches information on multiple closed orders made by the user
         * @param {str|undefined} symbol unified market symbol of the market orders were made in
         * @param {int|undefined} since the earliest time in ms to fetch orders for
         * @param {int|undefined} limit the maximum number of  orde structures to retrieve
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [order structures]{@link https://docs.ccxt.com/en/latest/manual.html#order-structure}
         */
        return await this.fetchOrdersWithMethod ('privateGetOrders', symbol, since, limit, params);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name vcc#fetchMyTrades
         * @description fetch all trades made by the user
         * @param {str|undefined} symbol unified market symbol
         * @param {int|undefined} since the earliest time in ms to fetch trades for
         * @param {int|undefined} limit the maximum number of trades structures to retrieve
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {[dict]} a list of [trade structures]{@link https://docs.ccxt.com/en/latest/manual.html#trade-structure}
         */
        await this.loadMarkets ();
        const request = {
            // 'page': 1,
            // 'limit': limit, // max 1000
            // 'start_date': since,
            // 'end_date': this.milliseconds (),
            // 'currency': market['quoteId'],
            // 'coin': market['baseId'],
            // 'trade_type': 'buy', // or 'sell'
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['coin'] = market['baseId'];
            request['currency'] = market['quoteId'];
        }
        if (since !== undefined) {
            request['start_date'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = Math.min (1000, limit); // max 1000
        }
        const response = await this.privateGetOrdersTrades (this.extend (request, params));
        //
        //     {
        //         "message":null,
        //         "dataVersion":"eb890af684cf84e20044e9a9771b96302e7b8dec",
        //         "data":{
        //             "current_page":1,
        //             "data":[
        //                 {
        //                     "trade_type":"sell",
        //                     "fee":"0.0610578086",
        //                     "id":1483372,
        //                     "created_at":1606581578368,
        //                     "currency":"usdt",
        //                     "coin":"btc",
        //                     "price":"17667.1900000000",
        //                     "quantity":"0.0017280000",
        //                     "amount":"30.5289043200",
        //                 },
        //             ],
        //             "first_page_url":"http:\/\/api.vcc.exchange\/v3\/orders\/trades?page=1",
        //             "from":1,
        //             "last_page":1,
        //             "last_page_url":"http:\/\/api.vcc.exchange\/v3\/orders\/trades?page=1",
        //             "next_page_url":null,
        //             "path":"http:\/\/api.vcc.exchange\/v3\/orders\/trades",
        //             "per_page":10,
        //             "prev_page_url":null,
        //             "to":2,
        //             "total":2,
        //         },
        //     }
        //
        let data = this.safeValue (response, 'data', {});
        data = this.safeValue (data, 'data', []);
        return this.parseTrades (data, market, since, limit);
    }

    async fetchDepositAddress (code, params = {}) {
        /**
         * @method
         * @name vcc#fetchDepositAddress
         * @description fetch the deposit address for a currency associated with this account
         * @param {str} code unified currency code
         * @param {dict} params extra parameters specific to the vcc api endpoint
         * @returns {dict} an [address structure]{@link https://docs.ccxt.com/en/latest/manual.html#address-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request = {
            'currency': currency['id'],
        };
        const response = await this.privateGetDepositAddress (this.extend (request, params));
        //
        //     {
        //         "dataVersion":"6d72fb82a9c613c8166581a887e1723ce5a937ff",
        //         "data":{
        //             "status": "REQUESTED",
        //             "blockchain_address": "",
        //             "currency": "btc"
        //         }
        //     }
        //
        //     {
        //         "dataVersion":"6d72fb82a9c613c8166581a887e1723ce5a937ff",
        //         "data":{
        //             "status": "PROVISIONED",
        //             "blockchain_address": "rPVMhWBsfF9iMXYj3aAzJVkPDTFNSyWdKy",
        //             "blockchain_tag": "920396135",
        //             "currency": "xrp"
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data');
        const status = this.safeString (data, 'status');
        if (status === 'REQUESTED') {
            throw new AddressPending (this.id + ' is generating ' + code + ' deposit address, call fetchDepositAddress one more time later to retrieve the generated address');
        }
        const address = this.safeString (data, 'blockchain_address');
        this.checkAddress (address);
        const tag = this.safeString (data, 'blockchain_tag');
        const currencyId = this.safeString (data, 'currency');
        return {
            'currency': this.safeCurrencyCode (currencyId),
            'address': address,
            'tag': tag,
            'network': undefined,
            'info': data,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.version + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        if (Object.keys (query).length) {
            url += '?' + this.urlencode (query);
        }
        if (api === 'private') {
            this.checkRequiredCredentials ();
            const timestamp = this.milliseconds ().toString ();
            if (method !== 'GET') {
                body = this.json (query);
            }
            const auth = method + ' ' + url;
            const signature = this.hmac (this.encode (auth), this.encode (this.secret), 'sha256');
            headers = {
                'Authorization': 'Bearer ' + this.apiKey,
                'Content-Type': 'application/json',
                'timestamp': timestamp,
                'signature': signature,
            };
        }
        url = this.urls['api'][api] + '/' + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return;
        }
        //
        //     {"message":"Insufficient balance."}
        //     {"message":"Unauthenticated."} // wrong api key
        //     {"message":"The given data was invalid.","errors":{"signature":["HMAC signature is invalid"]}}
        //     {"code":504,"message":"Gateway Timeout","description":""}
        //     {"code":429,"message":"Too many requests","description":"Too many requests"}
        //
        const message = this.safeString (response, 'message');
        if (message !== undefined) {
            const feedback = this.id + ' ' + body;
            this.throwExactlyMatchedException (this.exceptions['exact'], message, feedback);
            this.throwBroadlyMatchedException (this.exceptions['broad'], body, feedback);
            throw new ExchangeError (feedback);
        }
    }
};
