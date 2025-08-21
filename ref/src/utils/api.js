const users = [];
let currentUser = null;

// Simulating watchlists & bookmarks
let watchlists = [];
let bookmarks = [];
let nextWatchlistId = 1;
let alertRules = [];
let nextAlertRuleId = 1;

const allCompanies = [
    { ticker_symbol: 'AAPL', name: 'Apple Inc.', predicted_share_change_percentage: 1.2, domains: ['Technology', 'Consumer Electronics'] },
    { ticker_symbol: 'GOOGL', name: 'Alphabet Inc.', predicted_share_change_percentage: -0.5, domains: ['Technology', 'Advertising'] },
    { ticker_symbol: 'MSFT', name: 'Microsoft Corp.', predicted_share_change_percentage: 0.8, domains: ['Technology', 'Software'] },
    { ticker_symbol: 'TSLA', name: 'Tesla Inc.', predicted_share_change_percentage: -2.5, domains: ['Automotive', 'Technology'] },
    { ticker_symbol: 'AMZN', name: 'Amazon.com, Inc.', predicted_share_change_percentage: 1.8, domains: ['E-Commerce', 'Technology'] },
    { ticker_symbol: 'JPM', name: 'JPMorgan Chase & Co.', predicted_share_change_percentage: 0.4, domains: ['Finance', 'Banking'] },
    { ticker_symbol: 'V', name: 'Visa Inc.', predicted_share_change_percentage: 0.6, domains: ['Finance', 'Payments'] },
    { ticker_symbol: 'SPG', name: 'Simon Property Group', predicted_share_change_percentage: -1.1, domains: ['Real Estate'] },
];

const allDomains = ['Technology', 'Consumer Electronics', 'Advertising', 'Software', 'Automotive', 'E-Commerce', 'Finance', 'Banking', 'Payments', 'Real Estate'];

export const register = async (email, password) => {
  console.log("Attempting to register:", email);
  if (users.find(user => user.email === email)) {
    throw new Error("User already exists.");
  }
  const newUser = { id: Date.now(), email, password_hash: password }; // Don't store plain passwords in real apps!
  users.push(newUser);
  currentUser = newUser; // Log in the new user directly
  console.log("Registered and logged in new user:", newUser);
  return { id: newUser.id, email: newUser.email };
};

/**
 * Mock for POST /api/auth/login
 */
export const login = async (email, password) => {
  console.log("Attempting to login:", email);
  const user = users.find(user => user.email === email && user.password_hash === password);
  if (!user) {
    if (users.length === 0) {
        console.log("No users found, creating a default user for demo.");
        return await register(email, password);
    }  
    throw new Error("Invalid credentials.");
  }
  currentUser = user;
  const token = `fake-jwt-token-for-${user.id}`;
  console.log("Logged in user:", currentUser);
  return { authToken: token };
};

/**
 * Mock for GET /api/auth/me
 */
export const getMe = async (authToken) => {
    console.log("Fetching current user with token:", authToken);
    if (!authToken || !currentUser) {
        throw new Error("Not authenticated");
    }
    return { id: currentUser.id, email: currentUser.email };
};


/**
 * Mock for POST /api/auth/logout
 */
export const logout = async () => {
  console.log("Logging out user");
  currentUser = null;
  return { message: "Logged out successfully" };
};

/**
 * Mock for GET /api/domains
 */
export const getDomains = async () => {
    console.log("Fetching all domains");
    return allDomains;
};

/**
 * Mock for GET /api/companies/search
 */
export const searchCompanies = async (query, domains) => {
    console.log(`Searching for companies with query: "${query}" and domains: "${domains}"`);
    let results = allCompanies;

    if (query) {
        results = results.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) || 
            c.ticker_symbol.toLowerCase().includes(query.toLowerCase())
        );
    }

    if (domains && domains.length > 0) {
        results = results.filter(c => 
            c.domains.some(d => domains.includes(d))
        );
    }

    return results;
};

/**
 * Mock for POST /api/prices/batch
 */
export const getBatchPrices = async (symbols) => {
    console.log("Fetching batch prices for:", symbols);
    const priceData = {};
    symbols.forEach(symbol => {
        priceData[symbol] = { c: 150 + Math.random() * 100, pc: 150 + Math.random() * 100 };
    });
    return priceData;
};

/**
 * Mock for GET /api/companies/{ticker}/details
 */
export const getCompanyDetails = async (ticker) => {
    console.log("Fetching details for:", ticker);
    const company = allCompanies.find(c => c.ticker_symbol === ticker) || { name: `${ticker} Company`, domains: ['Mock Data'] };
    return {
        ticker_symbol: ticker,
        name: company.name,
        domains: company.domains,
        predicted_share_change_percentage: (Math.random() - 0.5) * 5,
        live_price_data: { c: 150 + Math.random() * 100, pc: 150 + Math.random() * 100 },
        sentiments: [
            { source: 'News Article', text: 'Positive earnings report released.', score: 0.8 },
            { source: 'Social Media', text: 'Concerns about supply chain issues.', score: -0.4 },
            { source: 'Analyst Report', text: 'Upgraded to \'Buy\' with a new price target.', score: 0.9 },
        ]
    };
};

/**
 * Mock for GET /api/companies/{ticker}/historical-prices
 */
export const getHistoricalPrices = async (ticker, resolution, from, to) => {
    console.log(`Fetching historical prices for ${ticker} from ${from} to ${to}`);
    const data = [];
    let currentDate = new Date(from * 1000);
    const endDate = new Date(to * 1000);
    let price = 150 + Math.random() * 50;
    while(currentDate <= endDate) {
        price += (Math.random() - 0.5) * 5;
        data.push({ t: currentDate.getTime() / 1000, c: price });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
};

// --- Watchlists ---
export const getWatchlists = async () => {
    if (!currentUser) return [];
    return watchlists.filter(w => w.user_id === currentUser.id);
};

export const createWatchlist = async (name) => {
    if (!currentUser) throw new Error("Not authenticated");
    const newWatchlist = { id: nextWatchlistId++, user_id: currentUser.id, name, items: [] };
    watchlists.push(newWatchlist);
    return newWatchlist;
};

export const deleteWatchlist = async (watchlistId) => {
    watchlists = watchlists.filter(w => !(w.id === watchlistId && w.user_id === currentUser.id));
    return {};
};

export const addStockToWatchlist = async (watchlistId, ticker_symbol) => {
    const watchlist = watchlists.find(w => w.id === watchlistId && w.user_id === currentUser.id);
    if (watchlist && !watchlist.items.find(i => i.ticker_symbol === ticker_symbol)) {
        const company = allCompanies.find(c => c.ticker_symbol === ticker_symbol) || { name: `${ticker_symbol} Company` };
        watchlist.items.push({ ticker_symbol, name: company.name });
    }
    return {};
};

export const removeStockFromWatchlist = async (watchlistId, tickerSymbol) => {
    const watchlist = watchlists.find(w => w.id === watchlistId && w.user_id === currentUser.id);
    if (watchlist) {
        watchlist.items = watchlist.items.filter(item => item.ticker_symbol !== tickerSymbol);
    }
    return {};
};

// --- Bookmarks ---
export const getBookmarkedCompanies = async () => {
    if (!currentUser) return [];
    return bookmarks.filter(b => b.user_id === currentUser.id);
};

export const addBookmark = async (ticker_symbol) => {
    if (!currentUser) throw new Error("Not authenticated");
    if (!bookmarks.find(b => b.user_id === currentUser.id && b.ticker_symbol === ticker_symbol)) {
        const company = allCompanies.find(c => c.ticker_symbol === ticker_symbol) || { name: `${ticker_symbol} Company` };
        bookmarks.push({ user_id: currentUser.id, ticker_symbol, name: company.name });
    }
    return {};
};

export const removeBookmark = async (ticker_symbol) => {
    bookmarks = bookmarks.filter(b => !(b.user_id === currentUser.id && b.ticker_symbol === ticker_symbol));
    return {};
};

// --- Alerts ---
export const getAlertRules = async (ticker_symbol) => {
    if (!currentUser) return [];
    let userRules = alertRules.filter(r => r.user_id === currentUser.id);
    if (ticker_symbol) {
        userRules = userRules.filter(r => r.ticker_symbol === ticker_symbol);
    }
    return userRules;
};

export const createAlertRule = async (rule) => {
    if (!currentUser) throw new Error("Not authenticated");
    const newRule = { ...rule, id: nextAlertRuleId++, user_id: currentUser.id };
    alertRules.push(newRule);
    return newRule;
};

export const deleteAlertRule = async (ruleId) => {
    alertRules = alertRules.filter(r => !(r.id === ruleId && r.user_id === currentUser.id));
    return {};
};


// --- Notifications ---
export const getNotifications = async () => {
    return [
        { id: 1, message: "AAPL score changed by > 5% in 24 hours.", is_read: false, created_at: new Date().toISOString() },
        { id: 2, message: "TSLA score fell below 60.", is_read: true, created_at: new Date().toISOString() },
    ];
};

export const markNotificationsRead = async (ids) => {
    console.log("Marking notifications as read:", ids);
    return {};
};
