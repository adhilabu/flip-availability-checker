// content.js - Injected into Flipkart page to interact with the DOM

// Helper function to find the pincode input using multiple strategies
function findPincodeInput() {
    const selectors = [
        'input[class*="_36yFo0"]', // Original selector (keep as first try)
        'input[placeholder*="Enter Delivery Pincode"]', // Check placeholder text (often stable)
        'input[placeholder*="pincode"]', // Broader placeholder check
        // Add more selectors here if needed based on future Flipkart updates
        // e.g., looking for an input near a label with text "Delivery"
        // 'label:contains("Delivery") + input' // Requires jQuery or complex querySelectorAll logic
    ];

    for (const selector of selectors) {
        try {
            const inputElement = document.querySelector(selector);
            if (inputElement) {
                console.log(`Content Script: Found pincode input using selector: ${selector}`);
                return inputElement;
            }
        } catch (e) {
             console.warn(`Content Script: Error trying selector "${selector}": ${e.message}`);
        }
    }

    console.error("Content Script: Pincode input field not found using any known selectors. Flipkart page structure might have changed significantly.");
    return null; // Return null if not found
}


// Ensure function is defined globally for injection checks
window.checkPincode = async function(pincode) {
    console.log(`Content Script: Attempting to check pincode ${pincode}`);

    const pincodeInput = findPincodeInput(); // Use the helper function

    if (!pincodeInput) {
        // Specific error message if input is not found after trying all selectors
        return { pincode: pincode, status: "Error: Pincode input field could not be located on the page." };
    }

    // Check if the input is disabled (might indicate page loading state)
    if (pincodeInput.disabled) {
        console.warn("Content Script: Pincode input is disabled. Waiting briefly...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec
        if (pincodeInput.disabled) {
            return { pincode: pincode, status: "Error: Pincode input is disabled" };
        }
    }

    const checkButton = pincodeInput.nextElementSibling; // Keep simple logic for button for now

    // --- Simulate User Input ---
    try {
        pincodeInput.focus();
        pincodeInput.value = ''; // Clear existing value
        // Dispatch events that frameworks like React might listen for
        pincodeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        pincodeInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        await new Promise(resolve => setTimeout(resolve, 100)); // Delay after clearing

        pincodeInput.value = pincode;
        // Simulate typing character by character for better compatibility
        // for (const char of pincode) {
        //     pincodeInput.value += char;
        //     pincodeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        //     await new Promise(resolve => setTimeout(resolve, 20)); // Tiny delay between chars
        // }
        pincodeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        pincodeInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        await new Promise(resolve => setTimeout(resolve, 150)); // Delay before check trigger

    } catch (e) {
         console.error("Content Script: Error during pincode input simulation:", e);
         return { pincode: pincode, status: "Error: Failed to simulate pincode input" };
    }

    // --- Trigger Check ---
    let checkTriggered = false;
    try {
         if (checkButton && checkButton.tagName === 'BUTTON' && !checkButton.disabled) {
            console.log("Content Script: Clicking check button.");
            checkButton.click();
            checkTriggered = true;
        } else {
            console.warn("Content Script: Check button not found/suitable. Trying 'Enter' key fallback.");
            pincodeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            pincodeInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            checkTriggered = true; // Assume it might work
        }
    } catch(e) {
        console.error("Content Script: Error triggering pincode check:", e);
        // Don't immediately return error, let status reading proceed, it might have worked partially
    }


    // --- Wait and Read Result ---
    console.log("Content Script: Waiting for delivery status update...");
    await new Promise(resolve => setTimeout(resolve, 3500)); // Wait 3.5 seconds

    let statusText = "Status Unknown";
    try {
         // Try to find the parent container relative to the input field
         // This selector might also need adjustment based on Flipkart's structure
         const parentContainer = pincodeInput.closest('div[class*="_3XINqE"], div[class*="pincode-widget"]'); // Add potential parent classes
         const deliveryInfoElement = parentContainer ? parentContainer.querySelector('div[class*="_16myGU"], div[class*="delivery-message"]') : null; // Add potential message classes

         if (deliveryInfoElement && deliveryInfoElement.offsetParent !== null) { // Check if visible
             statusText = deliveryInfoElement.textContent.trim();
             console.log("Content Script: Found delivery info element:", statusText);
         } else {
             console.warn("Content Script: Primary delivery info element not found or not visible. Checking text patterns...");
             const nearbyText = parentContainer ? parentContainer.innerText : document.body.innerText.substring(0, 5000); // Limit search scope

             if (nearbyText.includes('Currently out of stock') || nearbyText.includes('Sold Out')) {
                 statusText = "Out of Stock";
             } else if (nearbyText.match(/Delivery by \w+/)) {
                statusText = nearbyText.match(/Delivery by .*?(?=[<,.])/)[0];
             } else if (nearbyText.match(/Delivery in \d+-\d+ days/)) { // Another common pattern
                 statusText = nearbyText.match(/Delivery in \d+-\d+ days/)[0].trim();
             } else if (nearbyText.includes('Enter Pincode') && pincodeInput.value === pincode) {
                 // If the input still has our pincode and the prompt is visible, it likely failed
                 statusText = "Status Unknown (Check failed or page didn't update)";
             } else if (nearbyText.toLowerCase().includes(pincode)) {
                 // If the pincode is reflected somewhere but no clear status, assume available but uncertain date
                 statusText = "Available (Delivery date unclear)";
             }
             console.log(`Content Script: Fallback status based on text patterns: ${statusText}`);
         }
    } catch (e) {
        console.error("Content Script: Error reading status element:", e);
        statusText = "Error: Reading status failed";
    }

    console.log(`Content Script: Final Status for ${pincode}: ${statusText}`);
    return { pincode: pincode, status: statusText };
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content Script: Received message:", message);
    if (message.action === "checkPincode") {
        if (typeof window.checkPincode === 'function') {
            window.checkPincode(message.pincode)
                .then(result => {
                    sendResponse(result);
                })
                .catch(error => {
                    console.error("Content Script Error during checkPincode:", error);
                    // Ensure a structured error response is sent back
                    sendResponse({ pincode: message.pincode, status: `Error: ${error.message || 'Unknown content script error'}` });
                });
        } else {
             console.error("Content Script: checkPincode function not defined on window.");
             sendResponse({ pincode: message.pincode, status: "Error: Content script function missing" });
        }
        return true; // Indicates asynchronous response
    }
     return false; // No async response for other actions
});

console.log("Flipkart Availability Checker content script loaded and listener added.");