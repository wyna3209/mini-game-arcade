# Clock repair game assets

Reference: ../../../design/clock-repair/03-clean-game-ui.png

The background and Klink were generated with ImageGen using the reference. The character PNG has an alpha channel. Original generated files are retained outside the project.

## Existing character artwork

Hoothoot (163), Pikachu (25), Eevee (133), Snorlax (143), Skitty (300), Celebi (251), Delibird (225), Lapras (131), Psyduck (54), Jigglypuff (39), Jirachi (385), Gastly (92), Haunter (93), Rotom (479), Banette (354), and Gengar (94) use local copies of PokéAPI Sprites official-artwork PNG files:
https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/other/official-artwork

Downloaded via https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/{id}.png

Pokémon and character artwork belong to their respective rights holders. Fan game.
Generation of Hoothoot and the five customer cutouts was rejected by the generation tool; these were replaced with existing artwork. They do not reproduce the reference character outfits.

## Digital display font

`DSEG7Classic-Regular.woff2` is DSEG7 Classic Regular by keshikan, copyright 2017.
Source: https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7-Classic/DSEG7Classic-Regular.woff2
License: SIL Open Font License 1.1, included as `DSEG-LICENSE.txt` and bundled with the game.
The recorder body, LCD surface, screws, and adjustment controls are HTML/CSS in `src/reading-console.css`.

## Successful generation prompts

### workshop-background.png

Transparent background: false

Edit the reference into a clean environment background plate for the same playable 2D anime-style Pokémon clock-repair game. Preserve its lovely polished warm wood, antique brass, dark forest teal, tall arched windows with soft golden daylight, shelves of clocks, hanging chains, plants and mechanical tools. Full bleed landscape 16:9 composition. Remove ALL characters: the owl, gears character and Pikachu. Remove the giant central clock completely and reconstruct the room behind it. Remove ALL UI, all signs, all writing, HUD, timer, speech bubbles, control buttons, title logo and dialogue panels. Do not leave blank white boxes where UI was. The foreground across the bottom quarter is a continuous beautiful wooden watchmaker workbench with a worn deep teal leather mat in its middle. Left and right side tool benches frame the scene, their tops around 65% screen height. Keep the center relatively calm with darker warm shelves so a big game clock can be overlaid later. No people, no Pokémon, no mascot gear faces, no text. Same clean painterly anime game art rendering as the reference, NOT photoreal, NOT pixel art.

### klink-owner.png

Transparent background: true

Extract and reconstruct ONLY the Klink mechanic character from the right of the reference as a standalone game character on fully transparent background. Two interlocking light-gray steel gear faces, turquoise round noses, asymmetrical black eye details matching the reference. Preserve the dark teal mechanic apron with small gold gear emblem and the wrench held at its side, making a charming single gear-pair mechanic sprite. Face slightly toward center/left. Full complete character and props with modest transparent margin; no parts cropped. Exact polished clean cel-shaded anime game illustration style and warm brass highlights of the reference. No counter, no surrounding tools, no clock, no UI, no letters, no speech bubble, no background or floor. Real transparent alpha, no painted checkerboard.

