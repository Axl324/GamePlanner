import { loadCollections, saveCollections, nextCollectionId } from "./storage.js";

const collectionForm = document.querySelector("#collection-form");
const formStatus = document.querySelector("#collection-form-status");
const statusBox = document.querySelector("#library-status");
const list = document.querySelector("#collection-list");

if (!collectionForm || !formStatus || !statusBox || !list) {
    throw new Error("Library page is missing a required element");
}

const state = {
    collections: loadCollections(),
    editingId: null,
    deletingId: null,
    message: null 
};

function createGameItem(game) {
    const item = document.createElement("li");
    item.className = "collection-game";

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

function createEditField(labelText, name, value, collectionId, required) {
    const field = document.createElement("div");
    field.className = "field";

    const inputId = "edit-" + name + "-" + collectionId;

    const label = document.createElement("label");
    label.setAttribute("for", inputId);
    label.textContent = labelText;

    const input = document.createElement("input");
    input.id = inputId;
    input.name = name;
    input.type = "text";
    input.setAttribute("value", value ?? "");

    if (required) {
        input.setAttribute("required", "");
    }

    field.append(label, input);
    return field;
}

function createEditForm(collection) {
    const form = document.createElement("form");
    form.className = "collection-edit-form";
    form.dataset.editForm = collection.id;

    const nameField = createEditField("Name", "name", collection.name, collection.id, true);
    nameField.querySelector("input").setAttribute("minlength", "2");

    const typeField = createEditField("Type", "type", collection.type, collection.id, true);
    const descriptionField = createEditField("Description", "description", collection.description, collection.id, false);

    const actions = document.createElement("div");
    actions.className = "collection-actions";

    const save = document.createElement("button");
    save.className = "button button-small";
    save.type = "submit";
    save.textContent = "Save changes";

    const cancel = document.createElement("button");
    cancel.className = "button button-outline button-small";
    cancel.type = "button";
    cancel.dataset.cancelEdit = "";
    cancel.textContent = "Cancel";

    actions.append(save, cancel);
    form.append(nameField, typeField, descriptionField, actions);
    return form;
}

function createActions(collection) {
    const actions = document.createElement("div");
    actions.className = "collection-actions";

    const edit = document.createElement("button");
    edit.className = "button button-small";
    edit.type = "button";
    edit.dataset.editCollection = collection.id;
    edit.textContent = "Edit";

    const remove = document.createElement("button");
    remove.className = "button button-danger button-small";
    remove.type = "button";
    remove.dataset.deleteCollection = collection.id;
    remove.textContent = "Delete";

    actions.append(edit, remove);
    return actions;
}

function createDeleteConfirm(collection, gameCount) {
    const box = document.createElement("div");
    box.className = "collection-confirm";

    const question = document.createElement("p");
    question.textContent = gameCount === 1 ? "Delete \"" + collection.name + "\" and its 1 game?" : "Delete \"" + collection.name + "\" and its " + gameCount + " games?";

    const actions = document.createElement("div");
    actions.className = "collection-actions";

    const yes = document.createElement("button");
    yes.className = "button button-small";
    yes.type = "button";
    yes.dataset.confirmDelete = collection.id;
    yes.textContent = "Yes, delete";

    const no = document.createElement("button");
    no.className = "button button-outline button-small";
    no.type = "button";
    no.dataset.cancelDelete = "";
    no.textContent = "Cancel";

    actions.append(yes, no);
    box.append(question, actions);
    return box;
}

function createCollection(collection) {
    const item = document.createElement("li");
    item.className = "collection-card";
    item.dataset.collectionId = collection.id;

    const games = Array.isArray(collection.games) ? collection.games : [];

    if (games.length >= 6) {
        item.dataset.size = "large";
    } else if (games.length >= 3) {
        item.dataset.size = "wide";
    } else {
        item.dataset.size = "small";
    }

    const editing = state.editingId === collection.id;

     if (editing) {
        item.append(createEditForm(collection));
    } else {
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
    }

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

    if (state.deletingId === collection.id) {
        item.append(createDeleteConfirm(collection, games.length));
    } else if (!editing) {
        item.append(createActions(collection));
    }

    return item;
}

function render() {
    statusBox.textContent = "";
    list.textContent = "";

    let summary = "You have " + state.collections.length + " collections.";

    if (state.collections.length === 0) {
        summary = "You have no collections yet.";
    }

    statusBox.textContent = state.message ? state.message + " " + summary : summary;
    list.append(...state.collections.map(createCollection));
}

function openEdit(collectionId) {
    state.editingId = collectionId;
    state.deletingId = null;
    state.message = null;
    render();
}

function closeEdit() {
    state.editingId = null;
    render();
}

function saveEdit(collectionId, data) {
    const collections = loadCollections();
    const target = collections.find(collection => collection.id === collectionId);

    if (!target) {
        state.collections = collections;
        state.editingId = null;
        state.message = "That collection no longer exists.";
        render();
        return;
    }

    target.name = data.name;
    target.type = data.type;
    target.description = data.description;

    if (!saveCollections(collections)) {
        state.message = "The changes could not be saved.";
        render();
        return;
    }

    state.collections = collections;
    state.editingId = null;
    state.message = "Collection \"" + target.name + "\" updated.";
    render();
}

function askDelete(collectionId) {
    state.deletingId = collectionId;
    state.editingId = null;
    state.message = null;
    render();
}

function cancelDelete() {
    state.deletingId = null;
    render();
}

function deleteCollection(collectionId) {
    const collections = loadCollections();
    const target = collections.find(collection => collection.id === collectionId);
    const updated = collections.filter(collection => collection.id !== collectionId);

    if (!saveCollections(updated)) {
        state.message = "The collection could not be deleted.";
        render();
        return;
    }

    state.collections = updated;
    state.deletingId = null;
    state.message = target ? "Collection \"" + target.name + "\" deleted." : null;
    render();
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
    state.message = null;
    formStatus.textContent = "Collection \"" + newCollection.name + "\" created.";
    render();
});

list.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-collection]");
    if (editButton && list.contains(editButton)) {
        openEdit(Number(editButton.dataset.editCollection));
        return;
    }

    const cancelEditButton = event.target.closest("[data-cancel-edit]");
    if (cancelEditButton && list.contains(cancelEditButton)) {
        closeEdit();
        return;
    }

    const deleteButton = event.target.closest("[data-delete-collection]");
    if (deleteButton && list.contains(deleteButton)) {
        askDelete(Number(deleteButton.dataset.deleteCollection));
        return;
    }

    const confirmButton = event.target.closest("[data-confirm-delete]");
    if (confirmButton && list.contains(confirmButton)) {
        deleteCollection(Number(confirmButton.dataset.confirmDelete));
        return;
    }

    const cancelDeleteButton = event.target.closest("[data-cancel-delete]");
    if (cancelDeleteButton && list.contains(cancelDeleteButton)) {
        cancelDelete();
    }
});

list.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-edit-form]");
    if (!form || !list.contains(form)) return;
    if (!form.reportValidity()) return;

    event.preventDefault();

    const data = Object.fromEntries(new FormData(form));
    saveEdit(Number(form.dataset.editForm), data);
});

render();