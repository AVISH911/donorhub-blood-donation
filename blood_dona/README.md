# 🩸 DonorHub Frontend

## 📁 Folder Structure

```
blood_dona/
├── 📂 pages/              # HTML pages
│   ├── about.html
│   ├── donor.html
│   ├── doctor.html
│   ├── find_donor.html
│   ├── blood_request.html
│   ├── blood_bank_info.html
│   ├── blood_donation_camp.html
│   ├── notification.html
│   ├── education.html
│   └── test-find-donor.html
│
├── 📂 js/                 # JavaScript files
│   ├── api-utils.js           # API utility functions
│   ├── auth.js                # Authentication logic
│   ├── script.js              # Main scripts
│   ├── frontend-api.js        # Frontend API calls
│   ├── donor-api.js           # Donor API integration
│   ├── doctor-api.js          # Doctor API integration
│   ├── blood-request-api.js   # Blood request API
│   ├── blood-bank-api.js      # Blood bank API
│   ├── camp-api.js            # Camp API integration
│   ├── notification-api.js    # Notification system
│   └── otp-verification.js    # OTP verification
│
├── 📂 css/                # Stylesheets
│   ├── style.css              # Main styles
│   └── otp-styles.css         # OTP specific styles
│
├── 📂 assets/             # Images, fonts, icons (if any)
│
├── index.html             # Home page (root)
└── README.md              # This file
```

## 🎯 File Organization

### **Pages (`pages/`)**
All HTML pages except the home page (index.html stays in root for easy access)

### **JavaScript (`js/`)**
- **API Integration:** All `*-api.js` files handle backend communication
- **Utilities:** `api-utils.js` provides common API functions
- **Authentication:** `auth.js` manages user sessions
- **Scripts:** `script.js` contains general functionality

### **Styles (`css/`)**
- **Main Styles:** `style.css` - Global styles
- **Component Styles:** `otp-styles.css` - OTP modal styles

### **Assets (`assets/`)**
Place images, fonts, icons, and other static files here

## 🔗 Path Updates

When linking files in HTML, use relative paths:

### From `index.html` (root):
```html
<!-- CSS -->
<link rel="stylesheet" href="css/style.css">

<!-- JavaScript -->
<script src="js/api-utils.js"></script>
<script src="js/auth.js"></script>

<!-- Pages -->
<a href="pages/donor.html">Register as Donor</a>
```

### From pages in `pages/` folder:
```html
<!-- CSS -->
<link rel="stylesheet" href="../css/style.css">

<!-- JavaScript -->
<script src="../js/api-utils.js"></script>
<script src="../js/auth.js"></script>

<!-- Other pages -->
<a href="donor.html">Register as Donor</a>
<a href="../index.html">Home</a>
```

## 🚀 Development

### Local Development
1. Open `index.html` in your browser
2. Or use Live Server extension in VS Code
3. Make sure backend is running on `http://localhost:5000`

### Production
Deploy to Vercel, Netlify, or GitHub Pages

## 📝 Notes

- `index.html` stays in root for easy access and deployment
- All other pages are organized in `pages/` folder
- JavaScript files are modular and organized by feature
- CSS files are separated for better maintainability

## ✅ Benefits of This Structure

- **Clean Organization:** Easy to find files
- **Scalability:** Easy to add new pages/features
- **Maintainability:** Logical grouping of related files
- **Deployment Ready:** Works with all hosting platforms
- **Team Friendly:** Clear structure for collaboration
