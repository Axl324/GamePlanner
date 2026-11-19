const RAWG_API_KEY = "7029afa004464b2ca94697bdee83bb5b";

const BASE_URL = "https://api.rawg.io/api/games";
const MAX_SEND_BACK = 12;

const searchForm = document.querySelector("#search-bar");
const sortBar = document.querySelector("#sort-bar");
const statusBox = document.querySelector("#results-status");
const list = document.querySelector("#game-results");
const ratingButton = document.querySelector('[data-sort="rating"]');
const nameButton = document.querySelector('[data-sort="name"]');
const releasedButton = document.querySelector('[data-sort="released"]');

if (!searchForm || !sortBar || !statusBox || !list || !ratingButton || !nameButton || !releasedButton) {
    throw new Error("Game Explorer page is missing a required element");
}

const state = {
    games: [],
    loading: false,
    error: null,
    name: "",
    genre: "all",
    platform: "all",
    sort: null
};

function messageFor(error) {
    if (error.message === "HTTP 401") {
        return "The RAWG API key is missing or not valid. Check RAWG_API_KEY in explorer.js.";
    }
    return "The games could not be loaded (" + error.message + "). Check your connection and try again.";
}

function buildUrl() {
    let url = BASE_URL + "?key=" + RAWG_API_KEY + "&page_size=" + MAX_SEND_BACK;

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

    return data.results;
}

async function loadGames() {
    const submitButton = searchForm.querySelector("button");
    submitButton.disabled = true;

    state.loading = true;
    state.error = null;
    render();

    try {
        state.games = await requestGame();
        state.error = null;
    } catch (error) {
        state.games = [];
        state.error = messageFor(error);
    } finally {
        state.loading = false;
        submitButton.disabled = false;
        render();
    }
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
    let firstGenre = "not available";
    if (Array.isArray(game.genres) && game.genres.length > 0) {
        firstGenre = game.genres[0].name;
    }
    genre.textContent = "Genre: " + firstGenre;

    const rating = document.createElement("li");
    rating.textContent = game.rating > 0 ? "Rating: " + game.rating + " / 5" : "Rating: no rating yet";

    details.append(genre, rating);

    const addButton = document.createElement("button");
    addButton.className = "button button-small";
    addButton.type = "button";
    addButton.dataset.addGame = game.id;
    addButton.textContent = "Add to collection";

    item.append(title, details, addButton);
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

function render() {
    statusBox.textContent = "";
    list.textContent = "";
    renderSortButtons();

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

    statusBox.textContent = state.games.length + " games found.";
    list.append(...sortGames(state.games, state.sort).map(createGame));
}


statusBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-retry]");
    if (!button || !statusBox.contains(button)) return;
    loadGames();
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

loadGames();
