# 🕊️ SimamiaKanisa Church Management System

> **Modern Church Management System - Built for Kenyan Churches**

SimamiaKanisa is a comprehensive, web-based church management system designed specifically for Kenyan churches. It helps churches efficiently manage members, track contributions, organize events, manage pledges, and gain valuable insights through analytics.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Security Features](#security-features)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## ✨ Features

### 👥 **Member Management**
- Add, edit, and delete church members
- Organize members by ministry/group (Youth, Choir, Women, Men, Elders, Ushers)
- Store contact information (name, phone number)
- Track member statistics

### 💰 **Contributions & Tithes**
- Record various types of contributions (Tithes, Offerings, Building Fund, Mission, Other)
- Support multiple payment methods (M-Pesa, Cash, Bank Transfer)
- Real-time contribution tracking
- Monthly and annual contribution summaries
- Detailed contribution breakdown by type

### 📅 **Event Management**
- Create and manage church events
- Set event date, time, and expected attendance
- Track upcoming and past events
- Event calendar view

### 🤝 **Pledge Management**
- Create member pledges with categories (Building Fund, Mission, Equipment, etc.)
- Track pledge payments and balances
- Monitor pledge status (Active, Completed, Overdue)
- Payment history for each pledge
- Progress tracking with visual indicators
- 📱 WhatsApp reminder integration for pledge notifications

### 📊 **Analytics & Reports**
- Real-time dashboard with key metrics
- Monthly collection trends
- Contribution breakdown by category
- Growth rate tracking
- Visual charts and graphs using Chart.js
- Export reports to Excel and PDF

### 🔐 **Security & Authentication**
- Firebase Authentication integration
- Role-based access control (Admin, Editor, User)
- Protected routes and data
- Session management
- Secure login and registration

### 💬 **WhatsApp Integration**
- Send pledge reminders directly via WhatsApp
- Pre-formatted messages with pledge details
- One-click communication with members

---

## 🛠️ Tech Stack

### **Frontend**
- HTML5, CSS3, JavaScript (ES6+)
- Responsive design (mobile-friendly)
- Chart.js for data visualization
- Modern UI with gradient cards and animations

### **Backend & Database**
- Firebase Authentication (User management)
- Cloud Firestore (NoSQL database)
- Real-time data synchronization

### **Development Tools**
- Visual Studio Code
- Git for version control
- Live Server for local development

---

## 📦 Prerequisites

Before you begin, ensure you have:

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Firebase account ([Sign up here](https://firebase.google.com/))
- Basic knowledge of HTML, CSS, and JavaScript
- A code editor (VS Code recommended)
- Live Server extension (for local development)

---

## 🚀 Installation

### 1. **Clone the Repository**

```bash
git clone https://github.com/yourusername/simamiakanisa.git
cd simamiakanisa
```

### 2. **Set Up Firebase**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Authentication** → **Email/Password** sign-in method
4. Create a **Firestore Database** in production mode
5. Get your Firebase configuration:
   - Go to Project Settings → General
   - Scroll down to "Your apps" → Web app
   - Copy the configuration object

### 3. **Configure Firebase**

Open `firebase-config.js` and replace with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
```

### 4. **Set Up Firestore Security Rules**

In Firebase Console → Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /members/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }
    
    match /contributions/{contribId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }
    
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }
    
    match /pledges/{pledgeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }
    
    match /pledge_payments/{paymentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }
    
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 5. **Run Locally**

```bash
# Open with Live Server in VS Code
# Or use Python's built-in server:
python -m http.server 5501

# Or use Node.js http-server:
npx http-server -p 5501
```

Navigate to `http://127.0.0.1:5501/register.html` to create your first account.

---

## ⚙️ Configuration

### **Customize Payment Details**

Update WhatsApp pledge reminder message in `pledges.js`:

```javascript
// Find this section and update with your church details:
*💳 Payment Options:*
• M-Pesa Paybill: [Your Paybill Number]
• Bank Account: [Your Bank Details]
• Cash: During church service
```

### **Customize Church Branding**

1. Replace `images/dove-fig.png` with your church logo
2. Update church name in `index.html` header
3. Customize colors in CSS files

---

## 📖 Usage

### **First Time Setup**

1. **Register Admin Account**
   - Navigate to `register.html`
   - Create an account with **Admin** role
   - This will be your primary admin account

2. **Add Church Members**
   - Login with admin account
   - Go to **Members** tab
   - Click **+ Add Member**
   - Fill in member details

3. **Record Contributions**
   - Go to **Contributions** tab
   - Click **+ Record Contribution**
   - Select member, type, amount, and payment method

4. **Create Pledges**
   - Go to **Pledges** tab
   - Click **+ New Pledge**
   - Fill in pledge details (member, category, amount, dates)

5. **Send Reminders**
   - In Pledges table, click **📱 WhatsApp** button
   - Pre-formatted message opens in WhatsApp
   - Send to member

### **User Roles**

- **Admin**: Full access - can manage everything including users
- **Editor**: Can add/edit members, contributions, events, and pledges
- **User**: Read-only access to view data

---

## 📁 Project Structure

```
simamiakanisa/
├── index.html              # Main dashboard
├── login.html              # Login page
├── register.html           # Registration page
├── firebase-config.js      # Firebase configuration
├── auth.js                 # Authentication functions
├── modal-helpers.js        # Modal utility functions
├── members.js              # Member management
├── contributions.js        # Contribution tracking
├── events.js               # Event management
├── pledges.js              # Pledge management
├── analytics.js            # Analytics & charts
├── main.js                 # Main application logic
├── style.css               # Main stylesheet
├── pledges.css             # Pledge-specific styles
├── analytics.css           # Analytics-specific styles
├── images/                 # Image assets
│   └── dove-fig.png        # Church logo
└── README.md               # This file
```

---

## 🔒 Security Features

- ✅ Firebase Authentication with email/password
- ✅ Role-based access control (RBAC)
- ✅ Protected routes (automatic redirect to login)
- ✅ Firestore security rules
- ✅ Session management
- ✅ Input validation and sanitization
- ✅ Account activation/deactivation
- ✅ Password reset functionality
- ✅ Secure data transmission (HTTPS)

---

## 📸 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)

### Pledges Management
![Pledges](https://via.placeholder.com/800x400?text=Pledges+Screenshot)

### Analytics
![Analytics](https://via.placeholder.com/800x400?text=Analytics+Screenshot)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### **Coding Guidelines**

- Use meaningful variable and function names
- Comment your code where necessary
- Follow existing code structure and style
- Test thoroughly before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Support

### **Getting Help**

- 📧 Email: support@simamiakanisa.com
- 💬 GitHub Issues: [Report a bug](https://github.com/yourusername/simamiakanisa/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/simamiakanisa/wiki)

### **Donations**

If you find SimamiaKanisa useful, consider supporting the project:

- M-Pesa: [Your Number]
- PayPal: [Your PayPal]

---

## 🌟 Acknowledgments

- Built with ❤️ for Kenyan Churches
- Firebase for backend infrastructure
- Chart.js for beautiful visualizations
- All contributors and supporters

---

## 📝 Roadmap

### **Planned Features**

- [ ] SMS notifications
- [ ] Email reports
- [ ] Mobile app (Android/iOS)
- [ ] Advanced analytics dashboard
- [ ] Attendance tracking
- [ ] Sermon management
- [ ] Multi-church support
- [ ] Offline mode with sync
- [ ] Automated backup system
- [ ] Financial forecasting

---

## 🔗 Links

- **Live Demo**: [https://simamiakanisa.web.app](https://simamiakanisa.web.app)
- **Documentation**: [https://docs.simamiakanisa.com](https://docs.simamiakanisa.com)
- **GitHub**: [https://github.com/yourusername/simamiakanisa](https://github.com/yourusername/simamiakanisa)

---

<div align="center">

**Made with 🙏 for the Church Community**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/yourusername/simamiakanisa/issues) · [Request Feature](https://github.com/yourusername/simamiakanisa/issues)

</div>