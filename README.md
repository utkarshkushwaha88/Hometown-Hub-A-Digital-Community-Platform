# 🏡 Hometown Hub – A Digital Community Platform

Hometown Hub is a MERN-stack web application that connects people with their hometowns and local communities. It provides a dedicated platform for discovering communities, sharing updates, organizing events, and building meaningful local connections.

Unlike general-purpose social networks, Hometown Hub focuses on community-oriented interactions, making it easier for people to stay connected with their hometowns even when they live elsewhere.

## ✨ Features

### 🔐 Authentication and User Profiles

* Secure user registration and login.
* JWT-based authentication using HttpOnly cookies.
* Password hashing with bcryptjs.
* User account and profile management.
* Protected routes and role-based access control.
* Password reset functionality with configurable email delivery.

### 🏘️ Community Management

* Discover and explore local communities.
* Create and submit communities for approval.
* Support for public and private communities.
* Community membership workflows.
* Membership request management.
* Community ownership and moderator permissions.
* Community approval and rejection by administrators.

### 📝 Posts and Engagement

* Create and manage community posts.
* Upload and display post images.
* Like and unlike posts.
* Comment on posts.
* Organize posts using categories and tags.
* Pin important community announcements.
* Report inappropriate content.

### 📅 Events and Participation

* Create and manage community events.
* Add event details and optional cover images.
* Discover upcoming events.
* Register for events and cancel registrations.
* Support for event management by authorized organizers and moderators.

### 🔔 Notifications

* Persistent in-app notifications.
* Notifications for relevant community activities.
* Community submission and approval notifications.
* Notifications for supported post and comment interactions.
* Unread notification counts and notification management.

### 🛡️ Administration and Moderation

* Administrator dashboard.
* Community approval and rejection.
* User suspension and reactivation.
* Moderator assignment and removal.
* Abuse report management.
* Community, event, and content category management.
* Activity analytics and key performance indicators (KPIs).
* Audit logging for supported administrative actions.

### 📊 Analytics

The platform includes administrative analytics for monitoring community activity, including:

* Total registered users.
* Approved communities.
* Daily active users (DAU).
* Post engagement rate.
* Event participation rate.

### 📱 Responsive Interface

* Responsive layouts for desktop and mobile devices.
* React-based single-page application.
* Client-side navigation.
* Reusable UI components.
* Interactive notifications and user feedback.

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* Tailwind CSS
* React Router
* Axios
* React Hook Form
* Zod
* Recharts
* Framer Motion
* Lucide React

### Backend

* Node.js
* Express.js
* RESTful APIs
* MongoDB
* Mongoose
* JWT
* bcryptjs
* Zod
* Helmet
* Express Rate Limit
* Cookie Parser

### Additional Services

* MongoDB Atlas for cloud database hosting.
* ImageKit for image uploads and delivery.
* Resend API for configurable password-reset email delivery.
* Vercel for frontend deployment.
* Render for backend deployment.

## 🏗️ Architecture

Hometown Hub follows a client-server architecture.

```text
                  ┌────────────────────────┐
                  │     React Frontend     │
                  │       Vite + UI        │
                  └────────────┬───────────┘
                               │
                               │ REST API
                               ▼
                  ┌────────────────────────┐
                  │    Express Backend     │
                  │   Node.js + Security   │
                  └────────────┬───────────┘
                               │
                               │ Mongoose
                               ▼
                  ┌────────────────────────┐
                  │        MongoDB         │
                  │   Application Data     │
                  └────────────────────────┘

              External Services:
              - ImageKit: Image uploads
              - Resend: Password-reset emails
```

## 📂 Project Structure

```text
hometown-hub/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── scripts/
│   │   ├── seedAdmin.js
│   │   └── seedDemo.js
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── PRD.md
│   ├── SETUP_GUIDE.md
│   └── TECHNICAL_DOCUMENTATION.md
│
├── README.md
└── .gitignore
```

*Note: This structure summarizes the main directories. Some frontend files and subdirectories may differ from the actual repository.*

## ⚙️ Prerequisites

Before running the project, install:

* Node.js 20 or later.
* npm.
* MongoDB Atlas account or a local MongoDB installation.
* Git.
* A code editor such as Visual Studio Code.

Optional services:

* ImageKit account for image uploads.
* Resend API credentials for password-reset emails.

## 🚀 Installation and Setup

### Step 1: Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd hometown-hub
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your actual GitHub repository URL.

### Step 2: Configure the Backend

Open a terminal and run:

```bash
cd server
npm install
```

Create a `.env` file by copying the example environment file.

On Windows Command Prompt:

```cmd
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Configure the required environment variables in `server/.env`.

Typical configuration includes:

```env
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173

# Use long, random, independent secrets.
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Configure the values required by server/.env.example.
```

Refer to `server/.env.example` for the complete list of supported variables.

**Important:** The example above is illustrative. Use the exact variable names and required values specified in the project's environment configuration.

### Step 3: Start the Backend

From the `server` directory, run:

```bash
npm run dev
```

The Express server will start using the development configuration.

### Step 4: Configure the Frontend

Open another terminal:

```bash
cd client
npm install
```

Create the frontend environment file.

Windows Command Prompt:

```cmd
copy .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Configure the API URL using the variable expected by the frontend. For example:

```env
VITE_API_URL=http://localhost:5000
```

Verify the backend port and the expected API URL format in the source code and environment examples before using this value.

### Step 5: Start the Frontend

From the `client` directory, run:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser. It is normally:

```text
http://localhost:5173
```

Your frontend and backend should now be running.

## 👤 Demo Account

The project includes a demo-data seed script.

To create the sample content, open a terminal in the `server` directory and run:

```bash
npm run seed:demo
```

The included README documents these local demo credentials:

```text
Email: demo@hometownhub.local
Password: DemoPass123!
```

Use these credentials only for local development. Never use demo credentials in production.

## 🛡️ Creating an Administrator

Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env` using a dedicated administrator account and a strong password.

From the `server` directory, run:

```bash
npm run seed:admin
```

After the script completes, log in using the configured administrator account.

Keep administrator credentials private and never commit environment files containing secrets.

## 🧪 Testing and Production Build

### Run Backend Tests

From the `server` directory:

```bash
npm test
```

### Build the Frontend

From the `client` directory:

```bash
npm run build
```

Vite generates the production build in the frontend's `dist` directory.

## 🔒 Security Considerations

Hometown Hub includes several security-oriented features:

* Password hashing using bcryptjs.
* JWT-based authentication.
* HttpOnly authentication cookies.
* Role-based authorization.
* Request validation using Zod.
* Security headers through Helmet.
* Rate limiting for supported endpoints.
* Restricted cross-origin access.
* Server-side validation and ownership checks.

For production deployment:

* Use HTTPS.
* Generate strong, independent authentication secrets.
* Set secure cookie options appropriately.
* Restrict CORS to trusted frontend origins.
* Configure and test CSRF protection for cookie-authenticated requests.
* Keep API keys and database credentials on the server.
* Restrict MongoDB network access.
* Configure database backups and monitoring.
* Never commit `.env` files or other secrets.

These features do not replace a comprehensive security audit.

## ☁️ Deployment

### Frontend Deployment

The React frontend can be deployed to Vercel.

General steps:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the frontend project using the `client` directory as its root directory.
4. Set the required frontend environment variables.
5. Deploy the application.
6. Add the deployed frontend origin to the backend's allowed-origin configuration.

### Backend Deployment

The Express backend can be deployed to Render.

General steps:

1. Create a new web service.
2. Connect the GitHub repository.
3. Configure the `server` directory as the service root.
4. Install dependencies using `npm install`.
5. Use `npm start` as the start command.
6. Configure the required environment variables.
7. Allow the deployed frontend origin in the backend CORS configuration.
8. Verify database connectivity and API functionality.

Use the project's deployment configuration files and setup documentation for additional details.

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

* `PRD.md` — Product requirements and project goals.
* `SETUP_GUIDE.md` — Setup and configuration guidance.
* `TECHNICAL_DOCUMENTATION.md` — System architecture and technical details.
* `API_DOCUMENTATION.md` — API endpoint documentation.
* `DATABASE_SCHEMA.md` — Database models and schema information.

## 🔮 Future Enhancements

Potential future improvements include:

* Native Android and iOS applications.
* Multilingual community support.
* Local business directories and marketplaces.
* Community polls and surveys.
* Improved event discovery and recommendations.
* Local government information feeds.
* Additional analytics and community insights.
* Enhanced moderation and reporting tools.

These are potential extensions, not claims about currently implemented functionality.



If you find Hometown Hub useful, consider starring the repository and sharing suggestions for future improvements.
