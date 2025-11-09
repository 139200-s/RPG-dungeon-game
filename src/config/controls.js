const CONTROLS = {
    movement: {
        up: ['w', 'ArrowUp'],
        down: ['s', 'ArrowDown'],
        left: ['a', 'ArrowLeft'],
        right: ['d', 'ArrowRight']
    },
    combat: {
        attack: ['Space', 'mouse0'],  // Primary attack
        block: ['mouse1'],            // Secondary/block
        dodge: ['Shift']              // Dodge roll
    },
    inventory: {
        open: ['Tab', 'i'],          // Toggle inventory
        weaponSlot1: ['1'],          // First weapon
        weaponSlot2: ['2'],          // Second weapon
        potion1: ['q'],              // Health potion
        potion2: ['e'],              // Mana potion
        potion3: ['r'],              // Special potion
        ability1: ['f'],             // First ability
        ability2: ['g'],             // Second ability
        ability3: ['v'],             // Ultimate ability
    },
    interaction: {
        interact: ['e'],             // Interact with objects/NPCs
        pickup: ['e'],               // Pick up items
        drop: ['x'],                 // Drop items
    },
    ui: {
        map: ['m'],                  // Toggle big map
        character: ['c'],            // Character screen
        journal: ['j'],              // Quest journal
        menu: ['Escape'],            // Game menu
    }
};