# Singapore Discovery Center - Digital Audio Guide System

A robust, scalable, database-driven web application designed to replace the Singapore Discovery Center's traditional audio guide system. This project allows visitors to access audio guides by scanning QR codes with their own devices, while providing a comprehensive dashboard for administrators to manage content and analyze visitor engagement.

## Table of Contents

- [Project Purpose](#project-purpose)
- [Key Features](#key-features)
- [Current Development Features](#current-development-features)
- [Technology Stack](#technology-stack)
- [Database Schema (ERD)](#database-schema-erd)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Team Members](#team-members)
- [License](#license)

## 🚀 Project Purpose

The primary goal of this project is to modernize the visitor experience at the Singapore Discovery Center. The system achieves this by:

- Allowing visitors to instantly access audio guides by scanning QR codes at exhibits.
- Providing administrators with powerful tools to manage audio content, users, and roles.
- Enabling real-time analytics to gain insights into exhibit popularity and visitor engagement.
- Reducing operational overhead by eliminating the need for physical audio guide devices.

## ✨ Key Features

### For Visitors
- **QR Code Scanning:** Seamlessly access exhibit information and audio by scanning a QR code.
- **Audio Playback:** A responsive audio player with standard controls (play, pause, seek) and language selection.
- **Multi-language Support:** Audio guides and subtitles available in multiple languages.
- **User Registration & Feedback:** Registered users can leave ratings and reviews for exhibits.
- **Mobile-First Design:** Fully responsive layout for an optimal experience on any device.

### For Administrators
- **Analytics Dashboard:** Visualize key metrics like most popular exhibits, user growth, and audio playback statistics.
- **CRUD Operations:** Full content management for Exhibits, Audio, Images, Users, and Roles.
- **Role-Based Access Control (RBAC):** Granular control over what different admin users can see and do using a flexible roles and permissions system.
- **Audit Logs:** Track all significant actions performed by administrators for security and accountability.
- **Text-to-Speech (TTS):** Automatically generate audio guides from text descriptions.
- **Speech-to-Text (SST):** Automatically transcribe spoken audio into written text and highlighting.

---

## 🛠 Current Development Features

The following features are actively being developed by the team:

- **Badges:** Introduce digital badges to enhance user engagement.  
- **Self-Hosting TTS (Low Priority):** Explore hosting Text-to-Speech locally
- **Large Language Model (LLM) Integration:** Implement Ollama, hosted on Azure
- **ORM Enhancements:** Continue refining database access using Prisma ORM.   
- **Remove Translation Feature:** Deprecate the translation module to simplify the system. 
- **CI/CD Pipeline:** Implement Continuous Integration and Continuous Deployment using **GitHub Actions** for automated builds, testing, and deployment.  
- **End-to-End Testing:** Use **Playwright** to automate browser testing for login, registration, and navigation flows, ensuring cross-browser compatibility and reliability.  


---

## 💻 Technology Stack

| Area        | Technology |
| :---------- | :----------|
| **Frontend** | `React.js` |
| **Backend**  | `Node.js`, `Express.js` |
| **Database** | `PostgreSQL` on `NeonDB` (Cloud Native) |
| **ORM**      | `Prisma` |
| **Auth**     | `JSON Web Tokens (JWT)` |

## 🗃️ Database Schema (ERD)

The database was designed with 18 tables to ensure a normalized, scalable, and efficient structure. It heavily utilizes primary/foreign keys, constraints, indexing, and stored procedures to maintain data integrity and performance.

## 👥 Team Members

This project was a collaborative effort by Group 3 CI/CD:

-   **Jing Hng**
-   **Damian** 
-   **Julia**
-   **Owen**
-   **Ruyi** 

