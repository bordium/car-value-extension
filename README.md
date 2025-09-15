# Summary
This Chrome extension enhances car listings on Facebook Marketplace and Craigslist by injecting buttons that link directly to the Kelley Blue Book (KBB) evaluation website for quick price checking.

# Features
- Injects a KBB lookup button next to car listings
- Works on:
  - facebook.com/marketplace
  - any craigslist website
- Uses fuzzy matching to parse make and model from a listing title
- Watchlist where valid cars can be added
  - Only works on craigslist for now.

# Future Improvements  
- Facebook button injection for adding to watchlist
- Sorting feature and data editing feature within the popup
- User options to change the look and feel of the popup, and enable and disable buttons.

# To develop

### 1. Create a fork of the repository

### 2. Clone the fork of the repository
```bash
git clone https://github.com/[YOUR USERNAME]/car-value-extension.git
cd car-value-extension
```

### 3. Install dependencies
```bash
npm install
```

### 4. Build production directory
```bash
npm run build
```

### 5. Test on chrome/chromium
- Navigate to chrome://extensions
- Make sure to enable developer mode in settings
- Load unpacked and navigate so that the /dist folder is the root directory

### 6. Create a pull request!

Thank you for viewing my project. :-) 