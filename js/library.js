/* Games that aren't built into Study Arcade.
   frame: [width, height] = the size a game draws at; the player scales it to fit. Games without one resize themselves.
   jam and ext live in this site's games/ folder; each keeps its own license file
   (games/<folder>/<id>/LICENSE*). web games load from their publisher's site.
   The About page credits every author. */
window.LIBRARY = {
  // Built by the 100 Devs 1 Game jam community, MIT License.
  // Web builds come from each game's GitHub releases; previews from their game list.
  jam: [
    { id: 'wobble-wings', name: 'Wobble Wings', cat: 'action', blurb: 'Flap, wobble and dash through the forest. Flappy Bird meets Celeste and Spyro.', how: 'Follow the on-screen prompts. Click inside the game first.', repo: 'WobbleWings' },
    { id: 'the-typing-experiment', name: 'The Typing Experiment', cat: 'study', blurb: 'A spooky typing game. Type fast and type right to get through.', how: 'Type the words you see.', repo: 'TheTypingExperiment' },
    { id: 'dragon-dragon-fire-fire', name: 'Dragon Dragon Fire Fire', cat: 'platformer', blurb: 'An 8-bit arcade platformer where the level catches fire and falls apart.', how: 'Arrow keys or WASD to move, jump with Up or Space.', repo: 'DragonDragonFireFire' },
    { id: 'run-rabbit-run-run-run', name: 'Run Rabbit Run Run Run', cat: 'platformer', blurb: 'A looping endless runner that keeps getting faster.', how: 'Jump to survive. The game shows its keys at the start.', repo: 'JumpAndRunAndAgain' },
    { id: 'mossy-march-defense', name: 'Mossy March Defense', cat: 'strategy', blurb: 'Build towers and stop the mossy march before it reaches your base.', how: 'Click to place and upgrade towers.', repo: 'MossyMarchDefense' },
    { id: 'critter-catchin', name: 'Critter Catchin’', cat: 'puzzle', blurb: 'An I-spy game. Find every hidden critter in the scene.', how: 'Click the critters when you spot them.', repo: 'CritterCatchin' },
    { id: 'the-full-picture', name: 'The Full Picture', cat: 'adventure', blurb: 'Solve a mystery as a detective in an art museum.', how: 'Click to look around and talk to people.', repo: 'TheFullPicture' },
    { id: 'mental-record', name: 'Mental Record', cat: 'adventure', blurb: 'A mysterious point-and-click deduction game.', how: 'Click to explore and connect the clues.', repo: 'MentalRecord', threads: true },
    { id: 'paper-town', name: 'Paper Town', cat: 'adventure', blurb: 'Explore a paper-craft open world with turn-based battles.', how: 'WASD or arrow keys to move. The game explains battles.', repo: 'PaperTown', localOnly: true }, // its 175 MB file is over GitHub's 100 MB limit
    { id: 'moth-in-purgatory', name: 'A Moth’s Reprise', cat: 'action', blurb: 'Fight waves of enemies in a Hollow Knight-style arena.', how: 'The game shows its controls at the start.', repo: 'Mothinpurgatory' },
    { id: 'in-the-clouds', name: 'In the Clouds', cat: 'platformer', blurb: 'Climb up through the clouds while the wind pushes you around.', how: 'Arrow keys or WASD to move and jump.', repo: 'InTheClouds' },
    { id: 'baby-bat-climber', name: 'Creepy Crawlin’', cat: 'platformer', blurb: 'Help a baby bat climb a spooky tower.', how: 'The game shows its controls at the start.', repo: 'BabyBatClimber' },
    { id: 'bouncing-boat', name: 'Bouncing Boat', cat: 'action', blurb: 'Bounce your boat on the waves to knock seagulls out of the sky.', how: 'Time your bounces with the waves.', repo: 'WavePrototype' },
    { id: 'adorable-aliens', name: 'Adorable Aliens', cat: 'action', blurb: 'Catch the falling aliens before they hit the ground.', how: 'Move to catch. The game shows its keys at the start.', repo: 'NomCatClone' },
    { id: 'flight-of-harmony', name: 'Flight of Harmony', cat: 'action', blurb: 'Launch, glide, earn upgrades and fly farther every run.', how: 'Follow the on-screen prompts.', repo: 'FlightOfHarmony' },
    { id: 'six-ways-to-suffer', name: 'Six Ways to Suffer', cat: 'strategy', blurb: 'A tense turn-based shootout with six kinds of bullets.', how: 'Click to pick your moves.', repo: 'Sixwaystosuffer' },
    { id: '8bit-pony', name: '8bit Pony', cat: 'action', blurb: 'An 8-bit side-scrolling shooter.', how: 'Move and shoot. The game shows its keys at the start.', repo: '8bitPony' },
    { id: 'mobile-fortress', name: 'Beezkrieg', cat: 'strategy', blurb: 'Drive a moving fortress and defend it from the swarm.', how: 'The game shows its controls at the start.', repo: 'MobileBaseDefender', threads: true },
    { id: 'the-hatchery', name: 'The Hatchery', cat: 'strategy', blurb: 'A clicker about raising a strange creature from an egg.', how: 'Click, upgrade, repeat.', repo: 'TheHatchery' },
    { id: 'road-to-nowhere', name: 'Road to Nowhere', cat: 'strategy', blurb: 'Build a town with a deck of cards.', how: 'Click cards to play them.', repo: 'RoadToNowhere' },
    { id: 'asteroid-farming', name: 'Asteroid Farming', cat: 'strategy', blurb: 'Grow crops on an asteroid floating in space.', how: 'The game shows its controls at the start.', repo: 'AsteroidFarming' },
    { id: 'beware-the-living-room', name: 'Beware the Living Room', cat: 'puzzle', blurb: 'Solve the room’s puzzles to escape.', how: 'Click to inspect things and use items.', repo: 'BewareTheLivingRoom' },
    { id: 'pocket-turtle', name: 'Pocket Turtle', cat: 'adventure', blurb: 'Take care of a tiny virtual pet turtle.', how: 'Click to feed and play.', repo: 'PocketTurtle' },
  ],

  // Classic browser games by other authors, each with its license kept in its folder.
  ext: [
    { id: 'hexgl', name: 'HexGL', cat: 'racing', file: 'index.html', blurb: 'Pilot a hover-ship around a neon track at top speed without flying off the edge.', how: '↑ to accelerate · ← → to steer · A and D to air-brake on sharp turns', by: 'Thibaut Despoulain', license: 'MIT', src: 'https://github.com/BKcore/HexGL' },
    { id: 'javascript-racer', frame: [980, 532], name: 'Road Racer', cat: 'racing', file: 'v4.final.html', blurb: 'Race down hills and around curves while weaving through traffic.', how: 'Arrow keys to drive', by: 'Jake Gordon', license: 'MIT', src: 'https://github.com/jakesgordon/javascript-racer' },
    { id: 't-rex-runner', frame: [760, 300], name: 'Dino Run', cat: 'action', file: 'index.html', blurb: 'Jump the cactuses and duck the birds for as long as you can.', how: 'Space or ↑ to jump · ↓ to duck', by: 'The Chromium Authors', license: 'BSD-3-Clause', src: 'https://github.com/wayou/t-rex-runner' },
    { id: 'hextris', name: 'Hextris', cat: 'puzzle', file: 'index.html', blurb: 'Spin the hexagon so falling blocks stack by color, then clear them.', how: '← → to rotate · P to pause', by: 'Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang', license: 'GPL-3.0', src: 'https://github.com/Hextris/hextris' },
    { id: 'pacman', frame: [360, 590], name: 'Pac-Man', cat: 'action', file: 'index.html', blurb: 'Eat every dot in the maze and stay away from the ghosts.', how: 'Arrow keys to move · N for a new game · P to pause', by: 'Dale Harvey', license: 'WTFPL', src: 'https://github.com/daleharvey/pacman' },
    { id: 'clumsy-bird', name: 'Clumsy Bird', cat: 'action', file: 'index.html', blurb: 'Flap through the gaps between the pipes.', how: 'Click, tap or Space to flap', by: 'Ellison Leão', license: 'GPL-3.0', src: 'https://github.com/ellisonleao/clumsy-bird' },
    { id: 'bubble-shooter', frame: [644, 644], name: 'Bubble Shooter', cat: 'puzzle', file: 'bubble-shooter.html', blurb: 'Aim and shoot bubbles. Match three of a color to pop them.', how: 'Move the mouse to aim · Click to shoot', by: 'Rembound.com', license: 'MIT', src: 'https://github.com/rembound/Bubble-Shooter-HTML5' },
    { id: 'match-3', frame: [656, 496], name: 'Match 3', cat: 'puzzle', file: 'match3.html', blurb: 'Swap neighboring tiles to line up three or more of the same color.', how: 'Drag a tile onto its neighbor, or click two tiles', by: 'Rembound.com', license: 'MIT', src: 'https://github.com/rembound/Match-3-Game-HTML5' },
    { id: 'mahjong', name: 'Mahjong', cat: 'puzzle', file: 'index.html', blurb: 'Clear the board by matching pairs of free tiles.', how: 'Click two matching tiles that aren’t covered or boxed in', by: 'ffalt', license: 'MIT', src: 'https://github.com/ffalt/mah' },
    { id: 'chess', frame: [420, 510], name: 'Chess', cat: 'strategy', file: 'index.html', blurb: 'Play chess against a computer opponent.', how: 'Drag your white pieces to move', by: 'Lauri Hartikka (pieces from chessboard.js)', license: 'Apache-2.0', src: 'https://github.com/lhartikk/simple-chess-ai' },
    { id: 'asteroids', frame: [960, 558], name: 'Asteroids', cat: 'action', file: 'index.html', blurb: 'Fly your ship and blast the asteroids before they smash into you.', how: '← → to turn · ↑ to thrust · Space to shoot', by: 'Doug McInnes', license: 'MIT', src: 'https://github.com/dmcinnes/HTML5-Asteroids' },
    { id: 'pong', frame: [1136, 648], name: 'Pong', cat: 'action', file: 'index.html', blurb: 'The original paddle game, against the computer or a friend.', how: 'Press 1 for one player or 2 for two players · Q and A move the left paddle', by: 'Jake Gordon', license: 'MIT', src: 'https://github.com/jakesgordon/javascript-pong' },
    { id: 'radius-raid', frame: [1000, 750], name: 'Radius Raid', cat: 'action', file: 'index.html', blurb: 'Survive wave after wave of enemies in a neon space shooter.', how: 'WASD or arrows to move · Aim and fire with the mouse · P to pause', by: 'Jack Rugile', license: 'MIT', src: 'https://github.com/jackrugile/radius-raid-js13k' },
    { id: 'flappy-2048', frame: [680, 800], name: 'Flappy 2048', cat: 'action', file: 'index.html', blurb: 'Flap a 2048 tile through the gaps in the walls of numbers.', how: 'Space, ↑ or click to flap', by: 'hczhcz, based on 2048 by Gabriele Cirulli', license: 'MIT', src: 'https://github.com/hczhcz/Flappy-2048' },
    { id: 'tiny-platformer', frame: [1093, 719], name: 'Tiny Platformer', cat: 'platformer', file: 'index.html', blurb: 'Grab the gold and stomp the monsters in a small platform game.', how: '← → to move · Space to jump', by: 'Jake Gordon', license: 'MIT', src: 'https://github.com/jakesgordon/javascript-tiny-platformer' },
    { id: 'particle-clicker', name: 'Particle Clicker', cat: 'strategy', file: 'index.html', blurb: 'Click to collect data, hire scientists and discover new particles.', how: 'Click the detector, then spend data on research and upgrades', by: 'Igor Babuschkin, Kevin Dungs, Tadej Novak and Gabor Biro', license: 'MIT', src: 'https://github.com/particle-clicker/particle-clicker' },
    { id: 'adarkroom', frame: [960, 720], name: 'A Dark Room', cat: 'adventure', file: 'index.html', blurb: 'Light a fire in a cold, dark room and see what grows from there.', how: 'Click the buttons. You discover the rest as you go.', by: 'Doublespeak Games', license: 'MPL-2.0', src: 'https://github.com/doublespeakgames/adarkroom' },
  ],

  // Games embedded from other sites with the embed code their publisher offers.
  // They load from those sites (with the publisher's ads), so they need an internet connection.
  web: [
    { id: 'slope', name: 'Slope', cat: 'action', url: 'https://y8.com/embed/slope', frame: [960, 641], blurb: 'Roll a ball down an endless 3D track. Stay on the track and avoid the obstacles as it speeds up.', how: '← → or A and D to steer the ball', by: 'Y8 Studio', via: 'Y8', page: 'https://www.y8.com/games/slope', note: 'Plays from Y8.com and may show their ads.' },
  ],
};
