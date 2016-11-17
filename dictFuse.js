"use strict";

//
// # Utilities #
//
function rle(v) {
  return v.reduce((prev, curr) => {
    if (prev.length === 0 || prev.slice(-1)[0].value !== curr) {
      return prev.concat([ {value : curr, run : 1} ])
    }
    prev.slice(-1)[0].run++;
    return prev;
  }, [])
}
// rle([ 1, 1, 1, 2 ]);

function partitionBy(f, v) {
  const numbers = rle(v.map(f)).map(o => o.run);
  let result = [];
  let start = 0;
  numbers.forEach(n => {
    result.push(v.slice(start, start + n));
    start += n;
  });
  return result;
}
// partitionBy(x => x % 2 === 0, [ 1, 3, 5, 2, 6, 1234, 3, 4, 4 ]);

/*
Given vector v containing N elements, returns N-element vector of vectors,
specifically, a 1-tuple, 2-tuple, 3-tuple, ..., N-tuple.
*/
function prefixTuples(v, toosmall) {
  toosmall = toosmall || 0;
  return Array.from(Array(v.length - toosmall),
                    (_, i) => v.slice(0, i + 1 + toosmall));
}
// prefixTuples([ 1, 2, 3, 4 ], 1);

function suffixTuples(v, toosmall) {
  toosmall = toosmall || 0;
  return Array.from(Array(v.length - toosmall), (_, i) => v.slice(i));
}
// suffixTuples([ 1, 2, 3, 4 ], 1);

function flatten1(v) { return v.reduce((prev, curr) => prev.concat(curr), []); }
function tupleTuples(v, toosmall) {
  return flatten1(
      suffixTuples(v, toosmall).map(w => prefixTuples(w, toosmall)));
}
// tupleTuples('ABCD'.split(''), 1)

//
// # Load data #
//
var fs = require('fs');
var jmdict = fs.readFileSync('./data/jmdict/JMdict-full.ldjson', 'utf8')
                 .trim()
                 .split('\n')
                 .map(s => JSON.parse(s));

function flatten1(v) { return v.reduce((prev, curr) => prev.concat(curr), []); }

var kata2hira = require('./kata2hira.js');
var readings = new Set();
jmdict.forEach(({r_ele}) =>
                   r_ele.forEach(({reb}) => readings.add(kata2hira(reb))));
// console.log(readings.size);
// console.log(JSON.stringify(jmdict[1123], null, 1))
// fs.writeFileSync('readings.txt', Array.from(readings).join('\n'));

// Now, we have this huge 173k set of hiragana strings.

//
// # Kuromoji wrapper #
//
var syncRequest = require('sync-request');
function kuromojiFrontend(s) {
  var res = JSON.parse(
      syncRequest('GET',
                  `http://localhost:3600/api/parse/${encodeURIComponent(s)}`)
          .getBody('utf8'));
  return res;
}
// console.log(kuromojiFrontend('田中です。'));

//
// NLP magic
//

// Given a vector of morphemes, find the longest run of them, starting from the
// beginning, that is in JMDICT.
function findLongestLeadingFuse(morphemes) {
  if (!morphemes || morphemes.length === 0) {
    return -1;
  }
  var lemmas = morphemes.map(m => kata2hira(m['lemma-pronunciation']));
  var literals = morphemes.map(m => kata2hira(m['literal-pronunciation']));
  var scans = prefixTuples(literals, 1)
                  .map((v, i) => v.slice(0, -1).concat(lemmas[i + 1]).join(''));
  var maxIndex = scans.map(s => readings.has(s)).lastIndexOf(true);
  if (maxIndex >= 0) {
    console.log(`found match for [${scans[maxIndex]}]!`);
  }
  var numMorphemes = maxIndex >= 0 ? maxIndex + 2 : 0;
  return numMorphemes;
}
// findLongestLeadingFuse(morphemes);

// As findLongestLeadingFuse (above) finds leading fuses, cut them off and
// iterate. This is a recursive function.
function findSuccessiveFuses(morphemes) {
  if (!morphemes || morphemes.length === 0) {
    return [];
  }
  console.log('SCAN: ' + morphemes.map(x => x.literal).join(''));
  var num = findLongestLeadingFuse(morphemes);
  if (num > 0) {
    return [ num ].concat(findSuccessiveFuses(morphemes.slice(num)));
  }
  return [ 0 ].concat(findSuccessiveFuses(morphemes.slice(1)));
}

function morphemeNotSymbol(m) {
  return m['part-of-speech'].join('').indexOf('supplementary-symbol') < 0;
}

// This takes a vector of morphemes and returns a vector whose elements are also
// vectors of morphemes. None of the returned morphemes will contain symbols,
// and each top-level vector represents a run of non-symbol morphemes. We do
// this because if we have a string "X,Y", we don't want to search the
// dictionary for "XY", which might have a hit which is likely false. We also
// don't want to search for "X," or ",Y" because symbol morphemes don't have
// lemmas.
function partitionMorphemesSymbols(morphemes) {
  return partitionBy(morphemeNotSymbol, morphemes)
      .filter(v => morphemeNotSymbol(v[0]));
}

//
// # Example #
//
var morphemes = kuromojiFrontend('ことがあります');
morphemes = kuromojiFrontend('私は、ソウルへ行ったことがあります。');
console.log(partitionMorphemesSymbols(morphemes).map(findSuccessiveFuses))
