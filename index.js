"use strict";

/*
Generate a Markdown file of all sentences.
*/

var ve = require('./ve');
ve('私は朝風呂に入ることがあります。').then(x=>console.log(x))
