const STORAGE_KEY = "gamePlannerCollection"

export function loadCollections() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const collection = JSON.parse(raw ?? "[]");
        return Array.isArray(collection) ? collection : [];
    }
    catch {
        return [];
    }
}

export function saveCollections(collections) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
        return true;
    }
    catch {
        return false;
    }
}

export function nextCollectionId(collections) {
    let nextId = 1;
    for (const collection of collections) {
        if (collection.id >= nextId) {
            nextId = collection.id + 1;
        }
    }

    return nextId;
}

const CHAT_KEY = "gamePlannerChat";

export function loadChat() {
    try {
        const messages = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "[]");
        if (!Array.isArray(messages)) return [];
        return messages.filter(message =>
            (message?.role === "user" || message?.role === "model") && typeof message.text === "string");
    }
    catch {
        return [];
    }
}

export function saveChat(messages) {
    try {
        localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
        return true;
    }
    catch {
        return false;
    }
}

export function clearChat() {
    try {
        localStorage.removeItem(CHAT_KEY);
        return true;
    }
    catch {
        return false;
    }
}
