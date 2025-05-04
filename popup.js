// popup.js - Handles UI interactions, communication with background script
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const UI = {
      stateSelect: document.getElementById('stateSelect'),
      cityListContainer: document.getElementById('cityListContainer'),
      cityList: document.getElementById('cityList'),
      checkButton: document.getElementById('checkButton'),
      statusDiv: document.getElementById('status'),
      addPincodeToggle: document.getElementById('addPincodeToggle'),
      addPincodeSection: document.getElementById('addPincodeSection'),
      customPincodeInput: document.getElementById('customPincode'),
      customCityInput: document.getElementById('customCity'),
      customStateInput: document.getElementById('customState'),
      savePincodeBtn: document.getElementById('savePincodeBtn'),
  };

  // --- State ---
  let cityStatusMap = new Map();
  let savedCustomPincodes = {};
  let isChecking = false;

  // --- Initialization ---
  const init = async () => {
      showStatus('Loading extension...', 'info');
      await loadSavedPincodes();
      populateStateDropdown(); // Call the function to fill states
      setupEventListeners();
      // Check tab immediately on popup open for initial feedback
      checkActiveTab().then(isValid => {
           showStatus(isValid ? 'Ready. Select a state.' : 'Error: Not on a Flipkart product page.', isValid ? 'info' : 'error');
      });
  };

  // --- Helper Functions ---
  const showStatus = (message, type = 'info') => {
      UI.statusDiv.textContent = message;
      UI.statusDiv.className = type;
      UI.statusDiv.style.display = 'block';
      console.log(`Popup Status (${type}): ${message}`); // Added "Popup" prefix for clarity
  };

  const checkActiveTab = async () => {
       UI.checkButton.disabled = true; // Disable button initially
      try {
          let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
           if (!tab || !tab.url || !tab.url.toLowerCase().includes("flipkart.com") || !(tab.url.includes('/p/') || tab.url.includes('/dl/') || tab.url.includes('pid='))) {
                throw new Error("Not on a Flipkart product page.");
           }
           UI.checkButton.disabled = UI.stateSelect.selectedOptions.length === 0 || isChecking;
           return true; // Tab is valid
      } catch (e) {
          console.warn("Tab validation failed:", e.message);
          // Display error in status only if it hasn't already been set to a check error
          if (!isChecking || !UI.statusDiv.textContent.toLowerCase().includes('checking')) {
               showStatus(`Error: ${e.message}`, 'error');
          }
          UI.checkButton.disabled = true;
          return false; // Tab is invalid
      }
  };

  // --- Data Handling ---
  const loadSavedPincodes = async () => {
      try {
          const result = await chrome.storage.local.get(['savedCustomPincodes']);
          savedCustomPincodes = result.savedCustomPincodes || {};
          console.log("Loaded saved pincodes:", savedCustomPincodes);
      } catch (e) {
          console.error("Error loading saved pincodes:", e);
          showStatus("Error loading saved pincodes.", 'error');
      }
  };

  const saveCustomPincodeToList = async () => {
      const pincode = UI.customPincodeInput.value.trim();
      const city = UI.customCityInput.value.trim();
      const state = UI.customStateInput.value.trim();

      // Validation
      if (!/^\d{6}$/.test(pincode)) {
          showStatus("Invalid Pincode. Must be 6 digits.", 'error');
          return;
      }
      if (!city) {
          showStatus("City name cannot be empty.", 'error');
          return;
      }
      if (!state) {
          showStatus("State name cannot be empty.", 'error');
          return;
      }
       // Check if state exists in our data (case-insensitive check might be better)
       const knownStates = Object.keys(cityData);
       const stateExists = knownStates.some(knownState => knownState.toLowerCase() === state.toLowerCase());
       if (!stateExists) {
           // Use the closest matching known state name if possible or just use user input?
           // For now, just warn. You might want to normalize state names later.
           console.warn(`State '${state}' not in predefined cityData keys.`);
           // showStatus(`Warning: State '${state}' not recognized. Saving anyway.`, 'warning');
       }

      // Ensure state entry exists in storage object
      if (!savedCustomPincodes[state]) {
          savedCustomPincodes[state] = [];
      }

      const existing = savedCustomPincodes[state].find(item => item.pincode === pincode);
      if (existing) {
          showStatus(`Pincode ${pincode} (${existing.city}) already saved for ${state}.`, 'warning');
          return;
      }

      savedCustomPincodes[state].push({ pincode, city });
      try {
          await chrome.storage.local.set({ savedCustomPincodes });
          showStatus(`Saved ${pincode} (${city}) for ${state}.`, 'success');
          UI.customPincodeInput.value = '';
          UI.customCityInput.value = '';
          UI.customStateInput.value = '';
          const selectedStates = getSelectedStates();
          if (selectedStates.includes(state)) {
              await updateCityList(); // Refresh city list
          }
      } catch (e) {
          console.error("Error saving pincode:", e);
          showStatus("Error saving pincode.", 'error');
      }
  };

  // --- UI Population ---
  const populateStateDropdown = () => {
      try {
          // *** DEBUGGING LOGS START ***
          console.log("Attempting to populate states...");
          if (typeof cityData !== 'undefined' && cityData !== null) {
              console.log("cityData type:", typeof cityData);
              console.log("Number of keys in cityData:", Object.keys(cityData).length);
          } else {
              console.error("CRITICAL: cityData is undefined or null BEFORE populating states!");
              showStatus("Error: State data failed to load. Cannot populate states.", "error");
              return; // Stop execution if data isn't loaded
          }
           // *** DEBUGGING LOGS END ***

          const states = Object.keys(cityData).sort();

          if (states.length === 0) {
              console.warn("cityData found, but it contains no states.");
              showStatus("Warning: No states found in data file.", "warning");
              UI.stateSelect.innerHTML = '<option value="">No States Loaded</option>'; // Provide feedback
              return;
          }

          UI.stateSelect.innerHTML = states
              .map(state => `<option value="${state}">${state}</option>`)
              .join('');

           console.log(`Successfully populated ${states.length} states into dropdown.`);

      } catch (error) {
          console.error("Error during populateStateDropdown function:", error);
          showStatus(`Error populating states: ${error.message}`, "error");
          // Attempt to clear or show error state in dropdown
          UI.stateSelect.innerHTML = '<option value="">Error Loading States</option>';
      }
  };

  const getCitiesForSelectedStates = () => {
      const selectedStates = getSelectedStates();
      const cities = new Map();

      selectedStates.forEach(state => {
          // Check if cityData itself and the specific state key exist
           if (typeof cityData !== 'object' || cityData === null || !cityData[state]) {
               console.warn(`State data missing for "${state}" in getCitiesForSelectedStates`);
               return; // Skip this state if data is bad
           }

          // Add predefined cities
          [...cityData[state].tier1, ...cityData[state].tier2].forEach(cityName => {
              // Check if pincodeData exists and has the city key
              if (typeof pincodeData === 'object' && pincodeData !== null && pincodeData[cityName]) {
                  const pincode = pincodeData[cityName];
                   if (!cities.has(pincode)) {
                      cities.set(pincode, { pincode, city: cityName, state: state, isCustom: false });
                   }
              } else {
                   console.warn(`Pincode data missing for predefined city: "${cityName}"`);
              }
          });
          // Add saved custom cities for this state
          if (savedCustomPincodes && savedCustomPincodes[state]) {
               savedCustomPincodes[state].forEach(customItem => {
                   if (!cities.has(customItem.pincode)) {
                        cities.set(customItem.pincode, { ...customItem, state: state, isCustom: true });
                   }
               });
          }
      });
      return Array.from(cities.values()).sort((a, b) => a.city.localeCompare(b.city));
  };

  const updateCityList = async () => {
      const selectedStates = getSelectedStates();
      if (selectedStates.length === 0) {
          UI.cityListContainer.style.display = 'none';
          return;
      }
      UI.cityListContainer.style.display = 'block';
      UI.cityList.innerHTML = '';
      const citiesToShow = getCitiesForSelectedStates();
      if (citiesToShow.length === 0) {
           UI.cityList.innerHTML = '<div class="city-item">No predefined or saved cities found for the selected state(s).</div>';
           return;
      }
      citiesToShow.forEach(cityInfo => {
          const statusData = cityStatusMap.get(cityInfo.pincode) || { status: 'pending', message: '' };
          const cityItem = createCityListItem(cityInfo, statusData);
          UI.cityList.appendChild(cityItem);
      });
  };

  const createCityListItem = (cityInfo, statusData) => {
      const item = document.createElement('div');
      item.classList.add('city-item');
      item.dataset.pincode = cityInfo.pincode;
      let statusClass = '';
      let statusText = '';
      let message = statusData.message || '';
      switch (statusData.status) {
          case 'loading': statusClass = 'status-loading'; statusText = 'Checking...'; break;
          case 'available': statusClass = 'status-available'; statusText = 'Available'; break;
          case 'unavailable': statusClass = 'status-unavailable'; statusText = 'Unavailable'; if (!message) message = "Out of Stock"; break;
          case 'error': statusClass = 'status-error'; statusText = 'Error'; if (!message) message = "Check failed"; break;
          case 'pending': default: statusClass = 'status-pending'; statusText = 'Pending'; break;
      }
      item.innerHTML = `
          <span class="city-name" title="${cityInfo.city}, ${cityInfo.state} (${cityInfo.pincode})${cityInfo.isCustom ? ' [Custom]' : ''}">
              ${cityInfo.city} (${cityInfo.pincode})${cityInfo.isCustom ? ' *' : ''}
          </span>
          <span class="city-status ${statusClass}" title="${message}">
               ${statusText} <span class="status-icon"></span>
          </span>
      `;
      return item;
  };

  // --- Event Handlers ---
  const handleStateSelectionChange = () => {
      cityStatusMap.clear();
      const selectedStates = getSelectedStates();
      checkActiveTab().then(isValid => {
           if (isValid) {
                UI.checkButton.disabled = selectedStates.length === 0 || isChecking;
                showStatus(selectedStates.length > 0 ? 'Ready to check availability.' : 'Select a state to begin.', 'info');
           } else {
               UI.checkButton.disabled = true;
           }
      });
      updateCityList();
  };

  const handleToggleAddPincode = () => {
      UI.addPincodeSection.style.display = UI.addPincodeToggle.checked ? 'block' : 'none';
  };

  const handleCheckAvailability = () => {
      if (isChecking) return;
      checkActiveTab().then(isValid => {
           if (!isValid) {
               showStatus("Cannot start check: Not on a valid Flipkart product page.", "error");
               return;
           }
           const locationsToCheck = getCitiesForSelectedStates();
           if (locationsToCheck.length === 0) {
              showStatus("No cities selected or found for the chosen state(s).", 'warning');
              return;
           }
           isChecking = true;
           UI.checkButton.disabled = true;
           UI.checkButton.textContent = 'Checking...';
           UI.stateSelect.disabled = true;
           cityStatusMap.clear();
           locationsToCheck.forEach(loc => cityStatusMap.set(loc.pincode, { status: 'loading', message: '' }));
           updateCityList();
           showStatus(`Starting check for ${locationsToCheck.length} pincodes...`, 'info');
           let optionalCustomCheck = null;
           if (UI.addPincodeToggle.checked) {
               const pincode = UI.customPincodeInput.value.trim();
               const city = UI.customCityInput.value.trim();
               const state = UI.customStateInput.value.trim();
               if (/^\d{6}$/.test(pincode) && city && state) {
                  optionalCustomCheck = { pincode, city, state };
               }
           }
           chrome.runtime.sendMessage({
               action: "startCheck",
               locations: locationsToCheck,
               optionalCustom: optionalCustomCheck
           })
           .then(response => {
                if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError.message || "Communication error"); }
                if (response && response.status && response.status.startsWith("Error:")) { throw new Error(response.status); }
                console.log("Background script acknowledged startCheck.");
           })
           .catch(error => {
                console.error("Error initiating check:", error);
                showStatus(`Error: ${error.message}`, 'error');
                resetCheckState(`Error: ${error.message}`, 'error'); // Reset state on failure to send
           });
      });
  };

   const resetCheckState = (finalMessage = "Check finished.", messageType = 'info') => {
       isChecking = false;
       UI.stateSelect.disabled = false;
       checkActiveTab().then(isValid => {
          UI.checkButton.disabled = !isValid || UI.stateSelect.selectedOptions.length === 0;
       });
       UI.checkButton.textContent = 'Check Availability';
       // Only show final message if it's not just informational, or if the current status isn't an error
       if (messageType !== 'info' || UI.statusDiv.className !== 'error') {
            showStatus(finalMessage, messageType);
       }
  };

  // --- Message Listener (from Background) ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Popup received message:", message);
      switch (message.action) {
          case "updateSingleStatus":
              if (message.pincode && message.status) {
                  cityStatusMap.set(message.pincode, {
                      status: message.status,
                      message: message.message || ''
                  });
                  const item = UI.cityList.querySelector(`.city-item[data-pincode="${message.pincode}"]`);
                  if (item) {
                      const cityInfo = {
                          pincode: message.pincode,
                          city: item.querySelector('.city-name').textContent.split('(')[0].trim(),
                          state: '', // Not needed for redraw
                          isCustom: item.querySelector('.city-name').textContent.includes('*')
                      };
                       const newItem = createCityListItem(cityInfo, cityStatusMap.get(message.pincode));
                       item.replaceWith(newItem);
                  }
              }
              break;
          case "checkComplete":
              resetCheckState(message.status || "Check complete!", 'success');
              break;
          case "checkError":
               cityStatusMap.forEach((value, key) => {
                  if (value.status === 'loading') {
                       cityStatusMap.set(key, { status: 'error', message: 'Check aborted due to error' });
                  }
              });
              updateCityList();
              resetCheckState(`Error: ${message.error}`, 'error');
              break;
           case "updateStatus":
              if (UI.statusDiv.className !== 'error') { // Don't overwrite existing error messages
                  showStatus(message.status, 'info');
              }
              break;
           default:
              console.log("Unknown message action received:", message.action);
      }
      return false;
  });

  // --- Setup Event Listeners ---
  const setupEventListeners = () => {
      UI.stateSelect.addEventListener('change', handleStateSelectionChange);
      UI.addPincodeToggle.addEventListener('change', handleToggleAddPincode);
      UI.checkButton.addEventListener('click', handleCheckAvailability);
      UI.savePincodeBtn.addEventListener('click', saveCustomPincodeToList);
  };

  // --- Getters ---
  const getSelectedStates = () => {
      return Array.from(UI.stateSelect.selectedOptions).map(option => option.value);
  };

  // --- Start ---
  init(); // Call initialization function
});