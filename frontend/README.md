# Credit Intelligence Frontend Documentation

This document provides a complete overview of the frontend for the Real-Time Credit Intelligence platform. It covers the architecture, features, setup instructions, and guidelines for connecting to a live backend API.

## 1. Frontend Overview

The frontend is a modern, responsive single-page application (SPA) built with **Next.js** and **React**. It is designed to be a highly interactive and immersive user interface for financial data analysis and alerting.

### Key Features & Components

-   **Immersive UI**: A global dark theme is applied for a clean, modern aesthetic that reduces eye strain.
-   **State Management**: Global authentication state is managed via a React Context (`src/contexts/AuthContext.js`), providing user data across the application.
-   **Component-Based Architecture**: The UI is broken down into reusable components located in `src/components`.
-   **Page-Based Routing**: Next.js provides a simple and intuitive file-system-based routing, with pages located in `src/pages`.

### Core Functionality

1.  **Main Dashboard (`/`)**: 
    -   Displays a real-time list of the companies with the highest predicted share price changes.
    -   Features a powerful search bar to find companies by name or ticker symbol.
    -   Includes domain-based filtering (e.g., Technology, Finance) to refine searches.

2.  **Company Detail Page (`/company/[ticker]`)**:
    -   Provides a deep dive into a specific company, including:
        -   Current share price and percentage difference from the previous close.
        -   The platform's prediction for the next day's closing price change.
        -   A historical price chart (currently a 6-month view).
        -   A list of relevant sentiments and news driving the prediction.
    -   Allows users to **bookmark** and **unbookmark** companies.

3.  **Watchlists (`/watchlists`)**:
    -   Authenticated users can create, delete, and manage multiple watchlists.
    -   Users can add and remove companies from their watchlists.

4.  **Bookmarks (`/bookmarks`)**:
    -   A dedicated page for authenticated users to view all their bookmarked companies in one place.

5.  **Alerting System (`/alerts`)**:
    -   Users can create and manage custom alerts for specific companies.
    -   Alert triggers include:
        -   Score changing by a specified percentage.
        -   Score crossing an absolute threshold.
        -   Detection of high-impact keywords in unstructured data.

6.  **Authentication**:
    -   Secure pages for user login (`/login`) and registration (`/register`).
    -   Protected routes that require a user to be logged in.

## 2. How to Run Locally

To run the frontend application in a development environment, you will need **Node.js** and **npm** installed.

1.  **Clone the repository and navigate to the project directory**:
    ```sh
    cd E:/Documents/GitHub/cred-tech-frontend
    ```

2.  **Install project dependencies**:
    ```sh
    npm install
    ```

3.  **Run the development server**:
    ```sh
    npm run dev
    ```

4.  **Open your browser** and navigate to `http://localhost:3000`.

The application will be running with a **mocked API** located in `src/utils/api.js`. All features are fully functional in this mocked environment.

## 3. Backend Requirements

The frontend is built to consume a specific set of REST API endpoints. The backend must provide the following routes, prefixed with `/api`.

### Module: Authentication (`/auth`)
-   `POST /auth/register`
-   `POST /auth/login`
-   `GET /auth/me` (Authenticated)
-   `POST /auth/logout` (Authenticated)

### Module: Company Data & Prices (`/companies`, `/prices`, `/domains`)
-   `GET /domains`
-   `GET /companies/search` (Params: `query`, `domains`)
-   `POST /prices/batch` (Body: `{ "symbols": [...] }`)
-   `GET /companies/{tickerSymbol}/details`
-   `GET /companies/{tickerSymbol}/historical-prices` (Params: `resolution`, `from`, `to`)

### Module: Watchlists (`/watchlists`) (Authenticated)
-   `GET /watchlists`
-   `POST /watchlists` (Body: `{ "name": "..." }`)
-   `DELETE /watchlists/{id}`
-   `POST /watchlists/{id}/items` (Body: `{ "ticker_symbol": "..." }`)
-   `DELETE /watchlists/{id}/items/{tickerSymbol}`

### Module: Bookmarks (`/bookmarks`) (Authenticated)
-   `GET /bookmarks`
-   `POST /bookmarks` (Body: `{ "ticker_symbol": "..." }`)
-   `DELETE /bookmarks/{ticker_symbol}`

### Module: Alerts (`/alerts`) (Authenticated)
-   `GET /alerts/rules` (Params: `ticker_symbol`)
-   `POST /alerts/rules` (Body: `{ "ticker_symbol": "...", "alert_type": "...", ... }`)
-   `DELETE /alerts/rules/{ruleId}`
-   `GET /alerts/notifications`
-   `POST /alerts/notifications/mark-read` (Body: `{ "ids": [...] }`)

## 4. Connecting to the Live Backend

To switch the frontend from the mock API to a real, live backend, you only need to edit **one file**: `src/utils/api.js`.

This file currently contains JavaScript functions that simulate the backend. Each function needs to be replaced with a real `fetch` call to your backend API.

**The key is to keep the function names and parameters the same.** The UI components will continue to work seamlessly as long as the functions return data in the expected format.

### Example: Updating `searchCompanies`

Here is how you would change the `searchCompanies` function from a mock to a live implementation.

**BEFORE (Mock Implementation):**
```javascript
export const searchCompanies = async (query, domains) => {
    console.log(`Searching for companies with query: "${query}" and domains: "${domains}"`);
    // ...mock filtering logic...
    return results;
};
```

**AFTER (Live Backend Implementation):**
```javascript
const API_BASE_URL = 'http://localhost:8000/api'; // Or your deployed backend URL

export const searchCompanies = async (query, domains) => {
    // Construct the URL with query parameters
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (domains && domains.length > 0) params.append('domains', domains.join(','));

    const response = await fetch(`${API_BASE_URL}/companies/search?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch companies');
    }

    return await response.json();
};
```

### General Steps:

1.  **Open `src/utils/api.js`**.
2.  Define your backend's base URL at the top of the file.
3.  Go through each exported function one by one.
4.  Replace the mock logic inside each function with a `fetch` call to the corresponding backend endpoint.
5.  For authenticated routes, make sure to include the user's auth token in the request headers (e.g., `Authorization: Bearer ${token}`). You can get the token from `localStorage` or the `AuthContext`.
6.  Ensure the data returned by the `fetch` call is parsed as JSON and returned, matching the format specified in the backend API documentation.

By following this process, you can connect the entire frontend to your live backend without changing any of the UI components.
