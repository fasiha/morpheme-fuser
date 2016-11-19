"use strict";

//
// # Utilities #
//
function arrSome(v) { return v.reduce((p, c) => p || c, false); }
var setunion = (s, t) => new Set([...s, ...t ]);
var setint = (s, t) => new Set([...s ].filter(x => t.has(x)));
var setdiff = (s, t) => new Set([...s ].filter(x => !t.has(x)));
var seteq = (s, t) => setdiff(s, t).size === 0 && setdiff(t, s).size === 0;

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

/*
Upsert a value into a map that has all-array values.
*/
function mapUpsertPush(map, key, val) {
  let hit = map.get(key);
  if (hit) {
    hit.push(val);
  } else {
    map.set(key, [ val ]);
  }
  return map;
}

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
var readings = new Map();
jmdict.forEach(({r_ele}, i) => r_ele.forEach(
                   ({reb}) => mapUpsertPush(readings, kata2hira(reb), i)));
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

// Morpheme Utilities

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

function morphemesToLiteralsLemma(morphemes) {
  var lemmas = morphemes.map(m => kata2hira(m['lemma-pronunciation']));
  var literals = morphemes.map(m => kata2hira(m['literal-pronunciation']));
  return prefixTuples(literals, 1)
      .map((v, i) => v.slice(0, -1).concat(lemmas[i + 1]).join(''));
}

// Given a vector of morphemes, find the longest run of them, starting from the
// beginning, that is in JMDICT.
function findLongestLeadingFuse(morphemes) {
  if (!morphemes || morphemes.length === 0) {
    return [];
  }
  var scans = morphemesToLiteralsLemma(morphemes);
  var maxIndex = scans.map(s => readings.has(s)).lastIndexOf(true);
  if (maxIndex >= 0) {
    // console.log(`found match for [${scans[maxIndex]}]!`);
  }
  var numMorphemes = maxIndex >= 0 ? maxIndex + 2 : 0;
  return morphemes.slice(0, numMorphemes);
}
// findLongestLeadingFuse(morphemes);

// As findLongestLeadingFuse (above) finds leading fuses, cut them off and
// iterate. This is a recursive function.
function findSuccessiveFuses(morphemes) {
  if (!morphemes || morphemes.length <= 1) {
    return [];
  }
  // console.log('SCAN: ' + morphemes.map(x => x.literal).join(''));
  var best = findLongestLeadingFuse(morphemes);
  if (best.length > 0) {
    return [ best ].concat(findSuccessiveFuses(morphemes.slice(best.length)));
  }
  return [].concat(findSuccessiveFuses(morphemes.slice(1)));
}

//
// # Example #
//
var morphemes = kuromojiFrontend('ことがあります');
morphemes = kuromojiFrontend('私は、ソウルへ行ったことがあります。');
morphemes = kuromojiFrontend('私は学生じゃない。');
morphemes = kuromojiFrontend('私は学生じゃなかった。');
var example = partitionMorphemesSymbols(morphemes).map(findSuccessiveFuses);
console.log(example);
// flatten1(example).map(v => v[0].position) // starting position of each fuse

// Apply to Grammar dictionary
var gd = fs.readFileSync('data/grammar-dicts/sentences.tsv', 'utf8')
             .trim()
             .split('\n')
             .slice(1)
             .map(s => {
               const [entry, entryTrans, jp, en] = s.trim().split('\t');
               return jp;
             });
var gdKuromoji = gd.slice(0, 100).map(kuromojiFrontend);

var gdFuses = gdKuromoji.map(
    morphemes => flatten1(
        partitionMorphemesSymbols(morphemes).map(findSuccessiveFuses)));

function morphemesToText(morphemes) {
  return morphemes.map(m => m.literal).join('');
}

// each element of gdFuses contains fuses, a vector of morpheme-vectors.
// Each
// sentence element of gdFuses can be split into contiguous text without
// punctuation. So `fuses` may be read as "sub-sentences" or "clauses".
var candReadings =
    gdFuses.map(fuses => (fuses.map(ms => morphemesToLiteralsLemma(ms).filter(
                                        s => readings.has(s)))));  // readings
var candHits = candReadings.map(
    fuses => fuses.map(hits => flatten1(hits.map(
                           hit => readings.get(hit).map(i => jmdict[i])))));

var candOrig = gdFuses.map(
    fuses => flatten1(fuses.map(morphemesToText)));  // original text
var candPos = gdFuses.map(
    fuses => fuses.map(ms => ms.map(m => m['part-of-speech'].join('/'))));

var fmap = require('./fmap');
var hanRegexp =
    /[⺀-⺙⺛-⻳⼀-⿕〡-〩〸-〻㐀-䶵一-鿕豈-舘並-龎]/g;

var scoreLiteralToEntries = (lit, entries) => {
  var kanjis = new Set(lit.match(hanRegexp));
  // console.log(lit);
  if (kanjis.size > 0) {
    var scores = entries.map(
        e => e.k_ele
                 ? Math.max(...e.k_ele.map(
                       ({keb}) => {
                           // console.log(keb.match(hanRegexp), kanjis);
                           return setint(new Set(keb.match(hanRegexp)), kanjis)
                               .size})) /
                       kanjis.size
                 : 0);
    return scores;
  }
  return entries.map(e => 0);
};
scoreLiteralToEntries(candOrig[0][0], candHits[0][0]);

var candScores =
    fmap((lits, entryGroups) => fmap(scoreLiteralToEntries, lits, entryGroups),
         candOrig, candHits);

function zip2(a, b) { return fmap((x, y) => [x, y], a, b); }
var candReport = fmap((sentence, scores, literals) => {
  var ret = sentence;
  var sortedScores = zip2(scores.map(v => Math.max(...v)), literals.slice());
  sortedScores.sort((a, b) => b[0] - a[0]);
  var rest =
      sortedScores.map(([ hiscore, lit ]) => `${lit}:${hiscore}`).join('; ');
  return ret + ' ' + rest;
}, gd.slice(0, candScores.length), candScores, candOrig);
candReport
