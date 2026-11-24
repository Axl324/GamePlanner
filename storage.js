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