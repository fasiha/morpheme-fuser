"use strict";

var fs = require('fs');

var gd = fs.readFileSync('data/grammar-dicts/sentences.tsv', 'utf8')
             .trim()
             .split('\n')
             .slice(1)
             .map(s => {
               const [entry, entryTrans, jp, en] = s.trim().split('\t');
               return `${jp}—${en}`;
             });
var kts = fs.readFileSync('data/kts/docs.ldjson', 'utf8')
              .split('\n')
              .map(s => JSON.parse(s))
              .filter(({_id}) => _id.indexOf('sentence-') >= 0)
              .map(({japanese, translation}) => `${japanese}—${translation}`);

fs.writeFileSync('allSentences.md',
                 `# GD
${gd.join('\n')}

# Tae-Kim/KTS
${kts.join('\n')}`);
