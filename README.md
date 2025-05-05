# Flipkart Availability Checker Pro (Chrome Extension)

A Chrome extension to check product availability across multiple locations on Flipkart. Automates pincode checks and provides real-time delivery status updates.

---

## 🚀 Features

- **Multi-Pincode Checking**: Check delivery availability for multiple locations simultaneously
- **State/City Selection**: Choose from predefined states and cities
- **Custom Pincodes**: Add custom pincodes with city/state details
- **Real-Time Updates**: Visual status indicators (Available/Unavailable/Error)
- **Error Handling**: Robust error reporting for failed checks
- **DOM Interaction**: Automatically interacts with Flipkart's UI elements

---

## 📥 Installation

### Prerequisites
- Google Chrome (version 88+)
- Clone/download this repository

### Steps
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the extension folder
4. Add required data files:
   - `data.js`: Predefined city/state data (`{ "State": { tier1: ["City1"], tier2: ["City2"] } }`)
   - `pincodeData.js`: City-to-pincode mapping (`{ "City": "Pincode" }`)

---

## 🛠 Usage

1. **Navigate to a Flipkart Product Page**  
   (URL must contain `/p/`, `/dl/`, or `pid=`)

2. **Open Extension Popup**  
   Click the extension icon in Chrome's toolbar

3. **Select States**  
   Choose states from dropdown → Cities with predefined pincodes appear

4. **Add Custom Pincodes (Optional)**  
   - Toggle "Add Custom Pincode"
   - Enter pincode (6 digits), city, and state
   - Click **Save Pincode to List**

5. **Start Check**  
   Click **Check Availability** to:
   - Validate page
   - Inject content script
   - Display real-time results

---

## ⚙ Configuration

### Data Files
- Modify `data.js`/`pincodeData.js` to update locations
- Custom pincodes persist in Chrome's local storage

### Performance Tuning
- Adjust `CHECK_DELAY_MS` in `background.js` (default: 5000ms between checks)
- Modify DOM selectors in `content.js` if Flipkart updates its UI

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not on Flipkart page" error | Refresh valid product page |
| Content script injection fails | Check console errors (Ctrl+Shift+J) |
| Pincode input not detected | Update selectors in `findPincodeInput()` |
| Status not updating | Increase wait time in `content.js` |

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

> **Disclaimer**: Educational use only. Comply with Flipkart's terms of service. Not affiliated with Flipkart.
