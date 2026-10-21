const CARDS_PER_PACK = 4;

const RARITY_CHANCES = [
    { name: "Legendary", chance: 1 / 25, cards: () => legendaryCards },
    { name: "Epic", chance: 1 / 12, cards: () => epicCards },
    { name: "Rare", chance: 1 / 8, cards: () => rareCards },
    { name: "Uncommon", chance: 1 / 3, cards: () => uncommonCards }
];

// Cards collected during this browser session.
const collection = [];

// Pack state.
let currentPack = [];
let revealedCount = 0;
let packStarted = false;
let packComplete = false;
let openingStage = "idle";

// Page elements.
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

// ----------------------------------------
// Random card selection
// ----------------------------------------

function pickRandomCard(cardArray) {
    if (!Array.isArray(cardArray) || cardArray.length === 0) {
        return null;
    }

    return cardArray[Math.floor(Math.random() * cardArray.length)];
}

function drawCard() {
    const roll = Math.random();
    let cumulativeChance = 0;

    for (const rarity of RARITY_CHANCES) {
        cumulativeChance += rarity.chance;

        if (roll < cumulativeChance) {
            const cardId = pickRandomCard(rarity.cards());

            if (cardId !== null) {
                return {
                    id: cardId,
                    rarity: rarity.name
                };
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

    return {
        id: commonId,
        rarity: "Common"
    };
}

// ----------------------------------------
// Create a card element
// ----------------------------------------

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

    // Only the image is displayed. The card ID and rarity text
    // are not shown on the card itself.
    wrapper.appendChild(image);

    return wrapper;
}

// ----------------------------------------
// Start a new pack
// ----------------------------------------

function startPack() {
    try {
        const newPack = [];

        for (let i = 0; i < CARDS_PER_PACK; i++) {
            newPack.push(drawCard());
        }

        currentPack = newPack;
    } catch (error) {
        console.error(error);

        packStatus.textContent =
            "Unable to open a pack. Please check cards.js.";

        return;
    }

    revealedCount = 0;
    packStarted = true;
    packComplete = false;
    openingStage = "pack";

    // Reset all opening displays.
    packImage.src = "cards/pack.png";
    packImage.hidden = false;

    cardStack.replaceChildren();
    cardStack.hidden = true;

    currentCard.replaceChildren();
    currentCard.hidden = true;

    revealedCards.replaceChildren();

    // Reset controls.
    packButton.textContent = "Open Pack";
    packButton.hidden = false;
    anotherPackButton.hidden = true;

    packInstructions.textContent =
        "Your pack is ready. Click Open Pack to begin.";

    packStatus.textContent = "";
}

// ----------------------------------------
// Build the stack of four cards
// ----------------------------------------

function buildCardStack() {
    cardStack.replaceChildren();

    currentPack.forEach((card, index) => {
        const cardElement = createCardElement(card, "stacked-card");

        // Slightly offset and rotate the cards.
        const rotation =
            (index % 2 === 0 ? -1 : 1) * (index + 1) * 1.8;

        const offsetX = index * 3;
        const offsetY = index * 5;

        cardElement.style.setProperty(
            "--card-rotation",
            `${rotation}deg`
        );

        cardElement.style.setProperty("--card-x", `${offsetX}px`);
        cardElement.style.setProperty("--card-y", `${offsetY}px`);

        cardElement.style.setProperty(
            "--stack-index",
            CARDS_PER_PACK - index
        );

        cardStack.appendChild(cardElement);
    });
}

// ----------------------------------------
// Advance the opening sequence
// ----------------------------------------

function revealNextCard() {
    if (!packStarted || packComplete) {
        return;
    }

    // Stage 1: The pack image is visible.
    // Clicking the main button reveals the card stack.
    if (openingStage === "pack") {
        packImage.hidden = true;

        buildCardStack();
        cardStack.hidden = false;

        openingStage = "stack";

        packInstructions.textContent =
            "Click the stack to reveal your first card.";

        packStatus.textContent =
            `${CARDS_PER_PACK} cards inside your pack`;

        return;
    }

    // Stage 2: The stack is visible.
    // Clicking it reveals the first card by itself.
    if (openingStage === "stack") {
        cardStack.hidden = true;

        showNextCard();

        return;
    }

    // Stage 3: A single card is visible.
    // Clicking it replaces it with the next card.
    if (openingStage === "card") {
        if (revealedCount < CARDS_PER_PACK) {
            showNextCard();
        } else {
            finishPack();
        }
    }
}

// ----------------------------------------
// Show exactly one card
// ----------------------------------------

function showNextCard() {
    if (revealedCount >= CARDS_PER_PACK) {
        finishPack();
        return;
    }

    const card = currentPack[revealedCount];

    // Replace the previous card rather than adding another.
    currentCard.replaceChildren(
        createCardElement(card, "large-card")
    );

    // Ensure only the current card is visible.
    packImage.hidden = true;
    cardStack.hidden = true;
    currentCard.hidden = false;

    revealedCount++;
    openingStage = "card";

    packInstructions.textContent =
        revealedCount < CARDS_PER_PACK
            ? "Click the card to reveal the next one."
            : "Click the fourth card to see your pack results.";

    packStatus.textContent =
        `${revealedCount} of ${CARDS_PER_PACK} cards revealed`;
}

// ----------------------------------------
// Finish the pack
// ----------------------------------------

function finishPack() {
    if (packComplete) {
        return;
    }

    packStarted = false;
    packComplete = true;
    openingStage = "complete";

    // Hide the opening area displays.
    packImage.hidden = true;
    cardStack.hidden = true;
    currentCard.hidden = true;

    cardStack.replaceChildren();
    currentCard.replaceChildren();

    // Display all four cards together.
    revealedCards.replaceChildren();

    currentPack.forEach((card) => {
        revealedCards.appendChild(createCardElement(card));
    });

    // Add the cards to the session collection.
    collection.push(...currentPack);

    renderCollection();

    packInstructions.textContent =
        "Pack complete! Here's what you pulled.";

    packStatus.textContent = "All four cards revealed!";

    packButton.hidden = true;
    anotherPackButton.hidden = false;
}

// ----------------------------------------
// Render the collection
// ----------------------------------------

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
            collectionElement.appendChild(
                createCardElement(card)
            );
        });
    }

    collectionCount.textContent =
        `${collection.length} ${
            collection.length === 1 ? "card" : "cards"
        } collected`;
}

// ----------------------------------------
// Event listeners
// ----------------------------------------

// The main button starts the pack, then reveals the stack.
// It is hidden after the stack appears; subsequent reveals
// happen by clicking the stack or the current card.
packButton.addEventListener("click", () => {
    if (!packStarted && !packComplete) {
        startPack();
        return;
    }

    if (openingStage === "pack") {
        revealNextCard();
    }
});

// Clicking the stack reveals the first card.
cardStack.addEventListener("click", () => {
    if (openingStage === "stack") {
        revealNextCard();
    }
});

// Clicking a revealed card advances to the next card
// or displays the completed pack after the fourth card.
currentCard.addEventListener("click", () => {
    if (openingStage === "card") {
        revealNextCard();
    }
});

// Start another pack after completing the current one.
anotherPackButton.addEventListener("click", startPack);

// ----------------------------------------
// Initial page state
// ----------------------------------------

packImage.src = "cards/pack.png";
packImage.hidden = false;

cardStack.hidden = true;
currentCard.hidden = true;

packButton.textContent = "Open Pack";
packButton.hidden = false;

anotherPackButton.hidden = true;

packStatus.textContent = "";

renderCollection();
