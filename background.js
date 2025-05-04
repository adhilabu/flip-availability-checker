// background.js - Handles check process, communicates with content script and popup.

// Import data script (assuming it's available)
try {
    importScripts("data.js");
} catch (e) {
    console.error("Error importing data.js:", e);
}

// --- Constants ---
const CHECK_DELAY_MS = 5000;

// --- State ---
let isChecking = false;
let checkQueue = [];
let results = [];
let currentTabId = null;
let totalLocationsToCheck = 0;

// --- Helper Functions ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get the active tab and VALIDATE it's a likely Flipkart product page
async function getCurrentTab() {
    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            throw new Error("Could not find active tab.");
        }
        // Stricter URL Check: Must be flipkart.com AND look like a product page URL
        if (!tab.url || !tab.url.toLowerCase().includes("flipkart.com") || !(tab.url.includes('/p/') || tab.url.includes('/dl/') || tab.url.includes('pid='))) {
             console.error("Validation Fail: Current tab is not a recognized Flipkart product page URL:", tab.url);
             throw new Error("Not on a Flipkart product page. Please navigate to a product.");
        }
        currentTabId = tab.id;
        console.log("Current tab validated:", currentTabId, tab.url);
        return tab;
    } catch (e) {
        console.error("Error getting or validating current tab:", e);
        currentTabId = null; // Reset tab ID on error
        throw e; // Re-throw the specific error
    }
}

async function ensureContentScriptInjected(tabId) {
     if (!tabId) {
         throw new Error("Cannot inject script: Invalid Tab ID.");
     }
    try {
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => typeof window.checkPincode === 'function',
        });
        if (injectionResults && injectionResults[0] && injectionResults[0].result === true) {
            return true; // Already injected
        }
    } catch (e) {
        console.log("Content script check failed, attempting injection:", e.message);
    }
    try {
        console.log(`Injecting content script into tab ${tabId}...`);
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"],
        });
        console.log("Content script injected successfully.");
        await sleep(500);
        return true;
    } catch (e) {
        console.error(`Failed to inject content script into tab ${tabId}:`, e);
        // Check for common injection errors
        if (e.message.includes("Cannot access chrome://") || e.message.includes("Cannot access contents of url")) {
             throw new Error(`Cannot access this page (${tabId}). Is it a Chrome internal page or restricted?`);
        }
         throw new Error(`Failed to inject script: ${e.message}`);
    }
}

// Send detailed status update about a single pincode to the popup
function updatePopupSingleStatus(pincode, status, message = '', updateText = '') {
    chrome.runtime.sendMessage({
        action: "updateSingleStatus",
        pincode: pincode,
        status: status, // 'available', 'unavailable', 'error'
        message: message,
        update: updateText || `Checked ${pincode}: ${status}`
    }).catch(e => console.warn("Popup not open or error sending single status:", e.message)); // Warn instead of log
}

// Send general status update or completion/error signal
function signalPopup(action, data) {
     chrome.runtime.sendMessage({ action: action, ...data })
       .catch(e => console.warn(`Popup not open or error sending ${action} signal:`, e.message)); // Warn instead of log
}

// Builds the list of locations based *only* on the data sent from the popup
function buildLocationListFromPopupData(popupData) {
    // ... (keep the existing logic from the previous version)
    const locations = new Set();
    const addedPincodes = new Set();
    if (popupData.locations && Array.isArray(popupData.locations)) {
        popupData.locations.forEach(loc => {
            if (loc.pincode && loc.city && loc.state && !addedPincodes.has(loc.pincode)) {
                 locations.add(JSON.stringify({ pincode: loc.pincode, city: loc.city, state: loc.state }));
                 addedPincodes.add(loc.pincode);
            }
        });
    }
     if (popupData.optionalCustom && popupData.optionalCustom.pincode) {
         const { pincode, city, state } = popupData.optionalCustom;
         if (/^\d{6}$/.test(pincode) && city && state && !addedPincodes.has(pincode)) {
              locations.add(JSON.stringify({ pincode, city, state }));
              addedPincodes.add(pincode);
         }
     }
    console.log(`Built location list with ${locations.size} unique locations.`);
    return Array.from(locations).map(item => JSON.parse(item));
}


// Processes the check queue item by item
async function processQueue() {
    if (!isChecking || checkQueue.length === 0) {
        isChecking = false;
        console.log("Check queue empty or process stopped. Finishing.");
        const finalStatus = `Check complete. ${results.length} locations processed.`;
        signalPopup("checkComplete", { status: finalStatus });
        // Optional: Save or export results here
        // chrome.storage.local.set({ lastResults: results });
        return;
    }

    const location = checkQueue.shift(); // Get the next location {pincode, city, state}
    const currentNum = totalLocationsToCheck - checkQueue.length;
    const progressText = `Checking ${currentNum}/${totalLocationsToCheck}: ${location.city} (${location.pincode})...`;

    try {
        // **Critical Re-validation before each check**
        await getCurrentTab(); // Re-validates tab URL and updates currentTabId
        if (!currentTabId) {
            throw new Error("Target tab is no longer valid or accessible."); // Should have been caught by getCurrentTab, but double-check
        }
        await ensureContentScriptInjected(currentTabId); // Ensure script is still there

        // Send message to content script
        console.log(`Background: Sending checkPincode for ${location.pincode} to tab ${currentTabId}`);
        const response = await chrome.tabs.sendMessage(currentTabId, {
            action: "checkPincode",
            pincode: location.pincode
        });

        // --- Process Response ---
        if (chrome.runtime.lastError) {
             // Specific check for disconnected port (tab closed or navigated away)
             if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                 throw new Error("Connection lost. Tab closed or navigated away?");
             }
             throw new Error(chrome.runtime.lastError.message || "Communication error with content script.");
        }
        if (!response || !response.status) {
            console.error("Background: Invalid response received from content script:", response);
            throw new Error("Invalid response from content script.");
        }
        console.log(`Background: Response for ${location.pincode}:`, response.status);

        // Interpret the status from content.js
        let finalStatus = 'unavailable'; // Default
        let message = response.status;   // Original message

        // Standardize common responses
        const lowerCaseStatus = response.status.toLowerCase();
        if (lowerCaseStatus.includes('error:')) { // Explicit error from content script
            finalStatus = 'error';
        } else if (lowerCaseStatus.startsWith('delivery by') || lowerCaseStatus.includes('available') || lowerCaseStatus.match(/delivery in \d+-\d+ days/)) {
            finalStatus = 'available';
        } else if (lowerCaseStatus.includes('out of stock') || lowerCaseStatus.includes('sold out')) {
            finalStatus = 'unavailable';
        } else if (lowerCaseStatus.includes('status unknown')) {
             finalStatus = 'error'; // Treat unknown status as an error condition
             message = message || "Could not determine status.";
        }
        // Add other specific keywords from Flipkart if needed

        results.push({ ...location, status: finalStatus, message: message });
        updatePopupSingleStatus(location.pincode, finalStatus, message, progressText);

    } catch (error) {
        console.error(`Error checking pincode ${location.pincode} (${location.city}):`, error);
        const errorMessage = error.message || "Unknown check error";
        results.push({ ...location, status: 'error', message: errorMessage });
        updatePopupSingleStatus(location.pincode, 'error', errorMessage, progressText);

        // *** Decide how to handle errors ***
        // Option 1: Stop the entire process on any error during check
        // signalPopup("checkError", { error: `Failed at ${location.pincode}: ${errorMessage}` });
        // isChecking = false; // This will cause processQueue to exit on next iteration check
        // return; // Stop processing immediately

        // Option 2: Continue processing the rest of the queue (Current behavior)
        signalPopup("updateStatus", { status: `Error on ${location.pincode}, continuing...` });
    }

    // Wait before processing the next item, unless it's the last one
    if (isChecking && checkQueue.length > 0) {
        await sleep(CHECK_DELAY_MS);
        processQueue(); // Process the next item recursively
    } else {
        processQueue(); // Process termination logic (queue empty or isChecking is false)
    }
}


// --- Message Listener (from Popup) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCheck") {
        if (isChecking) {
            sendResponse({ status: "Error: A check is already in progress." });
            return false;
        }

        // **Crucial Initial Validation**
        getCurrentTab()
            .then(tab => {
                // Tab is valid *at this moment*, proceed with setup
                console.log("Background: Received startCheck message, tab validated.", message);
                isChecking = true;
                results = [];
                checkQueue = buildLocationListFromPopupData(message);
                totalLocationsToCheck = checkQueue.length;

                if (checkQueue.length === 0) {
                    isChecking = false;
                    const msg = "No valid locations specified.";
                    signalPopup("checkComplete", { status: msg });
                    sendResponse({ status: msg });
                    return; // Don't proceed further
                }

                signalPopup("updateStatus", { status: `Starting check for ${checkQueue.length} locations...` });
                processQueue(); // Start processing the queue asynchronously
                sendResponse({ status: "Check initiated..." });

            })
            .catch(error => {
                // Error during initial tab validation (e.g., not on Flipkart)
                console.error("Error starting check during initial tab validation:", error);
                isChecking = false;
                const errorMsg = error.message || "Failed to start check.";
                // Send specific error back to popup immediately
                signalPopup("checkError", { error: errorMsg });
                sendResponse({ status: `Error: ${errorMsg}` });
            });

        return true; // Indicate async response is expected
    }
    // Add other message handlers if needed
    return false;
});

console.log("Background script loaded and listener added.");