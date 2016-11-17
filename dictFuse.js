"use strict";
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

// Now, we have this huge 173k set of hiragana strings. We first need to get
// Kuromoji morphemes.
var syncRequest = require('sync-request');
function kuromojiFrontend(s) {
  var res = JSON.parse(
      syncRequest('GET',
                  `http://localhost:3600/api/parse/${encodeURIComponent(s)}`)
          .getBody('utf8'));
  return res;
}

// console.log(kuromojiFrontend('田中です。'));

// Now we can get Kuromoji morphemes. Now, we need to run the finite state
// machine through the list of morphemes.

function fsm(morphemes) {
  let state = 1;
  let working = [];  // vector of morphemes
  let path = [];     // vector of strings
  let unknowns = [];
  let knowns = [];
  for (let i = 0; i < morphemes.length; i++) {
    let m = morphemes[i];
    let literal = m['literal-pronunciation'];
    let lemma = m['lemma-pronunciation'];

    let candidates =
        path.map(s => s + literal).concat(path.map(s => s + lemma));
    let passed = candidates.filter(s => readings.has(s));
    passed.forEach(s => readings.push(s));
  }
}

/*
Given vector v containing N elements, returns N-element vector of vectors,
specifically, a 1-tuple, 2-tuple, 3-tuple, ..., N-tuple.
*/
function prefixTuples(v) {
  return Array.from(Array(v.length), (_, i) => v.slice(0, i + 1));
}
prefixTuples([ 1, 2, 3, 4 ]);

function suffixTuples(v) {
  return Array.from(Array(v.length), (_, i) => v.slice(i));
}
suffixTuples([ 1, 2, 3, 4 ]);

function flatten1(v) { return v.reduce((prev, curr) => prev.concat(curr), []); }
function tupleTuples(v, skip) {
  let max = skip ? skip : 0;
  let min = skip ? -skip : v.length;
  return flatten1(
      suffixTuples(v).slice(0, min).map(w => prefixTuples(w).slice(max)));
}
tupleTuples('ABCD'.split(''),1)
