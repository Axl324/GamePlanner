import { loadCollections, saveCollections } from "./storage.js";

const RAWG_API_KEY = "7029afa004464b2ca94697bdee83bb5b";

const BASE_URL = "https://api.rawg.io/api/games";
const MAX_SEND_BACK = 12;

const searchForm = document.querySelector("#search-bar");
const sortBar = document.querySelector("#sort-bar");
const statusBox = document.querySelector("#results-status");
const loadMoreArea = document.querySelector("#load-more-data");
const list = document.querySelector("#game-results");
const ratingButton = document.querySelector('[data-sort="rating"]');
const nameButton = document.querySelector('[data-sort="name"]');
const releasedButton = document.querySelector('[data-sort="released"]');

if (!searchForm || !sortBar || !statusBox || !loadMoreArea || !list || !ratingButton || !nameButton || !releasedButton) {
    throw new Error("Game Explorer page is missing a required element");
}

const state = {
    games: [],
    loading: false,
    error: null,
    name: "",
    genre: "all",
    platform: "all",
    sort: null,
    page: 1,
    hasMore: false,
    loadingMore: false,
    loadMoreError: null,
    collections: loadCollections(),
    openGameId: null,
    cardMessage: null
};

function messageFor(error) {
    if (error.message === "HTTP 401") {
        return "The RAWG API key is missing or not valid. Check RAWG_API_KEY in explorer.js.";
    }
    return "The games could not be loaded (" + error.message + "). Check your connection and try again.";
}

function buildUrl() {
    let url = BASE_URL + "?key=" + RAWG_API_KEY + "&page_size=" + MAX_SEND_BACK + "&page=" + state.page;

    if (state.name !== "") {
        url += "&search=" + state.name;
    }
    if (state.genre !== "all") {
        url += "&genres=" + state.genre;
    }
    if (state.platform !== "all") {
        url += "&platforms=" + state.platform;
    }
    return url;
}

async function requestGame() {
    const response = await fetch(buildUrl());
    if (!response.ok) {
        throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    if (!Array.isArray(data.results)) {
        throw new Error("Invalid games data");
    }

    return data;
}

async function loadGames() {
    const submitButton = searchForm.querySelector("button");
    submitButton.disabled = true;

    state.page = 1;
    state.loading = true;
    state.error = null;
    state.loadMoreError = null;
    render();

    try {
        const data = await requestGame();
        state.games = data.results;
        state.hasMore = data.next ? true : false;
        state.error = null;
    } catch (error) {
        state.games = [];
        state.hasMore = false;
        state.error = messageFor(error);
    } finally {
        state.loading = false;
        submitButton.disabled = false;
        render();
    }
}

async function loadMore() {
    const submitButton = searchForm.querySelector("button");
    submitButton.disabled = true;

    state.page = state.page + 1;
    state.loadingMore = true;
    state.loadMoreError = null;
    render();

    try {
        const data = await requestGame();
        state.games = [...state.games, ...data.results];
        state.hasMore = data.next ? true : false;
    } catch (error) {
        state.page = state.page - 1;
        state.loadMoreError = messageFor(error);
    } finally {
        state.loadingMore = false;
        submitButton.disabled = false;
        render();
    }
}

function firstGenreofGame(game) {
    if (Array.isArray(game.genres) && game.genres.length > 0) {
        return game.genres[0].name;
    }
    return "not available";
}

function sortGames(games, sort) {
    if (sort === "rating") {
        return [...games].sort((a, b) => (a.rating > b.rating ? -1 : 1));
    }
    if (sort === "name") {
        return [...games].sort((a, b) => (a.name < b.name ? -1 : 1));
    }
    if (sort === "released") {
        return [...games].sort((a, b) => ((a.released ?? "") > (b.released ?? "") ? -1 : 1));
    }
    return [...games];
}

function isInCollection(collection, gameId) {
    if (!Array.isArray(collection.games)) return false;
    return collection.games.some(savedGame => savedGame.id === gameId);
}

function createCollectionSelecter(game) {
    const selecter = document.createElement("div");
    selecter.className = "collection-selecter";

    if (state.collections.length === 0) {
        const message = document.createElement("p");
        message.textContent = "You have no collections yet. ";

        const link = document.createElement("a");
        link.href = "Library.html";
        link.textContent = "Create one in My Library";

        message.append(link);
        selecter.append(message);
    }
    else {
        const label = document.createElement("p");
        label.textContent = "Add to:";
        selecter.append(label);

        for (const collection of state.collections) {
            const added = isInCollection(collection, game.id);
            const button = document.createElement("button");
            
            button.className = "button button-small";
            button.type = "button";
            button.dataset.addTo = collection.id;
            button.dataset.gameId = game.id;
            button.textContent = added ? "✓ " + collection.name : collection.name;
            button.disabled = added;

            selecter.append(button);
        }
    }

    const cancel = document.createElement("button");
    cancel.className = "button button-outline button-small";
    cancel.type = "button";
    cancel.dataset.closeSelecter = "";
    cancel.textContent = "Cancel";
    selecter.append(cancel);

    return selecter;
}

function createGame(game) {
    const item = document.createElement("li");
    item.className = "game-card";
    item.dataset.gameId = game.id;

    if (game.background_image) {
        const cover = document.createElement("img");
        cover.className = "game-cover";
        cover.src = game.background_image;
        cover.width = 600;
        cover.height = 338;
        cover.alt = "Cover of " + game.name;
        item.append(cover);
    }

    const title = document.createElement("h3");
    title.textContent = game.name;

    const details = document.createElement("ul");
    details.className = "game-details";

    const genre = document.createElement("li");
    genre.textContent = "Genre: " + firstGenreofGame(game);

    const rating = document.createElement("li");
    rating.textContent = game.rating > 0 ? "Rating: " + game.rating + " / 5" : "Rating: no rating yet";

    details.append(genre, rating);

    item.append(title, details);

    if (state.openGameId === game.id) {
        item.append(createCollectionSelecter(game));
    }
    else {
        const addButton = document.createElement("button");

        addButton.className = "button button-small";
        addButton.type = "button";
        addButton.dataset.openSelecter = game.id;
        addButton.textContent = "Add to collection";
        item.append(addButton);
    }

    if (state.cardMessage && state.cardMessage.gameId === game.id) {
        const message = document.createElement("p");
        message.className = "add-message";
        message.textContent = state.cardMessage.text;
        item.append(message);
    }

    return item;
}

function markSortButton(button) {
    const active = button.dataset.sort === state.sort;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
}

function renderSortButtons() {
    markSortButton(ratingButton);
    markSortButton(nameButton);
    markSortButton(releasedButton);
}

function renderLoadMore() {
    loadMoreArea.textContent = "";

    if (!state.hasMore || state.loading || state.error) {
        return;
    }

    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.dataset.loadMore = "";
    button.disabled = state.loadingMore;
    button.textContent = state.loadingMore ? "Loading more games…" : "Load more";
    loadMoreArea.append(button);
}

function openSelecter(gameId) {
    state.collections = loadCollections();
    state.openGameId = gameId;
    state.cardMessage = null;
    render();
}

function closeSelecter() {
    state.openGameId = null;
    render();
}

function addLocalGames(gameId, collectionId) {
    const game = state.games.find(result => result.id === gameId);

    state.collections = loadCollections();
    const target = state.collections.find(collection => collection.id === collectionId);
    
    state.openGameId = null;
    
    if(!game || !target) {
        state.cardMessage = {gameId: gameId, text: "That collection no longer exists."};
        render();
        return;
    }

    if(isInCollection(target, gameId)) {
        state.cardMessage = { gameId: gameId, text: "Already in " + target.name + "." };
        render();
        return;
    }

    const savedGame = {
        id: game.id,
        name: game.name,
        image: game.background_image ?? null,
        genre: firstGenreofGame(game),
        rating: game.rating
    };
    
    const previousGames = Array.isArray(target.games) ? target.games : [];
    target.games = [...previousGames, savedGame];

    if (!saveCollections(state.collections)) {
        target.games = previousGames;
        state.cardMessage = { gameId: gameId, text: "It could not be saved. Your browser may be blocking storage." };
        render();
        return;
    }

    state.cardMessage = { gameId: gameId, text: "Added to " + target.name + "." };
    render();
}

function render() {
    statusBox.textContent = "";
    list.textContent = "";
    renderSortButtons();
    renderLoadMore();

    if (state.loading) {
        statusBox.textContent = "Loading games…";
        return;
    }

    if (state.error) {
        statusBox.textContent = state.error + " ";

        const retry = document.createElement("button");
        retry.className = "button button-small";
        retry.type = "button";
        retry.dataset.retry = "";
        retry.textContent = "Retry";

        statusBox.append(retry);
        return;
    }

    if (state.games.length === 0) {
        statusBox.textContent = "No games found. Try another name, genre or platform.";
        return;
    }

    if (state.loadMoreError) {
        statusBox.textContent = state.loadMoreError;
    } else {
        statusBox.textContent = "Showing " + state.games.length + " games.";
    }
    list.append(...sortGames(state.games, state.sort).map(createGame));
}


statusBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-retry]");
    if (!button || !statusBox.contains(button)) return;
    loadGames();
});

loadMoreArea.addEventListener("click", (event) => {
    const button = event.target.closest("[data-load-more]");
    if (!button || !loadMoreArea.contains(button)) return;
    loadMore();
});

sortBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort]");
    if (!button || !sortBar.contains(button)) return;
    state.sort = button.dataset.sort;
    render();
});

searchForm.addEventListener("submit", (event) => {
    if (!searchForm.reportValidity()) return;
    event.preventDefault();

    const data = Object.fromEntries(new FormData(searchForm));
    state.name = data.search;
    state.genre = data.genre;
    state.platform = data.platform;
    loadGames();
});

list.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-selecter]");
    if (openButton && list.contains(openButton)) {
        openSelecter(Number(openButton.dataset.openSelecter));
        return;
    }

    const collectionButton = event.target.closest("[data-add-to]");
    if (collectionButton && list.contains(collectionButton)) {
        addLocalGames(Number(collectionButton.dataset.gameId), Number(collectionButton.dataset.addTo));
        return;
    }

    const cancelButton = event.target.closest("[data-close-selecter]");
    if (cancelButton && list.contains(cancelButton)) {
        closeSelecter();
    }
});

loadGames();
