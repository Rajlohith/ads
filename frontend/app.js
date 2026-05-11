const API_BASE_URL = "https://mablytic.onrender.com";
const USER_ID = 1; // Hardcoded for this phase to match our seeded data
let currentAdId = null;

// DOM Elements
const adContainer = document.getElementById("ad-container");
const adTitle = document.getElementById("ad-title");
const adContent = document.getElementById("ad-content");
const adActionBtn = document.getElementById("ad-action-btn");
const refreshBtn = document.getElementById("refresh-ad-btn");

// 1. Fetch the Ad
async function fetchAd() {
    try {
        const response = await fetch(`${API_BASE_URL}/serve-ad/${USER_ID}`);
        if (!response.ok) throw new Error("Failed to fetch ad");
        
        const ad = await response.json();
        currentAdId = ad.id;

        // Update UI
        adTitle.innerText = ad.title;
        adContent.innerText = ad.content;
        adContainer.classList.remove("hidden");

        // Log the 'view' interaction
        logInteraction("view");

    } catch (error) {
        console.error("Error fetching ad:", error);
    }
}

// 2. Log Interaction to Backend (The ML Data Feed)
async function logInteraction(type) {
    if (!currentAdId) return;

    const interactionData = {
        user_id: USER_ID,
        ad_id: currentAdId,
        interaction_type: type
    };

    try {
        await fetch(`${API_BASE_URL}/interactions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(interactionData)
        });
        console.log(`Successfully logged: ${type}`);
    } catch (error) {
        console.error(`Error logging ${type}:`, error);
    }
}

// 3. Event Listeners
adActionBtn.addEventListener("click", () => {
    logInteraction("click");
    alert("Ad clicked! (This is where you'd link to the product)");
});

refreshBtn.addEventListener("click", fetchAd);

// 4. Register Service Worker (PWA Requirement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Failed!', err));
    });
}

// Initialize on page load
fetchAd();