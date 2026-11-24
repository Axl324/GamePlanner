import { loadCollections, saveCollections, nextCollectionId } from "./storage.js";

const collectionForm = document.querySelector("#collection-form");
const formStatus = document.querySelector("#collection-form-status");
const statusBox = document.querySelector("#library-status");
const list = document.querySelector("#collection-list");

if (!collectionForm || !formStatus || !statusBox || !list) {
    throw new Error("Library page is missing a required element");
}

const state = {
    collections: loadCollections()
};

function createGameItem(game) {
    const item = document.createElement("li");
    item.className = "collection-game";
3
    if (game.image) {
        const cover = document.createElement("img");
        cover.className = "game-thumb";
        cover.src = game.image;
        cover.width = 600;
        cover.height = 338;
        cover.alt = "";
        item.append(cover);
    }

    const name = document.createElement("p");
    name.textContent = game.name;

    item.append(name);
    return item;
}

function createCollection(collection) {
    const item = document.createElement("li");
    item.className = "collection-card";
    item.dataset.collectionId = collection.id;

    const title = document.createElement("h3");
    title.textContent = collection.name;

    const type = document.createElement("p");
    type.className = "label";
    type.textContent = collection.type;

    item.append(title, type);

    if (collection.description) {
        const description = document.createElement("p");
        description.textContent = collection.description;
        item.append(description);
    }

    const games = Array.isArray(collection.games) ? collection.games : [];

    const count = document.createElement("p");
    count.className = "collection-meta";
    count.textContent = games.length + " games";
    item.append(count);

    if (games.length > 0) {
        const gameList = document.createElement("ul");
        gameList.className = "collection-games";
        gameList.append(...games.map(createGameItem));
        item.append(gameList);
    }
    else {
        const empty = document.createElement("p");
        empty.textContent = "No games yet. ";

        const link = document.createElement("a");
        link.href = "GameExplorer.html";
        link.textContent = "Add games from the Game Explorer";

        empty.append(link);
        item.append(empty);
    }

    return item;
}

function render() {
    statusBox.textContent = "";
    list.textContent = "";

    if (state.collections.length === 0) {
        statusBox.textContent = "You have no collections yet.";
        return;
    }

    statusBox.textContent = "You have " + state.collections.length + " collections.";
    list.append(...state.collections.map(createCollection));
}

collectionForm.addEventListener("submit", (event) => {
    if (!collectionForm.reportValidity()) return;

    event.preventDefault();

    const data = Object.fromEntries(new FormData(collectionForm));
    const collections = loadCollections();

    const newCollection = {
        id: nextCollectionId(collections),
        name: data.name,
        type: data.type,
        description: data.description,
        games: [],
        sessions: []
    };

    const update = [...collections, newCollection];

    if (!saveCollections(update)) {
        formStatus.textContent = "The collection could not be saved";
        return;
    }

    state.collections = update;
    formStatus.textContent = "Collection \"" + newCollection.name + "\" created.";
    render();
});

render();