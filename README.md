# Summary
This Chrome extension enhances car listings on Facebook Marketplace and Craigslist by injecting buttons that link directly to the Kelley Blue Book (KBB) evaluation website for quick price checking.

# Features
- Injects a KBB lookup button next to car listings
- Works on:
  - facebook.com/marketplace
  - any craigslist website
- Uses fuzzy matching to parse make and model from a listing title
  
# To develop

### 1. Clone the repository
```bash
git clone https://github.com/bordium/car-value-extension.git
cd car-value-extension
```

### 2. Install dependencies
```bash
npm install
```

### 3. Build production directory
```bash
npm run build
```

### 4. Test on chrome/chromium
- Navigate to chrome://extensions
- Make sure to enable developer mode in settings
- Load unpacked and navigate so that the /dist folder is the root directory
