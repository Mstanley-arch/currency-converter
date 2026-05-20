/**
 * Aura Currency Calculator - Core Application Logic
 * Feature rich, offline-first, dynamic SVG charts, and travel fee planner.
 */

// ==========================================================================
// 1. Currency Configuration & Constants
// ==========================================================================
const CURRENCIES = {
    TWD: { name: '新台幣', flag: 'tw', decimalDigits: 0 },
    USD: { name: '美國美元', flag: 'us', decimalDigits: 2 },
    JPY: { name: '日本日圓', flag: 'jp', decimalDigits: 0 },
    EUR: { name: '歐盟歐元', flag: 'eu', decimalDigits: 2 },
    GBP: { name: '英國英鎊', flag: 'gb', decimalDigits: 2 },
    AUD: { name: '澳洲元', flag: 'au', decimalDigits: 2 },
    CAD: { name: '加拿大元', flag: 'ca', decimalDigits: 2 },
    SGD: { name: '新加坡元', flag: 'sg', decimalDigits: 2 },
    CNY: { name: '中國人民幣', flag: 'cn', decimalDigits: 2 },
    HKD: { name: '香港港幣', flag: 'hk', decimalDigits: 2 },
    KRW: { name: '南韓韓元', flag: 'kr', decimalDigits: 0 },
    THB: { name: '泰國泰銖', flag: 'th', decimalDigits: 2 },
    PHP: { name: '菲律賓披索', flag: 'ph', decimalDigits: 2 },
    VND: { name: '越南盾', flag: 'vn', decimalDigits: 0 },
    MYR: { name: '馬來西亞令吉', flag: 'my', decimalDigits: 2 }
};

// Default tracked currencies in the dashboard
let trackedCurrencies = ['TWD', 'USD', 'JPY', 'EUR', 'CNY', 'KRW', 'THB'];

// State variables
let currentRates = {};
let baseRates = {}; // Rates based on USD (API standard)
let activeBaseCurrency = 'TWD';
let secondaryCurrency = 'USD';
let activeSelectorTarget = 'primary'; // 'primary' or 'secondary'
let activeAmount = 1000;
let lastUpdateTime = null;



// Chart interaction State
let chartDataPoints = [];

// ==========================================================================
// 2. Initializer & Event Listeners Setup
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Load Local Storage configurations
    loadFromLocalStorage();

    // Bind navigation tabs
    setupTabs();

    // Bind modales
    // Bind modales
    setupModals();

    // Initial Fetch Rates
    fetchExchangeRates();

    // LINE and Install Prompts
    checkLineBrowser();
    setTimeout(initInstallPrompt, 1500);



    // Setup Trends section
    setupTrends();

    // Setup Master Split-Screen Currency Calculator
    setupMasterCalculator();
});

// Load persistent data
function loadFromLocalStorage() {
    const savedTracked = localStorage.getItem('aura_tracked_currencies');
    if (savedTracked) {
        trackedCurrencies = JSON.parse(savedTracked);
    }
    const savedBase = localStorage.getItem('aura_base_currency');
    if (savedBase) {
        activeBaseCurrency = savedBase;
    }
    const savedSecondary = localStorage.getItem('aura_secondary_currency');
    if (savedSecondary) {
        secondaryCurrency = savedSecondary;
    }
    const savedAmount = localStorage.getItem('aura_active_amount');
    if (savedAmount) {
        activeAmount = parseFloat(savedAmount) || 1000;
    }

}

function saveToLocalStorage() {
    localStorage.setItem('aura_tracked_currencies', JSON.stringify(trackedCurrencies));
    localStorage.setItem('aura_base_currency', activeBaseCurrency);
    localStorage.setItem('aura_secondary_currency', secondaryCurrency);
    localStorage.setItem('aura_active_amount', activeAmount);

}

// ==========================================================================
// 3. Tab Navigation & Header Handlers
// ==========================================================================
function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.tab-panel');
    const headerTitle = document.getElementById('main-header-title');
    const headerSubtitle = document.querySelector('.header-subtitle');

    const headerContent = {
        matrix: {
            title: '即時匯率計算機',
            subtitle: '單點輸入，全域實時同步轉換與走勢對照'
        },
        'matrix-list': {
            title: '多國匯率矩陣',
            subtitle: '自訂追蹤多國貨幣，一鍵即時對照換算結果'
        },
        planner: {
            title: '旅遊消費預算包',
            subtitle: '自訂海外刷卡、提款與換匯點差手續費，精準控制預算成本'
        },
        trends: {
            title: '匯率歷史波動圖表',
            subtitle: '多週期歷史走勢分析與高低點變動幅度對比'
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');

            // Toggle active buttons
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Toggle panels
            panels.forEach(p => p.classList.remove('active'));
            
            if (tabId === 'matrix-list') {
                document.getElementById('panel-matrix').classList.add('active');
                document.getElementById('panel-matrix').classList.add('show-list-only');
            } else {
                document.getElementById(`panel-${tabId}`).classList.add('active');
                if (tabId === 'matrix') {
                    document.getElementById('panel-matrix').classList.remove('show-list-only');
                }
            }

            // Update Header text
            if (headerContent[tabId]) {
                headerTitle.textContent = headerContent[tabId].title;
                headerSubtitle.textContent = headerContent[tabId].subtitle;
            }

            // Set body class for mobile CSS logic
            document.body.className = `tab-active-${tabId}`;

            // Trigger redraw of trends if switched
            if (tabId === 'trends') {
                updateHistoricalChart();
            }
        });
    });

    // Force default tab state on first load to ensure CSS and Body classes sync properly
    const defaultTab = document.querySelector('.nav-item.active') || document.querySelector('.nav-item[data-tab="matrix"]');
    if (defaultTab) {
        defaultTab.click();
    }

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    refreshBtn.addEventListener('click', () => {
        refreshIcon.classList.add('animate-spin');
        fetchExchangeRates(true).then(() => {
            setTimeout(() => {
                refreshIcon.classList.remove('animate-spin');
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                showToast(`✅ 匯率已手動同步至最新版本 (${hh}:${mm})`);
            }, 800);
        });
    });

    // Mobile Matrix Context Bar Click -> Switch back to Calculator Tab
    const matrixContextBar = document.getElementById('matrix-context-bar');
    if (matrixContextBar) {
        matrixContextBar.addEventListener('click', () => {
            const calcBtn = document.getElementById('nav-btn-matrix');
            if (calcBtn) {
                calcBtn.click();
            }
        });
    }
}

// Global Toast Notification
function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    // Auto hide after 3s
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================================================
// 4. API Service & Rate Calculators
// ==========================================================================
async function fetchExchangeRates(forceRefresh = false) {
    const CACHE_KEY = 'aura_exchange_rates_cache';
    const CACHE_TIME_KEY = 'aura_exchange_rates_time';
    const cacheExpiry = 4 * 60 * 60 * 1000; // 4 Hours cache

    const cachedRates = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    if (!forceRefresh && cachedRates && cachedTime && (now - parseInt(cachedTime) < cacheExpiry)) {
        // Use cached data
        baseRates = JSON.parse(cachedRates);
        lastUpdateTime = new Date(parseInt(cachedTime));
        updateRatesMatrix();
        setOnlineStatus(true, '載入快取數據');
        return;
    }

    try {
        // Fetch keyless exchange rates (using base USD to calculate all cross rates)
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error('API 網路響應失敗');
        const data = await response.json();

        if (data.result === 'success') {
            baseRates = data.rates;
            lastUpdateTime = new Date();
            
            // Save cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(baseRates));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());

            updateRatesMatrix();
            setOnlineStatus(true);
        } else {
            throw new Error('匯率數據格式錯誤');
        }
    } catch (error) {
        console.error('Fetch rates failed:', error);
        setOnlineStatus(false);
        
        // Fallback to cache if exists
        if (cachedRates) {
            baseRates = JSON.parse(cachedRates);
            lastUpdateTime = new Date(parseInt(cachedTime) || now);
            updateRatesMatrix();
        }
    }
}

function setOnlineStatus(isOnline, customText = '') {
    const dot = document.getElementById('status-dot');
    const txt = document.getElementById('status-text');
    
    if (isOnline) {
        dot.className = 'status-dot online';
        txt.textContent = customText || '連線正常';
    } else {
        dot.className = 'status-dot offline';
        txt.textContent = '離線模式 (載入快取)';
    }
}

// Recalculate cross rates based on activeBaseCurrency
function updateRatesMatrix() {
    if (!baseRates[activeBaseCurrency]) return;
    
    // Base cross-rate conversion
    const baseToUSD = 1 / baseRates[activeBaseCurrency];
    
    currentRates = {};
    for (const code in baseRates) {
        currentRates[code] = baseRates[code] * baseToUSD;
    }

    // Format Update Time
    const timeValue = document.getElementById('last-update-time');
    if (lastUpdateTime) {
        const hh = String(lastUpdateTime.getHours()).padStart(2, '0');
        const mm = String(lastUpdateTime.getMinutes()).padStart(2, '0');
        const ss = String(lastUpdateTime.getSeconds()).padStart(2, '0');
        timeValue.textContent = `${lastUpdateTime.toLocaleDateString()} ${hh}:${mm}:${ss}`;
    }

    // Render Master Calculator Display Screen & sidebar
    updateMasterCalcUI();
}

// Helper: Format amount with proper decimal digits & thousands separators
function formatAmount(value, currencyCode) {
    const digits = CURRENCIES[currencyCode] ? CURRENCIES[currencyCode].decimalDigits : 2;
    return value.toLocaleString('zh-TW', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

// ==========================================================================
// 5. Matrix Cards Grid Rendering
// ==========================================================================
function renderMatrixCards() {
    const grid = document.getElementById('currency-grid');
    grid.innerHTML = '';

    trackedCurrencies.forEach(code => {
        if (!currentRates[code]) return;
        
        const currencyData = CURRENCIES[code] || { name: '外幣', flag: 'un', decimalDigits: 2 };
        const converted = activeAmount * currentRates[code];
        const isActive = code === activeBaseCurrency;
        
        const card = document.createElement('div');
        card.className = `currency-card glass-panel ${isActive ? 'active' : ''}`;
        
        // Generate beautiful simulated sparkline data (for premium aesthetic feel)
        const mockSpark = generateMockSparkline(code);

        card.innerHTML = `
            <div class="card-top">
                <div class="currency-info-box">
                    <img src="https://flagcdn.com/w40/${currencyData.flag}.png" class="flag-icon" alt="${code} Flag">
                    <div class="currency-badge">
                        <span class="badge-code">${code}</span>
                        <span class="badge-name">${currencyData.name}</span>
                    </div>
                </div>
                <!-- Premium Mini SVG Sparkline -->
                <svg class="currency-card-sparkline" viewBox="0 0 100 40">
                    <path d="${mockSpark}" fill="none" stroke="${isActive ? 'var(--color-neon-mint)' : 'var(--color-neon-cyan)'}" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="card-bottom">
                <div class="card-exchange-rate">
                    1 ${activeBaseCurrency} = ${currentRates[code].toFixed(4)} ${code}
                </div>
                <div class="card-converted-amount" id="converted-val-${code}" title="${formatAmount(converted, code)}">
                    ${formatAmount(converted, code)}
                </div>
            </div>
        `;

        // Click on a card will set it as the new Primary Currency
        card.addEventListener('click', () => {
            if (isActive) return;
            switchBaseCurrency(code, converted);
        });

        grid.appendChild(card);
    });
}

// Generate simple mock SVG path coordinates for visual aesthetic sparklines
function generateMockSparkline(currencyCode) {
    // Generate pseudorandom numbers based on currency code letters
    let seed = currencyCode.charCodeAt(0) + currencyCode.charCodeAt(1);
    const points = [];
    let curY = 20; // mid point
    
    for (let i = 0; i <= 6; i++) {
        const x = (i * 16) + 2;
        // pseudo-random fluctuation
        const rand = Math.sin(seed * (i + 1)) * 12;
        const y = Math.max(5, Math.min(35, 20 + rand));
        points.push(`${x},${y.toFixed(1)}`);
    }
    
    return `M ${points.join(' L ')}`;
}

function switchBaseCurrency(newCode, valueToKeep) {
    activeBaseCurrency = newCode;
    activeAmount = valueToKeep;

    // Update Base input displays
    const activeFlag = document.getElementById('active-flag');
    const activeCode = document.getElementById('active-code');
    const activeName = document.getElementById('active-name');
    const amountInput = document.getElementById('primary-amount-input');
    
    const curInfo = CURRENCIES[newCode];
    activeFlag.src = `https://flagcdn.com/w40/${curInfo.flag}.png`;
    activeCode.textContent = newCode;
    activeName.textContent = curInfo.name;
    amountInput.value = formatAmount(activeAmount, newCode);

    // Save states
    saveToLocalStorage();

    // Recalculate
    updateRatesMatrix();

    // Trigger UI pulse effect on all numbers to feel premium
    document.querySelectorAll('.card-converted-amount').forEach(el => {
        el.classList.add('pulse-flash');
        setTimeout(() => el.classList.remove('pulse-flash'), 300);
    });
}

// (setupInputs was replaced by the master-calculator keyboard handler)

// ==========================================================================
// 7. Travel Budget Planner Core Logic (Removed as requested for simplicity)
// ==========================================================================

// ==========================================================================
// 8. Trends Section & SVG Render Engine
// ==========================================================================
let activePeriod = 30;

function setupTrends() {
    const baseSelector = document.getElementById('trends-base-currency');
    const compareSelector = document.getElementById('trends-compare-currency');
    
    // Dynamically populate base and compare selectors from CURRENCIES dictionary
    baseSelector.innerHTML = '';
    compareSelector.innerHTML = '';
    
    for (const code in CURRENCIES) {
        const optBase = document.createElement('option');
        optBase.value = code;
        optBase.textContent = `${code} - ${CURRENCIES[code].name}`;
        baseSelector.appendChild(optBase);
        
        const optCompare = document.createElement('option');
        optCompare.value = code;
        optCompare.textContent = `${code} - ${CURRENCIES[code].name}`;
        compareSelector.appendChild(optCompare);
    }
    
    // Set smart default values
    baseSelector.value = 'TWD';
    compareSelector.value = 'USD';
    
    // Bind toggle buttons
    const toggles = document.querySelectorAll('.btn-group-toggle .toggle-btn');
    toggles.forEach(btn => {
        btn.addEventListener('click', () => {
            toggles.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            activePeriod = btn.getAttribute('data-period'); // remove parseInt so 'YTD' isn't parsed as NaN
            updateHistoricalChart();
        });
    });

    baseSelector.addEventListener('change', updateHistoricalChart);
    compareSelector.addEventListener('change', updateHistoricalChart);

    const trendsSwapBtn = document.getElementById('btn-trends-currency-swap');
    if (trendsSwapBtn) {
        trendsSwapBtn.addEventListener('click', () => {
            const temp = baseSelector.value;
            baseSelector.value = compareSelector.value;
            compareSelector.value = temp;
            updateHistoricalChart();
        });
    }
    
    // Draw initial trends chart on first load
    updateHistoricalChart();
}

// Generate highly realistic mock historical trend values based on Brownian Walk
async function updateHistoricalChart() {
    const base = document.getElementById('trends-base-currency').value;
    const compare = document.getElementById('trends-compare-currency').value;

    const badgeText = document.getElementById('data-source-text');
    const badgeDot = document.getElementById('data-source-dot');

    if (base === compare) {
        alert('請選擇不同的基準貨幣與對比貨幣進行走勢對照！');
        return;
    }

    try {
        const response = await fetch(`/api/yahoo?base=${base}&compare=${compare}&range=${activePeriod}`);
        if (!response.ok) throw new Error('Proxy API response not ok');
        const data = await response.json();
        
        const result = data.chart?.result?.[0];
        if (!result) throw new Error('Invalid Yahoo data format');

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0].close;
        
        const points = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (quotes[i] !== null && quotes[i] !== undefined) {
                // Yahoo timestamps are in seconds
                const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                points.push({
                    date: date,
                    rate: quotes[i]
                });
            }
        }

        if (points.length < 2) throw new Error('Not enough data points from Yahoo');

        chartDataPoints = points;
        
        // Update Badge for Success
        if (badgeText && badgeDot) {
            badgeText.textContent = 'Data: Yahoo Finance (真實數據)';
            badgeDot.className = 'pulse-dot';
        }

        drawSVGChart(points, base, compare);
    } catch (error) {
        console.warn('Yahoo Finance API fetch failed, falling back to mock data:', error);
        
        // Update Badge for Failure & show Toast
        if (badgeText && badgeDot) {
            badgeText.textContent = 'Data: 系統模擬走勢';
            badgeDot.className = 'pulse-dot offline';
        }
        showToast('⚠️ 真實數據取得失敗，目前為系統模擬走勢');
        
        generateMockHistoricalChart(base, compare);
    }
}

function generateMockHistoricalChart(base, compare) {
    // Calculate current relative rate e.g. 1 Base = X Compare
    let currentRate = 1.0;
    if (baseRates[base] && baseRates[compare]) {
        currentRate = baseRates[compare] / baseRates[base];
    }

    // Determine days
    let days = 30;
    if (activePeriod === 'YTD') {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        days = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
        if (days < 2) days = 2; // minimum 2 points for a line
    } else {
        days = parseInt(activePeriod) || 30;
        if (days < 2) days = 2;
    }

    const points = [];
    
    // Seeded random walk generator (deterministic per currency pair + period)
    let seed = base.charCodeAt(0) * 31 + compare.charCodeAt(0) * 17 + days;
    const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Build walk BACKWARDS from today's real rate so the last point is always correct
    const rawWalk = [currentRate];
    for (let i = 1; i < days; i++) {
        const changePercent = (seededRandom() - 0.49) * 0.008;
        rawWalk.push(rawWalk[i - 1] / (1 + changePercent));
    }
    // Reverse so oldest is first, today is last
    rawWalk.reverse();

    const now = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(now.getDate() - (days - 1 - i));
        points.push({
            date: date.toISOString().split('T')[0],
            rate: rawWalk[i]
        });
    }

    chartDataPoints = points;

    // Draw SVG Chart
    drawSVGChart(points, base, compare);
}

function drawSVGChart(points, base, compare) {
    const svg = document.getElementById('trend-svg');
    const gridEl = document.getElementById('chart-grid-lines');
    const pathLine = document.getElementById('chart-line');
    const pathArea = document.getElementById('chart-area');
    const yAxisEl = document.getElementById('chart-y-axis');
    const xAxisEl = document.getElementById('chart-x-axis');

    const rates = points.map(p => p.rate);
    const maxVal = Math.max(...rates);
    const minVal = Math.min(...rates);
    const rateDiff = maxVal - minVal;

    // Add 5% padding top and bottom to make chart look excellent
    const chartMin = minVal - (rateDiff * 0.08 || 0.05);
    const chartMax = maxVal + (rateDiff * 0.08 || 0.05);
    const chartRange = chartMax - chartMin;

    // Update Top stats
    const pctChange = ((rates[rates.length - 1] - rates[0]) / rates[0]) * 100;
    document.getElementById('trend-max-val').textContent = maxVal.toFixed(4);
    document.getElementById('trend-min-val').textContent = minVal.toFixed(4);
    
    const changeEl = document.getElementById('trend-change-val');
    changeEl.textContent = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`;
    changeEl.className = `stat-val ${pctChange >= 0 ? 'text-green' : 'text-red'}`;

    // Dimensions of coordinates
    const width = 1000;
    const height = 400;

    // Helper: Map data value (X, Y) to SVG viewport coordinates
    const getCoords = (index, value) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - (((value - chartMin) / chartRange) * height);
        return { x, y };
    };

    // Calculate Y-axis tick values
    yAxisEl.innerHTML = `
        <div>${chartMax.toFixed(4)}</div>
        <div>${(chartMin + (chartRange * 0.75)).toFixed(4)}</div>
        <div>${(chartMin + (chartRange * 0.5)).toFixed(4)}</div>
        <div>${(chartMin + (chartRange * 0.25)).toFixed(4)}</div>
        <div>${chartMin.toFixed(4)}</div>
    `;

    // Calculate X-axis ticks (Start, Mid, End)
    xAxisEl.innerHTML = `
        <div>${points[0].date}</div>
        <div>${points[Math.floor(points.length / 2)].date}</div>
        <div>${points[points.length - 1].date}</div>
    `;

    // Construct curve path using smooth bezier points
    let pathD = '';
    let areaD = '';
    const svgPoints = [];

    points.forEach((p, i) => {
        const coords = getCoords(i, p.rate);
        svgPoints.push(coords);
        
        if (i === 0) {
            pathD = `M ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
            areaD = `M ${coords.x.toFixed(1)} ${height} L ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
        } else {
            // Cubic bezier control points mapping (smooth spline curves)
            const prev = svgPoints[i - 1];
            const cpX1 = prev.x + (coords.x - prev.x) / 3;
            const cpY1 = prev.y;
            const cpX2 = prev.x + (2 * (coords.x - prev.x)) / 3;
            const cpY2 = coords.y;
            
            pathD += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
        }
    });

    areaD += pathD.substring(1) + ` L ${width} ${height} Z`;

    pathLine.setAttribute('d', pathD);
    pathArea.setAttribute('d', areaD);

    // Draw horizontal grid lines
    gridEl.innerHTML = '';
    for (let r = 0.25; r < 1; r += 0.25) {
        const yVal = height * r;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', yVal.toString());
        line.setAttribute('x2', width.toString());
        line.setAttribute('y2', yVal.toString());
        gridEl.appendChild(line);
    }

    // Chart Interactive Crosshair Tooltip
    const hoverLine = document.getElementById('chart-hover-line');
    const hoverPoint = document.getElementById('chart-hover-point');
    const tooltip = document.getElementById('chart-tooltip');

    svg.addEventListener('mousemove', (e) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Convert screen mouse X to SVG 0-1000 coordinate
        const svgX = (mouseX / rect.width) * width;
        
        // Find closest point index
        const index = Math.round((svgX / width) * (points.length - 1));
        if (index >= 0 && index < points.length) {
            const pt = points[index];
            const coords = getCoords(index, pt.rate);
            
            // Map SVG Y to real client screen percentage
            const screenY = (coords.y / height) * rect.height;
            const screenX = (coords.x / width) * rect.width;

            // Update interactive objects
            hoverLine.setAttribute('x1', coords.x.toString());
            hoverLine.setAttribute('x2', coords.x.toString());
            hoverLine.style.display = 'block';

            hoverPoint.setAttribute('cx', coords.x.toString());
            hoverPoint.setAttribute('cy', coords.y.toString());
            hoverPoint.style.display = 'block';

            tooltip.style.display = 'block';
            tooltip.style.left = `${screenX}px`;
            tooltip.style.top = `${screenY}px`;
            
            tooltip.querySelector('.tooltip-date').textContent = pt.date;
            tooltip.querySelector('.tooltip-rate').textContent = `1 ${base} = ${pt.rate.toFixed(4)} ${compare}`;
        }
    });

    svg.addEventListener('mouseleave', () => {
        hoverLine.style.display = 'none';
        hoverPoint.style.display = 'none';
        tooltip.style.display = 'none';
    });
}


// ==========================================================================
// 9. Modal Management Controllers
// ==========================================================================
function setupModals() {
    // 1. Manage Currencies Modal (Track list)
    const modal = document.getElementById('currency-modal');
    const btnClose = document.getElementById('btn-close-modal');
    const btnSave = document.getElementById('btn-save-currencies');
    const btnReset = document.getElementById('btn-reset-currencies');

    const triggers = ['btn-manage-currencies', 'btn-calc-manage-trigger', 'btn-calc-info'];
    triggers.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                renderModalCurrencies();
                modal.classList.add('active');
            });
        }
    });

    const closeModal = () => modal.classList.remove('active');
    btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    btnReset.addEventListener('click', () => {
        trackedCurrencies = ['TWD', 'USD', 'JPY', 'EUR', 'CNY', 'KRW', 'THB'];
        saveToLocalStorage();
        renderModalCurrencies();
    });

    btnSave.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.modal-body .custom-chk:checked');
        const selected = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (selected.length === 0) {
            alert('您必須至少保留追蹤一種貨幣！');
            return;
        }

        // Keep activeBaseCurrency in tracked list if it was excluded
        if (!selected.includes(activeBaseCurrency)) {
            selected.unshift(activeBaseCurrency);
        }

        trackedCurrencies = selected;
        saveToLocalStorage();
        updateRatesMatrix();
        closeModal();
    });

    // 2. Base Switcher Quick Selection Modal
    const baseModal = document.getElementById('base-switcher-modal');
    const btnCloseBase = document.getElementById('btn-close-base-modal');

    const closeBaseModal = () => baseModal.classList.remove('active');
    btnCloseBase.addEventListener('click', closeBaseModal);
    baseModal.addEventListener('click', (e) => {
        if (e.target === baseModal) closeBaseModal();
    });
}

function renderModalCurrencies() {
    const list = document.getElementById('modal-currency-list');
    list.innerHTML = '';

    for (const code in CURRENCIES) {
        const isChecked = trackedCurrencies.includes(code);
        const card = document.createElement('div');
        card.className = `checkbox-card ${isChecked ? 'selected' : ''}`;
        
        card.innerHTML = `
            <input type="checkbox" value="${code}" class="custom-chk" id="chk-${code}" ${isChecked ? 'checked' : ''}>
            <label class="checkbox-card-info" for="chk-${code}">
                <img src="https://flagcdn.com/w40/${CURRENCIES[code].flag}.png" class="flag-icon" alt="${code}">
                <div>
                    <div class="checkbox-code">${code}</div>
                    <div class="checkbox-name">${CURRENCIES[code].name}</div>
                </div>
            </label>
        `;

        // Card checkbox click sync
        const chk = card.querySelector('.custom-chk');
        chk.addEventListener('change', (e) => {
            if (e.target.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        list.appendChild(card);
    }
}

function openBaseSwitcherModal() {
    const baseModal = document.getElementById('base-switcher-modal');
    const list = document.getElementById('modal-base-list');
    list.innerHTML = '';

    for (const code in CURRENCIES) {
        const card = document.createElement('div');
        const isSelected = code === (activeSelectorTarget === 'primary' ? activeBaseCurrency : secondaryCurrency);
        card.className = `checkbox-card ${isSelected ? 'selected' : ''}`;
        
        card.innerHTML = `
            <div class="checkbox-card-info">
                <img src="https://flagcdn.com/w40/${CURRENCIES[code].flag}.png" class="flag-icon" alt="${code}">
                <div>
                    <span class="checkbox-code">${code}</span>
                    <span class="checkbox-name" style="margin-left: 8px;">${CURRENCIES[code].name}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (activeSelectorTarget === 'primary') {
                activeBaseCurrency = code;
                // Pre-populate calculator expression
                calcExpression = activeAmount.toString();
            } else {
                secondaryCurrency = code;
            }
            saveToLocalStorage();
            updateRatesMatrix();
            baseModal.classList.remove('active');
        });

        list.appendChild(card);
    }

    baseModal.classList.add('active');
}

// ==========================================================================
// 10. Integrated Master Currency Calculator
// ==========================================================================
let calcExpression = '1000';

function setupMasterCalculator() {
    const keys = document.querySelectorAll('.key-btn');
    const primarySelector = document.getElementById('calc-primary-selector');
    const secondarySelector = document.getElementById('calc-secondary-selector');
    const swapBtn = document.getElementById('btn-calc-swap');
    const refreshBtn = document.getElementById('btn-calc-refresh');
    const refreshIcon = document.getElementById('calc-refresh-icon');
    const infoBtn = document.getElementById('btn-calc-info');
    const manageBtn = document.getElementById('btn-calc-manage-trigger');

    const rowPrimary = document.getElementById('calc-row-primary');
    const rowSecondary = document.getElementById('calc-row-secondary');

    // Pre-populate calculation expression from stored activeAmount
    calcExpression = activeAmount.toString();

    // Allow typing directly from physical keyboard!
    document.addEventListener('keydown', (e) => {
        const matrixPanel = document.getElementById('panel-matrix');
        if (!matrixPanel || !matrixPanel.classList.contains('active')) return;

        // Ignore input keystrokes when editing name inputs inside other panels (e.g. travel budget planner name)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            handleCalcKey('back');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCalcKey('C');
        } else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            handleCalcKey('=');
        } else if (e.key === 'x' || e.key === '*') {
            e.preventDefault();
            handleCalcKey('*');
        } else if (e.key === '/') {
            e.preventDefault();
            handleCalcKey('/');
        } else if (/[0-9.+\-%]/.test(e.key)) {
            e.preventDefault();
            handleCalcKey(e.key);
        }
    });

    // Keypad Click Listeners
    keys.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-key');
            handleCalcKey(key);
        });
    });

    function handleCalcKey(key) {
        if (key === 'C') {
            calcExpression = '0';
            activeAmount = 0;
            updateMasterCalcUI();
        } else if (key === 'back') {
            calcExpression = calcExpression.toString();
            if (calcExpression.length > 1) {
                calcExpression = calcExpression.slice(0, -1);
            } else {
                calcExpression = '0';
            }
            updateMasterCalcUI();
        } else if (key === '=') {
            const finalResult = evaluateMath(calcExpression);
            if (finalResult !== null && !isNaN(finalResult)) {
                activeAmount = finalResult;
                calcExpression = activeAmount.toString();
                saveToLocalStorage();
                updateRatesMatrix();
            } else {
                // Shake row on error to feel responsive
                rowPrimary.classList.add('pulse-flash');
                setTimeout(() => rowPrimary.classList.remove('pulse-flash'), 300);
            }
        } else if (key === 'swap') {
            // Swap currencies and keep live evaluated values!
            const tmpCode = activeBaseCurrency;
            activeBaseCurrency = secondaryCurrency;
            secondaryCurrency = tmpCode;

            // Swap values
            if (currentRates[secondaryCurrency]) {
                const secondaryVal = activeAmount * currentRates[secondaryCurrency];
                activeAmount = secondaryVal;
                // Avoid huge decimal overflows
                calcExpression = activeAmount.toFixed(CURRENCIES[activeBaseCurrency] ? CURRENCIES[activeBaseCurrency].decimalDigits : 2);
            }

            saveToLocalStorage();
            updateRatesMatrix();

            // Flash effect to look premium
            rowPrimary.classList.add('pulse-flash');
            rowSecondary.classList.add('pulse-flash');
            setTimeout(() => {
                rowPrimary.classList.remove('pulse-flash');
                rowSecondary.classList.remove('pulse-flash');
            }, 300);
        } else {
            // Numbers or Operator keys
            if (calcExpression === '0' && key !== '.' && key !== '%' && key !== '+' && key !== '-' && key !== '*' && key !== '/') {
                calcExpression = '';
            }
            
            calcExpression += key;
            updateMasterCalcUI();
        }
    }

    // Modal Selection Openers
    primarySelector.addEventListener('click', (e) => {
        e.stopPropagation();
        activeSelectorTarget = 'primary';
        openBaseSwitcherModal();
    });

    secondarySelector.addEventListener('click', (e) => {
        e.stopPropagation();
        activeSelectorTarget = 'secondary';
        openBaseSwitcherModal();
    });

    // Swap row selection display highlight
    rowPrimary.addEventListener('click', () => {
        rowPrimary.classList.add('active');
        rowSecondary.classList.remove('active');
    });

    rowSecondary.addEventListener('click', () => {
        rowSecondary.classList.add('active');
        rowPrimary.classList.remove('active');
    });

    // Refresh Exchange rates
    refreshBtn.addEventListener('click', () => {
        refreshIcon.classList.add('animate-spin');
        fetchExchangeRates(true).then(() => {
            setTimeout(() => refreshIcon.classList.remove('animate-spin'), 800);
        });
    });

    const screenSwapBtn = document.getElementById('btn-screen-currency-swap');
    if (screenSwapBtn) {
        screenSwapBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCalcKey('swap');
        });
    }

    // Details Modal openers
    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openManageCurrenciesModal();
    });

    manageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openManageCurrenciesModal();
    });

    // Initial render
    updateMasterCalcUI();
}

function updateMasterCalcUI() {
    const primaryFlag = document.getElementById('calc-primary-flag');
    const primaryCode = document.getElementById('calc-primary-code');
    const primaryExpr = document.getElementById('calc-primary-expr');
    const primaryVal = document.getElementById('calc-primary-val');

    const secondaryFlag = document.getElementById('calc-secondary-flag');
    const secondaryCode = document.getElementById('calc-secondary-code');
    const secondaryVal = document.getElementById('calc-secondary-val');

    const footerDate = document.getElementById('calc-footer-date');
    const footerRate = document.getElementById('calc-footer-rate');

    if (!primaryFlag) return; // Prevent errors during initial load if DOM is loading

    // Bind Primary values
    const primaryCurInfo = CURRENCIES[activeBaseCurrency] || { name: '新台幣', flag: 'tw' };
    primaryFlag.src = `https://flagcdn.com/w40/${primaryCurInfo.flag}.png`;
    primaryCode.textContent = activeBaseCurrency;
    
    // Display typed formula
    primaryExpr.textContent = calcExpression;
    // Format active calculated amount
    primaryVal.textContent = formatAmount(activeAmount, activeBaseCurrency);

    // Bind Secondary values
    const secondaryCurInfo = CURRENCIES[secondaryCurrency] || { name: '美國美元', flag: 'us' };
    secondaryFlag.src = `https://flagcdn.com/w40/${secondaryCurInfo.flag}.png`;
    secondaryCode.textContent = secondaryCurrency;
    
    // Convert and display secondary amount
    if (currentRates[secondaryCurrency]) {
        const converted = activeAmount * currentRates[secondaryCurrency];
        secondaryVal.textContent = formatAmount(converted, secondaryCurrency);
        
        // Update footer conversion indicator
        const unitRate = currentRates[secondaryCurrency];
        footerRate.textContent = `1 ${activeBaseCurrency} = ${unitRate.toFixed(4)} ${secondaryCurrency}`;
    } else {
        secondaryVal.textContent = '0';
        footerRate.textContent = '匯率載入中...';
    }

    // Update Footer Date
    if (lastUpdateTime) {
        const hh = String(lastUpdateTime.getHours()).padStart(2, '0');
        const mm = String(lastUpdateTime.getMinutes()).padStart(2, '0');
        const ss = String(lastUpdateTime.getSeconds()).padStart(2, '0');
        const period = lastUpdateTime.getHours() >= 12 ? '下午' : '上午';
        let displayHour = lastUpdateTime.getHours() % 12;
        if (displayHour === 0) displayHour = 12;
        footerDate.textContent = `${lastUpdateTime.getFullYear()}/${lastUpdateTime.getMonth()+1}/${lastUpdateTime.getDate()} ${period} ${displayHour}:${mm}`;
    }

    // Sync Matrix Context Bar (mobile matrix list tab)
    updateContextBar();

    // Render Compact/Mini Grid on the right side
    renderMiniTrackedGrid();
}

function updateContextBar() {
    const ctxPrimaryFlag = document.getElementById('ctx-primary-flag');
    const ctxPrimaryCode = document.getElementById('ctx-primary-code');
    const ctxPrimaryAmount = document.getElementById('ctx-primary-amount');
    const ctxSecondaryFlag = document.getElementById('ctx-secondary-flag');
    const ctxSecondaryCode = document.getElementById('ctx-secondary-code');
    const ctxSecondaryAmount = document.getElementById('ctx-secondary-amount');

    if (!ctxPrimaryFlag) return;

    const primaryInfo = CURRENCIES[activeBaseCurrency] || { flag: 'tw' };
    ctxPrimaryFlag.src = `https://flagcdn.com/w40/${primaryInfo.flag}.png`;
    ctxPrimaryCode.textContent = activeBaseCurrency;
    ctxPrimaryAmount.textContent = formatAmount(activeAmount, activeBaseCurrency);

    const secondaryInfo = CURRENCIES[secondaryCurrency] || { flag: 'us' };
    ctxSecondaryFlag.src = `https://flagcdn.com/w40/${secondaryInfo.flag}.png`;
    ctxSecondaryCode.textContent = secondaryCurrency;

    if (currentRates[secondaryCurrency]) {
        const converted = activeAmount * currentRates[secondaryCurrency];
        ctxSecondaryAmount.textContent = formatAmount(converted, secondaryCurrency);
    } else {
        ctxSecondaryAmount.textContent = '—';
    }
}

function renderMiniTrackedGrid() {
    const grid = document.getElementById('mini-currency-grid');
    if (!grid) return;

    grid.innerHTML = '';

    trackedCurrencies.forEach(code => {
        // Exclude base currency from tracked grid to avoid redundant row
        if (code === activeBaseCurrency) return;
        if (!currentRates[code]) return;

        const currencyData = CURRENCIES[code] || { name: '外幣', flag: 'un' };
        const converted = activeAmount * currentRates[code];

        const card = document.createElement('div');
        card.className = 'mini-card';
        
        card.innerHTML = `
            <div class="mini-card-info">
                <img src="https://flagcdn.com/w40/${currencyData.flag}.png" class="flag-icon" alt="${code}">
                <div>
                    <span class="mini-card-code">${code}</span>
                    <span style="font-size: 10px; color: var(--color-text-muted); margin-left: 6px;">${currencyData.name}</span>
                </div>
            </div>
            <div class="mini-card-val">
                ${formatAmount(converted, code)}
            </div>
        `;

        // Clicking a mini card sets it as the secondary comparison currency!
        card.addEventListener('click', () => {
            secondaryCurrency = code;
            saveToLocalStorage();
            updateMasterCalcUI();
            
            // Highlight secondary row with flash effect
            const rowSecondary = document.getElementById('calc-row-secondary');
            rowSecondary.classList.add('pulse-flash');
            setTimeout(() => rowSecondary.classList.remove('pulse-flash'), 300);
        });

        grid.appendChild(card);
    });
}

// Safe Mathematical Evaluator using Function constructor with regex sandbox
function evaluateMath(expression) {
    if (!expression) return null;
    
    // Replace division and multiplication standard text indicators
    let sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/');
    
    // Only allow numbers, math operators (+, -, *, /, .), parentheses, and spaces
    sanitized = sanitized.replace(/[^0-9+\-*/().\s]/g, '');

    try {
        // Safe evaluation of simple sandboxed math
        const evaluate = new Function(`return (${sanitized})`);
        const outcome = evaluate();
        return typeof outcome === 'number' && isFinite(outcome) ? outcome : null;
    } catch (err) {
        return null;
    }
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => {
                console.log('[PWA] Service Worker registered successfully:', reg.scope);
                
                // Check if a new worker is already waiting
                if (reg.waiting) {
                    showUpdateToast(reg.waiting);
                }
                
                // Listen for new workers installing
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        // Has network content finished downloading?
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateToast(newWorker);
                        }
                    });
                });
            })
            .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    });

    // Reload the page when the new Service Worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

function showUpdateToast(worker) {
    const toast = document.getElementById('update-toast');
    const btn = document.getElementById('btn-update-app');
    if (!toast || !btn) return;
    
    toast.classList.add('show');
    
    btn.onclick = () => {
        toast.classList.remove('show');
        // Tell the waiting worker to skip waiting and activate immediately
        worker.postMessage({ type: 'SKIP_WAITING' });
    };
}

// ==========================================================================
// 11. LINE Browser Detection & Smart Install Prompt
// ==========================================================================
function checkLineBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (ua.indexOf('Line') > -1) {
        if (!window.location.search.includes('openExternalBrowser=1')) {
            window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
        }
        
        // Overlay fallback
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
        overlay.style.color = '#fff';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';
        overlay.style.textAlign = 'center';
        overlay.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 20px;">↗️</div>
            <h2 style="color: var(--color-neon-mint); margin-bottom: 16px; font-weight: 600;">請以預設瀏覽器開啟</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                為了讓計算機能正常操作與全螢幕安裝<br><br>
                請點擊右上角的 <b>[ ⋮ ]</b> 或 <b>[ ⍐ ]</b><br>
                選擇 <b>「以預設瀏覽器開啟」</b><br>
                (Safari 或 Chrome)
            </p>
        `;
        document.body.appendChild(overlay);
    }
}

function isIOS() {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

let deferredPrompt;
function initInstallPrompt() {
    if (isStandalone()) return; // Already installed or in PWA mode

    const installBanner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');
    const installClose = document.getElementById('install-close');
    const installText = document.getElementById('install-text');
    
    if (!installBanner) return;

    if (isIOS()) {
        installText.innerHTML = '想要全螢幕無邊框體驗嗎？<br>👇 點擊下方的 <b>分享</b>，選擇 <b>加入主畫面</b>';
        installBtn.style.display = 'none'; // iOS cannot trigger install via JS
        installBanner.classList.add('show');
        
        installClose.addEventListener('click', () => {
            installBanner.classList.remove('show');
        });
        return;
    }

    // Android/Desktop Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        installText.innerHTML = '安裝 <b>Aura 計算機</b><br>獲得零延遲的 App 級體驗！';
        installBanner.classList.add('show');

        installBtn.addEventListener('click', async () => {
            installBanner.classList.remove('show');
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
            }
        });
    });

    installClose.addEventListener('click', () => {
        installBanner.classList.remove('show');
    });
}
