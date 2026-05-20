export default async function handler(req, res) {
    const { base = 'USD', compare = 'TWD', range = '30' } = req.query;

    const symbol = `${base}${compare}=X`;
    
    let yRange = '1mo';
    let yInterval = '1d';
    
    switch (range) {
        case '5': yRange = '5d'; yInterval = '1d'; break;
        case '30': yRange = '1mo'; yInterval = '1d'; break;
        case '180': yRange = '6mo'; yInterval = '1d'; break;
        case 'YTD': yRange = 'ytd'; yInterval = '1d'; break;
        case '365': yRange = '1y'; yInterval = '1d'; break;
        case '1825': yRange = '5y'; yInterval = '1wk'; break;
        default: yRange = '1mo'; yInterval = '1d'; break;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yRange}&interval=${yInterval}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Yahoo API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache this on Vercel's edge CDN for 4 hours to prevent hitting Yahoo rate limits
        res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data from Yahoo Finance' });
    }
}
