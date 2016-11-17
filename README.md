The goals for this fuser:

- use JMDICT to combine morphemes into lexemes found in the dictionary, and
- use Ve, or de-conjugator, to combine morphemes into agglutinated lexemes that *won’t* be found in JMDICT.

JMDICT-based fusing will catch

- idioms like `ことがある`,
- common words like `じゃない` and `でも` that Kuromoji splits.

These two methods will run independently; potentially a third super-fuser will combine their individual results.

JMDICT-fusing will search JMDICT’s `reb` reading elements, and using raw text’s reading to avoid kanji problems. It will search morpheme-wise, using the trailing morpheme’s lemma.
