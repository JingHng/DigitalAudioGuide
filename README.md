# 🇸🇬 SDC Group 3: Digital Audio Guide System

[![CD Pipeline Status](https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc/actions/workflows/development_sdcgroup3.yml/badge.svg)](https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc/actions/workflows/development_sdcgroup3.yml)
[![CI Build Status](https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc/actions/workflows/ci.yml/badge.svg)](https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc/actions/workflows/ci.yml)

A modern, scalable digital audio guide system for the Singapore Discovery Centre, built using a full-stack Node.js architecture (API) and a React frontend.

---

## 🚀 1. Project Setup and Local Run

### Prerequisites
* **Node.js** (version 20 or higher)

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc.git](https://github.com/SP-SOC-KH/cicdp-project-group-3-sdc.git)
    cd cicdp-project-group-3-sdc
    ```
2.  **Install Dependencies (API & Web):**
    ```bash
    npm install --prefix api
    npm install --prefix web
    ```


### Running the Application

1.  **Start API Server:**
    ```bash
    npm start --prefix api
    ```
2.  **Start Web Frontend:**
    ```bash
    npm run dev --prefix web
    ```
The application will be accessible at `http://localhost:5173`.

---

## 🧪 2. Automated Testing

This project utilizes a comprehensive automated testing suite integrated into our CI/CD pipeline, guaranteeing code quality and operability.

### Running E2E Tests Locally

All End-to-End (E2E) tests are run using the **Playwright** framework.

1.  **Ensure Services are Running:** The **API Server** and **Web Frontend** must be running simultaneously (see steps in Section 1).
2.  **Install Playwright Browsers:** (Only needs to be run once)
    ```bash
    npm run install-playwright --prefix web
    ```
3.  **Execute the Full E2E Suite:**
    ```bash
    cd web
    npx playwright test
    # Or, run from the repository root:
    # npm test --prefix web
    ```

### Available Tests and Functionality

The E2E suite validates critical user journeys, API integration, and error handling across key application features.

| Test File | E2E Focus | Functionality Verified |
| :--- | :--- | :--- |
| **`homepage.spec.ts`** | **Core UI & Data Loading** | Verifies the Homepage (/) UI and ensures the successful loading and display of Exhibits data from the backend API. |
| **`exhibitions.spec.ts`** | **Navigation & Error Handling** | Verifies the Exhibitions listing page, Exhibition details pages, and confirms graceful error handling for missing data (`/exhibitions/99999`) or API failure. |
| **`scan-page.spec.ts`** | **QR Scanner & UX** | **QR/Camera Integration (LO 7):** Validates the structure, navigation, responsiveness, and error handling for the QR Code scanner interface (`/scan`). |
| **`tts-audio.spec.ts`** | **Audio Playback (TTS)** | Verifies the presence and basic functionality of the audio guide player (Play/Pause, Rewind/Forward, language selection) and transcript features on the Exhibit details page. |

