# Study Arcade

Made by Smith Homes. Work in progress.

Flashcards plus a game portal: study games that use your own decks, classic games made for this site, and a library of other games hosted in the `games/` folder.

## Run it

From this folder:

```
python3 tools/serve.py
```

Then open http://localhost:8766

Use this server rather than opening `index.html` directly. Two Godot games (Mental Record and Beezkrieg) need special browser headers, which it adds only in game folders that contain a `.isolate` file. Those two open in the full window.

## What's where

- `index.html`, `css/`, `js/`: the site
- `js/games/`: games built for Study Arcade
- `js/library.js`: the list of other games (names, categories, controls, credits). Games in its `web` list, like Slope, play from their publisher's site using the official embed code, so they need an internet connection.
- `games/jam/`: web builds of the 100 Devs 1 Game jam games (MIT License, from each game's GitHub release)
- `games/ext/`: other hosted games, each with its own license file
- `img/`: preview pictures for the game tiles

## Credits

See the About page in the site. Every hosted game keeps its license file in its folder.
