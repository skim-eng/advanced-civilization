# Intellectual-property boundary

This is an engineering inventory, not legal advice.

## MIT-licensed repository material

John Champaign's original repository code is distributed under the MIT License. The preserved `LICENSE` file states `Copyright (c) 2026 John Champaign`; that notice and the MIT permission and warranty text must remain with copied or substantially reused code.

The MIT grant applies to the original software code John licensed. It does not convert third-party game material into MIT-licensed material.

## Underlying game and derived data

The repository implements Advanced Civilization and contains data and expressive material associated with that game, including map-area geometry and adjacency, civilizations, commodities, advances, calamities, Civilization/AST information, scoring, terminology, and rules-derived behavior and text. The upstream repository states that portions of the data were extracted from a publicly distributed VASSAL module for interoperability.

The repository also contains `civ_rules_and_guide_ocr.pdf`, an upstream copy of a rules-and-guide PDF. Its presence in upstream history does not establish a Project Chronicle right to redistribute it publicly.

The MIT license does **not** grant rights to:

- the Advanced Civilization name or branding;
- the underlying board game or its rules expression;
- the rulebook wording or OCR PDF;
- the VASSAL module or artwork within it;
- map, commodity, advance, calamity, Civilization/AST, scoring, or other game data owned by third parties;
- publisher marks, trade dress, or other expressive presentation.

## Board artwork boundary

Project Chronicle must not download, commit, deploy, or serve the VASSAL module or extracted board artwork. The upstream browser flow is acceptable only as a bring-your-own-file mechanism:

1. the user obtains a module they are entitled to possess;
2. the browser reads that local file;
3. extraction occurs entirely in that browser;
4. the three SVGs are cached in that device's IndexedDB;
5. no module or extracted artwork is uploaded to Project Chronicle infrastructure.

The tracked schematic is generated from repository geometry rather than shipped VASSAL map images. Git ignore rules cover `assets/civ.vmod`, extracted module files, and `public/assets/map-{main,western,eastern}.svg`.

## Private evaluation

The vanilla staging target is a private technical evaluation. Access control reduces distribution and exposure, but private access does not itself create an intellectual-property license or resolve any underlying rights question.

## Original public release boundary

Before a broad or commercial release, the project must replace the Advanced Civilization name and branding, extracted map and card data, civilizations, commodities, advances, calamities, AST/scoring structure, rules text, terminology, and expressive presentation with original or properly licensed material. Reused MIT code must retain applicable attribution. The release must receive a dedicated intellectual-property review.
