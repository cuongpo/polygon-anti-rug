const express = require('express');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const path = require('path');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Serve static files with proper MIME types
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));
app.use(express.json());

// API keys and endpoints
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const PROVIDER_URL = process.env.PROVIDER_URL || 'https://polygon-rpc.com';

// Initialize OpenAI client with DeepSeek's API
const deepseek = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1"
});

// Initialize Ethereum provider
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);

// Standard ERC20 ABI for basic token information
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint amount) returns (bool)",
    "function transferFrom(address sender, address recipient, uint amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint amount)",
    "event Approval(address indexed owner, address indexed spender, uint amount)"
];

// Helper function to make API requests to Polygonscan
async function fetchFromPolygonscan(module, action, address, additionalParams = {}) {
    const params = new URLSearchParams({
        module,
        action,
        address,
        apikey: POLYGONSCAN_API_KEY,
        ...additionalParams
    });
    
    const url = `${POLYGONSCAN_API}?${params}`;
    console.log('Fetching from Polygonscan:', url);
    
    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Polygonscan API Error:', errorText);
        throw new Error(`Polygonscan API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Polygonscan Response:', data);
    
    if (data.status !== '1') {
        console.error('Polygonscan API Error:', data.message || 'Unknown error');
        throw new Error(`Polygonscan API error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Fetch token information
async function getTokenInfo(contractAddress) {
    try {
        // 1. Get basic token info from contract
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
        
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            contract.name().catch(() => 'Unknown'),
            contract.symbol().catch(() => 'Unknown'),
            contract.decimals().catch(() => 18),
            contract.totalSupply().catch(() => ethers.parseEther('0'))
        ]);
        
        // 2. Get token holders from Polygonscan (try-catch to make it optional)
        let holdersData = { result: [] };
        try {
            holdersData = await fetchFromPolygonscan('token', 'tokenholderlist', contractAddress, {
                page: 1,
                offset: 100
            });
        } catch (error) {
            console.log('Warning: Token holder check disabled/failed:', error.message);
            // Continue with empty holders array
        }
        
        // 3. Get token transactions from Polygonscan
        const txnsData = await fetchFromPolygonscan('account', 'tokentx', contractAddress, {
            page: 1,
            offset: 100,
            sort: 'desc'
        });
        
        // Format the data
        const formattedData = {
            tokenInfo: {
                address: contractAddress,
                name,
                symbol,
                decimals: Number(decimals),
                total_supply: ethers.formatUnits(totalSupply, decimals)
            },
            holders: holdersData.result.map(h => {
                // Convert string amounts to numbers for calculation
                const amount = parseFloat(ethers.formatUnits(h.TokenHolderQuantity, decimals));
                return {
                    account: h.TokenHolderAddress,
                    amount,
                    percentage: 0 // Will be calculated after total is known
                };
            }),
            transactions: txnsData.result.map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatUnits(tx.value, decimals),
                timestamp: tx.timeStamp,
                blockNumber: tx.blockNumber,
                gas: tx.gas,
                gasPrice: tx.gasPrice
            }))
        };

        // Calculate percentages for holders
        if (formattedData.holders.length > 0) {
            const totalSupplyNum = parseFloat(formattedData.tokenInfo.total_supply);
            formattedData.holders = formattedData.holders.map(h => ({
                ...h,
                percentage: totalSupplyNum > 0 ? (h.amount / totalSupplyNum) * 100 : 0
            }));
        }

        // Get contract source code
        const sourceCodeData = await fetchFromPolygonscan('contract', 'getsourcecode', contractAddress);
        formattedData.sourceCode = sourceCodeData.result[0];

        return formattedData;
    } catch (error) {
        console.error('Error fetching token info:', error);
        throw error;
    }
}

async function analyzeWithDeepSeek(data) {
    const systemPrompt = `You are an expert in analyzing Polygon blockchain tokens and smart contracts for potential rug pulls and security risks.
Your task is to provide a comprehensive security analysis of tokens, focusing on these key areas:

1. Token Distribution Analysis:
   - Analyze the top holder concentration and distribution patterns
   - Identify suspicious wallet patterns or centralization risks
   - Calculate and evaluate the Gini coefficient of token distribution
   - Flag any concerning ownership patterns

2. Transaction Pattern Analysis:
   - Evaluate recent transaction volumes and frequencies
   - Identify suspicious trading patterns or market manipulation
   - Analyze transaction sizes and timing
   - Look for wash trading or artificial volume
   - Check for large dumps or suspicious transfers

3. Smart Contract Security:
   - Evaluate contract ownership and admin privileges
   - Check for minting capabilities and supply control
   - Identify potential backdoors or high-risk functions
   - Assess contract upgradeability and its implications
   - Review token standard compliance

4. Market and Community Analysis:
   - Social media presence and community engagement
   - Development activity and team transparency
   - Token utility and use cases
   - Integration with DeFi protocols or other contracts

5. Risk Assessment:
   - Provide detailed risk factors with severity levels
   - Identify potential red flags and warning signs
   - Calculate risk metrics across different dimensions
   - Compare against known rug pull patterns

6. Recommendations:
   - Specific actions for risk mitigation
   - Due diligence checklist for investors
   - Security best practices
   - Monitoring suggestions

Provide a detailed markdown report with clear sections and evidence-based analysis. Use tables and lists for better readability.
End with a comprehensive risk score (1-100) where:
- 80-100: Very Safe (Well-audited, transparent, good distribution)
- 60-79: Generally Safe (Some minor concerns)
- 40-59: Moderate Risk (Notable concerns present)
- 20-39: High Risk (Multiple red flags)
- 0-19: Extreme Risk (Strong rug pull indicators)`;

    const userPrompt = `Analyze this Polygon token for rug pull risks and security concerns. Here's the data:
${JSON.stringify(data, null, 2)}

Provide a comprehensive markdown report with these sections:

# Token Analysis Report

## 1. Token Overview
- Basic token information
- Contract details
- Market data and statistics

## 2. Holder Analysis
- Top holder concentration
- Distribution metrics
- Wallet patterns
- Gini coefficient calculation

## 3. Transaction Analysis
- Recent transaction patterns
- Volume analysis
- Suspicious activity detection
- Large transfers investigation

## 4. Smart Contract Security
- Contract features
- Ownership analysis
- Minting capabilities
- Backdoor detection
- Upgradeability concerns

## 5. Risk Assessment
- Risk factors with severity levels
- Red flags and warning signs
- Comparison to known rug pull patterns

## 6. Recommendations
- Due diligence checklist
- Security best practices
- Monitoring suggestions

## 7. Overall Risk Score
- Numerical score (1-100)
- Risk category
- Explanation of score`;

    try {
        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error analyzing with DeepSeek:', error);
        throw error;
    }
}

// API endpoint to check contract
app.post('/api/check-contract', async (req, res) => {
    try {
        console.log('Received request:', req.body);
        const { contractAddress } = req.body;
        
        if (!contractAddress) {
            return res.status(400).json({ error: 'Contract address is required' });
        }
        
        // Check if the address is a valid Ethereum address
        if (!ethers.isAddress(contractAddress)) {
            return res.status(400).json({ error: 'Invalid Ethereum address format' });
        }
        
        // Fetch token information
        const tokenData = await getTokenInfo(contractAddress);
        
        // Analyze the token data
        const analysis = await analyzeWithDeepSeek(tokenData);
        
        // Return the analysis
        res.json({
            tokenData,
            analysis
        });
    } catch (error) {
        console.error('Error checking contract:', error);
        res.status(500).json({ error: error.message || 'An error occurred while checking the contract' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
