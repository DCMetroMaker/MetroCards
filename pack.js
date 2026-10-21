const CARDS_PER_PACK = 4;

const RARITY_CHANCES = [
    { name: "Legendary", chance: 1 / 25, cards: () => legendaryCards },
    { name: "Epic", chance: 1 / 12, cards: () => epicCards },
    { name: "Rare", chance: 1 / 8, cards: () => rareCards },
    { name: "Uncommon", chance: 1 / 3, cards: () => uncommonCards }
];

// Current session collection.
const collection = [];

let currentPack = [];
let revealedCount = 0;
let packStarted = false;
let packComplete = false;

const packImage = document.getElementById("pack-image");
const cardStack = document.getElementById("card-stack");
const currentCard = document.getElementById("current-card");
const packButton = document.getElementById("pack-button");
const anotherPackButton = document.getElementById("another-pack-button");
const packInstructions = document.getElementById("pack-instructions");
const packStatus = document.getElementById("pack-status");
const revealedCards = document.getElementById("revealed-cards");
const collectionElement = document.getElementById("collection");
const collectionCount = document.getElementById("collection-count");

// Pick a random card ID from a rarity array.
function pickRandomCard(cardArray) {
    if (!Array.isArray(cardArray) || cardArray.length === 0) {
        return null;
    }

    return cardArray[Math.floor(Math.random() * cardArray.length)];
}

// Draw a card using the configured rarity odds.
// Higher rarities are checked first; Common is the fallback.
function drawCard() {
    const roll = Math.random();
    let cumulativeChance = 0;

    for (const rarity of RARITY_CHANCES) {
        cumulativeChance += rarity.chance;

        if (roll < cumulativeChance) {
            const cardId = pickRandomCard(rarity.cards());

            if (cardId !== null) {
                return { id: cardId, rarity: rarity.name };
            }

            break;
        }
    }

    const commonId = pickRandomCard(commonCards);

    if (commonId === null) {
        throw new Error(
            "No common cards are available. Check cards.js."
        );
    }

    return { id: commonId, rarity: "Common" };
}

// Create a card element. The card ID is never shown as text.
function createCardElement(card, extraClass = "") {
    const wrapper = document.createElement("div");

    wrapper.className =
        `card rarity-${card.rarity.toLowerCase()} ${extraClass}`.trim();

    const image = document.createElement("img");
    image.src = `cards/${card.id}.png`;
    image.alt = `${card.rarity} trading card`;
    image.draggable = false;

    image.onerror = () => {
        image.alt = "Card image unavailable";
        image.classList.add("image-error");
    };

    wrapper.appendChild(image);

    return wrapper;
}

// Start a new pack-opening sequence.
function startPack() {
    try {
        currentPack = [];

        for (let i = 0; i < CARDS_PER_PACK; i++) {
            currentPack.push(drawCard());
        }
    } catch (error) {
        console.error(error);
        packStatus.textContent =
            "Unable to open a pack. Please check cards.js.";
        return;
    }

    revealedCount = 0;
    packStarted = true;
    packComplete = false;

    // Show the unopened pack only.
    packImage.hidden = false;
    cardStack.hidden = true;
    currentCard.hidden = true;

    cardStack.replaceChildren();
    currentCard.replaceChildren();
    revealedCards.replaceChildren();

    packButton.textContent = "Open Pack";
    packButton.hidden = false;
    anotherPackButton.hidden = true;

    packInstructions.textContent =
        "Ready to see what you pull?";

    packStatus.textContent = "";

    // Prevent stale cards from appearing beside the pack.
    buildCardStack();
}

// Build a layered stack from the four cards in this pack.
function buildCardStack() {
    cardStack.replaceChildren();

    currentPack.forEach((card, index) => {
        const cardElement = createCardElement(card, "stacked-card");

        // The first card is on top; the others peek out underneath.
        const rotation = (index % 2 === 0 ? -1 : 1) * (index + 1) * 1.8;
        const offsetX = index * 3;
        const offsetY = index * 5;

        cardElement.style.setProperty("--card-rotation", `${rotation}deg`);
        cardElement.style.setProperty("--card-x", `${offsetX}px`);
        cardElement.style.setProperty("--card-y", `${offsetY}px`);
        cardElement.style.setProperty("--stack-index", CARDS_PER_PACK - index);

        cardElement.setAttribute("aria-hidden", "true");
        cardStack.appendChild(cardElement);
    });

    cardStack.setAttribute(
        "aria-label",
        `Four cards in a stack. ${CARDS_PER_PACK} cards ready to reveal.`
    );
}

// Reveal the next card from the stack.


function revealNextCard() {
    if (!packStarted || packComplete) {
        return;
    }

    // First click: replace the pack with the card stack.
    if (revealedCount === 0 && !packImage.hidden) {
        packImage.hidden = true;
        cardStack.hidden = false;

        packInstructions.textContent =
            "Click the stack to reveal your first card.";

        return;
    }

    // Ignore clicks if the stack is still being shown.
    if (revealedCount === 0 && !cardStack.hidden) {
        const card = currentPack[0];

        cardStack.hidden = true;
        currentCard.replaceChildren(
            createCardElement(card, "large-card")
        );
        currentCard.hidden = false;

        revealedCount = 1;

        packInstructions.textContent =
            "Click the card to reveal the next one.";

        packStatus.textContent =
            `${revealedCount} of ${CARDS_PER_PACK} cards revealed`;

        return;
    }

    // Clicking a revealed card advances to the next card.
    if (!currentCard.hidden) {
        if (revealedCount < CARDS_PER_PACK) {
            const card = currentPack[revealedCount];

            currentCard.replaceChildren(
                createCardElement(card, "large-card")
            );

            revealedCount++;

            packInstructions.textContent =
                revealedCount < CARDS_PER_PACK
                    ? "Click the card to reveal the next one."
                    : "Click the last card to see your pack results.";

            packStatus.textContent =
                `${revealedCount} of ${CARDS_PER_PACK} cards revealed`;
        } else {
            finishPack();
        }
    }
}



// Show the completed pack and add its cards to the collection.

function finishPack() {
    packStarted = false;
    packComplete = true;

    packImage.hidden = true;
    cardStack.hidden = true;
    currentCard.hidden = true;

    currentCard.replaceChildren();
    cardStack.replaceChildren();
    revealedCards.replaceChildren();

    currentPack.forEach((card) => {
        revealedCards.appendChild(createCardElement(card));
    });

    collection.push(...currentPack);
    renderCollection();

    packInstructions.textContent =
        "Pack complete! Here's what you pulled.";

    packStatus.textContent = "All four cards revealed!";

    packButton.hidden = true;
    anotherPackButton.hidden = false;
}

// Render all cards collected this session.
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

// Clicking the stack or the current card advances the reveal.
cardStack.addEventListener("click", revealNextCard);
currentCard.addEventListener("click", revealNextCard);

// Keyboard accessibility for the card stack.
cardStack.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        revealNextCard();
    }
});

// The button opens the pack initially and advances reveals afterwards.
packButton.addEventListener("click", () => {
    if (!packStarted && !packComplete) {
        startPack();
    }
});

anotherPackButton.addEventListener("click", startPack);
cardStack.addEventListener("click", revealNextCard);
currentCard.addEventListener("click", revealNextCard);


// Initial state.
packImage.src = "cards/pack.png";
packImage.hidden = false;
cardStack.hidden = true;
currentCard.hidden = true;
packButton.textContent = "Open Pack";
packStatus.textContent = "";
renderCollection();
