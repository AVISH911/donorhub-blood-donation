# 🩸 DonorHub - Blood Donation Platform

A comprehensive blood donation management system connecting donors, recipients, hospitals, and blood banks.

## 📋 Project Overview

DonorHub is a full-stack web application designed to streamline blood donation processes by:
- Connecting blood donors with those in need
- Managing blood donation camps
- Facilitating urgent blood requests
- Providing blood bank information
- Enabling doctor and donor registrations

## 🚀 Features

- **Donor Registration** - Register as a blood donor with complete profile
- **Doctor Registration** - Healthcare professionals can register and manage requests
- **Blood Requests** - Post urgent blood requirements
- **Find Donors** - Search for donors by blood type and location
- **Blood Camps** - View and register for donation camps
- **Blood Banks** - Directory of blood banks with contact information
- **Notifications** - Real-time updates on requests, camps, and donations
- **OTP Verification** - Secure email verification for registrations
- **Education** - Information about blood donation process and eligibility

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Responsive design
- RESTful API integration

### Backend
- Node.js + Express.js
- MongoDB (Mongoose ODM)
- JWT Authentication
- Nodemailer (Email service)
- OTP verification system

### Database
- MongoDB Atlas (Cloud database)
- Collections: donors, doctors, requests, camps, bloodbanks, users, otps

## 📁 Project Structure

```
PROJECT/
├── backend/              # Backend API server
│   ├── models/          # MongoDB schemas
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── scripts/         # Utility scripts
│   ├── docs/            # Backend documentation
│   └── server.js        # Main server file
│
├── blood_dona/          # Frontend application
│   ├── *.html          # Web pages
│   ├── *.js            # JavaScript files
│   └── *.css           # Stylesheets
│
└── docs/               # Project documentation
    ├── DEPLOYMENT-GUIDE.md
    ├── PROJECT-STRUCTURE.md
    └── FIXES-APPLIED.md
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Gmail account (for email service)

### Backend Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd PROJECT
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your credentials:
```env
MONGODB_URI=your_mongodb_atlas_connection_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
PORT=5000
```

4. **Start the backend server**
```bash
npm start
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. **Open frontend**
```bash
cd blood_dona
```

2. **Open in browser**
- Simply open `index.html` in your browser
- Or use a live server extension in VS Code

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/send-otp` - Send OTP for verification
- `POST /api/auth/verify-otp` - Verify OTP code

### Donors
- `POST /api/donors` - Register new donor
- `GET /api/donors` - Get all donors (with filters)
- `GET /api/donors/:id` - Get single donor

### Doctors
- `POST /api/doctors` - Register new doctor
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get single doctor

### Blood Requests
- `POST /api/requests` - Create blood request
- `GET /api/requests` - Get all requests (with filters)

### Blood Banks
- `POST /api/bloodbanks` - Add blood bank
- `GET /api/bloodbanks` - Get all blood banks

### Camps
- `POST /api/camps` - Create donation camp
- `GET /api/camps` - Get all camps
- `POST /api/camps/:id/register` - Register for camp

## 🚀 Deployment

See [DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

### Quick Deploy

**Backend:** Deploy to Render.com or Railway  
**Frontend:** Deploy to Vercel or Netlify  
**Database:** MongoDB Atlas (already cloud-hosted)

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) - How to deploy globally
- [Project Structure](docs/PROJECT-STRUCTURE.md) - Detailed file organization
- [MongoDB Atlas Setup](backend/docs/MONGODB-ATLAS-SETUP.md) - Database configuration
- [OTP Troubleshooting](backend/docs/OTP-TROUBLESHOOTING.md) - Fix OTP issues

## 🔒 Security

- Environment variables protected with `.gitignore`
- OTP-based email verification
- Rate limiting on sensitive endpoints
- CORS configuration for production
- Password hashing (recommended for production)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- MongoDB Atlas for cloud database
- Nodemailer for email service
- All contributors and testers

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

---

**Made with ❤️ for saving lives through blood donation**
