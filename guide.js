import { loadChat, saveChat, clearChat } from "./storage.js";

const config = await import("./config.js").catch(() => null);
const GEMINI_API_KEY = config?.GEMINI_API_KEY ?? "";

// "gemini-flash-latest" always points to Google's current Flash model, so it keeps working
// when older versions are retired (gemini-2.5-flash already returns 404 for new API keys).
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = [
    "You are GameGuide, the video game assistant of GamePlanner+.",
    "Your only job is to suggest video games to play next, based on the genres the user likes,",
    "how much time they have, the platforms they own, and their other preferences.",
    "Give 1 to 3 suggestions. For each one, write the game's name and one or two sentences on why it fits.",
    "If you need more information, ask one short question first.",
    "Write plain text only: no markdown, no asterisks, no headings.",
    "If the user asks about anything that is not choosing a video game, politely say you can only help with game suggestions."
].join(" ");

const WELCOME = "Hi! I'm GameGuide. Tell me what genres you enjoy, which platforms you play on and how much time you have, and I'll suggest something to play next.";

const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const statusBox = document.querySelector("#chat-status");
const resetButton = document.querySelector("#chat-reset");

if (!chatLog || !chatForm || !chatInput || !statusBox || !resetButton) {
    throw new Error("Guide page is missing a required element");
}

const sendButton = chatForm.querySelector("button[type='submit']");

const state = {
    messages: loadChat(),
    pending: false,
    error: null,
    canRetry: false
};

class GeminiError extends Error {
    constructor(status, detail) {
        super("HTTP " + status);
        this.status = status;
        this.detail = detail ?? "";
    }
}

function messageFor(error) {
    if (error instanceof GeminiError) {
        if (error.status === 403 || (error.status === 400 && /api key/i.test(error.detail))) {
            return "The Gemini API key is missing or not valid. Check GEMINI_API_KEY in config.js.";
        }
        if (error.status === 404) {
            return "The Gemini model \"" + GEMINI_MODEL + "\" was not found. Change GEMINI_MODEL in guide.js. " + error.detail;
        }
        if (error.status === 429) {
            return "GameGuide is getting too many requests. Wait a moment and try again.";
        }
        if (error.status === 503) {
            return "Gemini is busy right now. Wait a moment and try again.";
        }
        return "GameGuide could not answer (" + error.message + "). Try again.";
    }
    if (error.message === "Empty reply") {
        return "GameGuide did not send an answer. Try asking in a different way.";
    }
    return "GameGuide could not be reached. Check your connection and try again.";
}

function logResponse(status, data) {
    console.log("Gemini response (HTTP " + status + "):\n" + JSON.stringify(data, null, 2));
}

async function askGemini(messages) {
    const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: messages.slice(-MAX_HISTORY).map(message => ({
                role: message.role,
                parts: [{ text: message.text }]
            }))
        })
    });

    if (!response.ok) {
        let detail = "";
        try {
            const data = await response.json();
            logResponse(response.status, data);
            detail = data?.error?.message ?? "";
        }
        catch {
            // The error body was not JSON; the status code is enough.
            logResponse(response.status, null);
        }
        throw new GeminiError(response.status, detail);
    }

    const data = await response.json();
    logResponse(response.status, data);
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map(part => part.text ?? "").join("").trim() : "";

    if (text === "") {
        throw new Error("Empty reply");
    }
    return text;
}

function createMessage(role, text, extraClass) {
    const item = document.createElement("li");
    item.className = "message " + (role === "user" ? "message-user" : "message-bot");
    if (extraClass) {
        item.classList.add(extraClass);
    }
    item.textContent = text;
    return item;
}

function render() {
    chatLog.textContent = "";
    statusBox.textContent = "";

    chatLog.append(createMessage("model", WELCOME));
    chatLog.append(...state.messages.map(message => createMessage(message.role, message.text)));

    if (state.pending) {
        chatLog.append(createMessage("model", "GameGuide is thinking…", "message-pending"));
    }

    if (state.error) {
        statusBox.textContent = state.error + " ";

        if (state.canRetry) {
            const retry = document.createElement("button");
            retry.className = "button button-small";
            retry.type = "button";
            retry.dataset.retry = "";
            retry.textContent = "Retry";
            statusBox.append(retry);
        }
    }

    const blocked = state.pending || GEMINI_API_KEY === "";
    chatInput.disabled = blocked;
    sendButton.disabled = blocked;
    resetButton.disabled = state.pending;

    chatLog.scrollTop = chatLog.scrollHeight;
}

async function requestReply() {
    state.pending = true;
    state.error = null;
    state.canRetry = false;
    render();

    try {
        const reply = await askGemini(state.messages);
        state.messages = [...state.messages, { role: "model", text: reply }];
        saveChat(state.messages);
    }
    catch (error) {
        state.error = messageFor(error);
        state.canRetry = true;
    }
    finally {
        state.pending = false;
        render();
        chatInput.focus();
    }
}

chatForm.addEventListener("submit", (event) => {
    if (!chatForm.reportValidity()) return;
    event.preventDefault();
    if (state.pending) return;

    const text = chatInput.value.trim();
    if (text === "") return;

    state.messages = [...state.messages, { role: "user", text: text }];
    saveChat(state.messages);
    chatInput.value = "";
    requestReply();
});

statusBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-retry]");
    if (!button || !statusBox.contains(button) || state.pending) return;

    const last = state.messages[state.messages.length - 1];
    if (last && last.role === "user") {
        requestReply();
    }
});

resetButton.addEventListener("click", () => {
    if (state.pending) return;
    clearChat();
    state.messages = [];
    state.error = null;
    state.canRetry = false;
    render();
    chatInput.focus();
});

if (!config) {
    state.error = "Missing config.js. Copy config.example.js to config.js and add your API keys.";
}
else if (GEMINI_API_KEY === "") {
    state.error = "The Gemini API key is missing. Add GEMINI_API_KEY to config.js.";
}
else if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === "user") {
    state.error = "Your last message did not get an answer.";
    state.canRetry = true;
}

render();
