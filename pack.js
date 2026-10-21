const CARDS_PER_PACK = 4;

// Each rarity is an independent final probability range.
// The order matters: higher rarities are checked first.
const RARITY_CHANCES = [
    { name: "Legendary", chance: 1 / 25, cards: () => legendaryCards },
    { name: "Epic",      chance: 1 / 12, cards: () => epicCards },
    { name: "Rare",      chance: 1 / 8,  cards: () => rareCards },
    { name: "Uncommon",  chance: 1 / 3,  cards: () => uncommonCards }
];

// Collection persists while the page is open.
const collection = [];

let currentPack = [];
let revealedCount = 0;
let packInProgress = false;

// HTML elements
const packImage = document.getElementById("pack-image");
const packButton = document.getElementById("pack-button");
const anotherPackButton = document.getElementById("another-pack-button");
const packInstructions = document.getElementById("pack-instructions");
const packStatus = document.getElementById("pack-status");
const revealedCards = document.getElementById("revealed-cards");
const collectionElement = document.getElementById("collection");
const collectionCount = document.getElementById("collection-count");

// Pick a random card ID from an array.
function pickRandomCard(cardArray) {
    if (!Array.isArray(cardArray) || cardArray.length === 0) {
        return null;
    }

    return cardArray[Math.floor(Math.random() * cardArray.length)];
}

// Roll a rarity and return a card object.
function drawCard() {
    const roll = Math.random();
    let cumulativeChance = 0;

    for (const rarity of RARITY_CHANCES) {
        cumulativeChance += rarity.chance;

        if (roll < cumulativeChance) {
            const cardId = pickRandomCard(rarity.cards());

            // If this rarity has no cards, fall back to Common.
            if (cardId !== null) {
                return {
                    id: cardId,
                    rarity: rarity.name
                };
            }

            break;
        }
    }

    // Common is the default rarity.
    const commonId = pickRandomCard(commonCards);

    if (commonId === null) {
        throw new Error(
            "No common cards are available. Check your cards.js file."
        );
    }

    return {
        id: commonId,
        rarity: "Common"
    };
}

// Create an image element for a card.
function createCardElement(card) {
    const wrapper = document.createElement("div");
    wrapper.className = `card rarity-${card.rarity.toLowerCase()}`;

    const image = document.createElement("img");
    image.src = `cards/${card.id}.png`;
    image.alt = `${card.rarity} card ${card.id}`;
    image.loading = "lazy";

    image.onerror = () => {
        image.alt = `Missing image: ${card.id}.png`;
        image.classList.add("image-error");
    };

    const name = document.createElement("p");
    name.className = "card-name";
    name.textContent = card.id;

    const rarity = document.createElement("p");
    rarity.className = "card-rarity";
    rarity.textContent = card.rarity;

    wrapper.append(image, name, rarity);

    return wrapper;
}

// Start a new pack.
function startPack() {
    try {
        currentPack = [];

        for (let i = 0; i < CARDS_PER_PACK; i++) {
            currentPack.push(drawCard());
        }
    } catch (error) {
        console.error(error);
        packStatus.textContent =
            "Unable to open a pack. Please check your cards.js file.";
        return;
    }

    revealedCount = 0;
    packInProgress = true;

    // Show the unopened pack.
    packImage.src = "pack.png";
    packImage.alt = "An unopened MetroCards pack";
    packImage.hidden = false;

    revealedCards.replaceChildren();

    packInstructions.textContent =
        "Your pack is ready. Click below to reveal the first card.";

    packButton.textContent = "Reveal First Card";
    packButton.hidden = false;
    anotherPackButton.hidden = true;

    packStatus.textContent = `0 of ${CARDS_PER_PACK} cards revealed`;
}

// Reveal one card at a time.
function revealNextCard() {
    if (!packInProgress) {
        startPack();
        return;
    }

    if (revealedCount >= CARDS_PER_PACK) {
        return;
    }

    const card = currentPack[revealedCount];

    revealedCards.appendChild(createCardElement(card));
    revealedCount++;

    packImage.hidden = true;

    packStatus.textContent =
        `${revealedCount} of ${CARDS_PER_PACK} cards revealed`;

    if (revealedCount < CARDS_PER_PACK) {
        packInstructions.textContent =
            "What's next? Reveal another card!";

        packButton.textContent = "Reveal Next Card";
    } else {
        finishPack();
    }
}

// Finish the pack and add all four cards to the collection.
function finishPack() {
    packInProgress = false;

    collection.push(...currentPack);

    packInstructions.textContent = "Pack complete! Here's what you pulled.";

    packButton.hidden = true;
    anotherPackButton.hidden = false;

    packStatus.textContent = "All four cards revealed!";

    renderCollection();
}

// Update the collection display.
function renderCollection() {
    collectionElement.replaceChildren();

    if (collection.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent =
            "Your collection is empty. Open a pack to get started!";

        collectionElement.appendChild(emptyMessage);
    } else {
        collection.forEach((card) => {
            collectionElement.appendChild(createCardElement(card));
        });
    }

    collectionCount.textContent =
        `${collection.length} ${collection.length === 1 ? "card" : "cards"} collected`;
}

// Event listeners.
packButton.addEventListener("click", () => {
    if (!packInProgress && currentPack.length === 0) {
        startPack();
    } else {
        revealNextCard();
    }
});

anotherPackButton.addEventListener("click", startPack);

// Initial page state.
packImage.hidden = false;
packButton.textContent = "Open Pack";
packStatus.textContent = "";
renderCollection();
