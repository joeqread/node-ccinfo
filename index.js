'use strict';

String.prototype.replaceAt = function ( pos, chr ) {
	if ( pos > this.length ) return;
	var before = this.substring(0, pos);
	var after = this.substring(pos+1, this.length);
	return before + chr + after;
}

function CreditCardInfo () {
	// See wikipedia on Payment Identification Numbers
	// also more resources: https://www.cybersource.com/developers/getting_started/test_and_manage/best_practices/card_type_id/
	this.types = require( 'cards-db.js' );

	this.allowedTypes = []; // override this with array like: ['visa','mc']

	this.autocompleteBestMatch = {};

	this.autocomplete = function ( input ) {
		this.autocompleteBestMatch = {}; // reset in case we're not a new instance from last check

		if ( this.allowedTypes.length < 1 ) {
			console.log( 'No allowed credit card types defined before attempting autocomplete.  Define like this:\n\n  var cc = new CreditCard();\n  cc.allowedTypes = [\'visa\',\'mc\'];\n  var result=cc.autocomplete(\'4111-1111-11\');');
			return false;
		}

		var cc = input.replace( /[^0-9]*/g, '' );
		if ( cc.length > 0 ) {
			var type;
			while ( type = this.allowedTypes.shift() ) {
				var provider = this.types[type];
				for ( var i in provider.rules ) {
					for ( var j in provider.rules[i].start ) {
						var match = provider.rules[i].start[j];
						if ( cc == match || (cc.startsWith(match) || String(match).startsWith(cc)) ) {
							if ( !this.autocompleteBestMatch.provider || cc.length > this.autocompleteBestMatch.matchLength ) {
								this.autocompleteBestMatch = { provider: type, matchLength: cc.length, rule: i, start: j, isEnoughDigits: Boolean(provider.rules[i].lengths.indexOf(cc.length) > -1) }
							} else if ( cc.length == this.autocompleteBestMatch.matchLength ) {
								this.autocompleteBestMatch = {}; // ambiguous result, need more input
							}
						}
					}
				}
			}
			if ( this.autocompleteBestMatch.provider ) {
				var match = this.types[this.autocompleteBestMatch.provider];
				var rule = Object.create( match.rules[this.autocompleteBestMatch.rule] );
				rule.provider = this.autocompleteBestMatch.provider;

				var details = {
					'type'      : this.autocompleteBestMatch.provider,
					'name'      : match.name,
					'logo'      : match.logo,
					'value'     : cc,
					'formatted' : this.format(rule, cc),
					'length'    : cc.length,
					'isValid'   : (this.autocompleteBestMatch.isEnoughDigits === true ? this.checkSum(rule, cc) : undefined),
				}

				return details;
			}
		}
		return false;
	};

	this.checkSumMethods = {
		'luhn' : (function (arr) {  // thanks to https://gist.github.com/ShirtlessKirk/2134376
				return function (input) {
					var 
						len = String(input).length,
						bit = 1,
						sum = 0,
						val;

					while (len) {
						val = parseInt(String(input).charAt(--len), 10);
						sum += (bit ^= 1) ? arr[val] : val;
					}

					return sum && sum % 10 === 0;
				};
			}([0, 2, 4, 6, 8, 1, 3, 5, 7, 9]))
	};

	this.checkSum = function ( rule, cc ) {
		if ( rule.checksum && this.checkSumMethods[ rule.checksum ] ) {
			return Boolean( this.checkSumMethods[ rule.checksum ](cc) );
		}
		return true;
	};

	this.format = function ( rule, cc ) {
		var format = rule.format || this.types[ rule.provider ].format || '#### #### #### ####';
		
		var pos=0;
		for ( var i=0; i <= format.length; i++ ) {
			if ( format.charAt(i) == '#' && cc.charAt(pos) ) { format=format.replaceAt(i,cc.charAt(pos++)); }
		}
		if ( pos < cc.length ) {
			format += ' ' + cc.substring(pos, cc.length);
		}
		return format;
	};
}

module.exports = CreditCardInfo;