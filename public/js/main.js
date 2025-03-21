// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const form = document.getElementById('checkForm');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');

    if (!form || !resultDiv || !loadingDiv) {
        console.error('Required elements not found:', {
            form: !!form,
            resultDiv: !!resultDiv,
            loadingDiv: !!loadingDiv
        });
        return;
    }

    // Function to format numbers with commas
    const formatNumber = (num) => {
        if (!num) return '0';
        return parseFloat(num).toLocaleString('en-US', {
            maximumFractionDigits: 6
        });
    };

    // Function to format timestamp
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Function to truncate address
    const truncateAddress = (address) => {
        if (!address) return 'N/A';
        return address.length > 16 ? 
            `${address.substring(0, 8)}...${address.substring(address.length - 8)}` : 
            address;
    };

    // Function to create legitimacy score gauge
    const createLegitimacyGauge = (score) => {
        const color = score > 70 ? 'green' : score > 40 ? 'yellow' : 'red';
        const colorClass = {
            red: 'bg-red-500',
            yellow: 'bg-yellow-500',
            green: 'bg-green-500'
        }[color];

        return `
            <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-lg font-semibold">Legitimacy Score</span>
                    <span class="text-2xl font-bold ${score > 70 ? 'text-green-500' : score > 40 ? 'text-yellow-500' : 'text-red-500'}">${score}/100</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div class="${colorClass} h-4 rounded-full" style="width: ${score}%"></div>
                </div>
                <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    ${score > 70 ? 'High legitimacy - This contract appears to be safe and well-maintained' :
                      score > 40 ? 'Medium legitimacy - Exercise caution and do additional research' :
                      'Low legitimacy - High risk, proceed with extreme caution'}
                </div>
            </div>
        `;
    };

    // Function to create token overview section
    const createTokenOverview = (tokenInfo) => {
        if (!tokenInfo) return '';
        
        const {
            name,
            symbol,
            decimals,
            total_supply
        } = tokenInfo;

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6 hover:shadow-xl transition-shadow duration-300">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center ring-2 ring-purple-500">
                        <span class="text-2xl font-bold text-white">${symbol ? symbol[0] : 'T'}</span>
                    </div>
                    <div>
                        <div class="group relative">
                            <h2 class="text-2xl font-bold group-hover:text-purple-500 transition-colors duration-200">${name || 'Unknown Token'}</h2>
                            <span class="text-gray-600 dark:text-gray-400 text-sm">${symbol || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-600 transition-colors duration-200">
                        <div class="flex items-center justify-between">
                            <p class="text-sm text-gray-600 dark:text-gray-400">Total Supply</p>
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold mt-1">${formatNumber(total_supply || 0)}</p>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-600 transition-colors duration-200">
                        <div class="flex items-center justify-between">
                            <p class="text-sm text-gray-600 dark:text-gray-400">Decimals</p>
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold mt-1">${decimals || 'N/A'}</p>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-600 transition-colors duration-200">
                        <div class="flex items-center justify-between">
                            <p class="text-sm text-gray-600 dark:text-gray-400">Contract Address</p>
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <p class="text-sm font-mono mt-1 overflow-hidden text-ellipsis">
                            <a href="https://polygonscan.com/token/${tokenInfo.address}" target="_blank" class="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                                ${tokenInfo.address}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    };

    // Function to create holders section
    const createHoldersSection = (holders) => {
        if (!holders || !holders.length) {
            return `
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                        </svg>
                        Top Token Holders
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 text-center py-4">No holder data available</p>
                </div>
            `;
        }

        // Sort holders by amount in descending order
        const sortedHolders = [...holders].sort((a, b) => b.amount - a.amount);

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                    </svg>
                    Top Token Holders
                </h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Percentage</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            ${sortedHolders.slice(0, 25).map((holder, index) => {
                                const percentage = holder.percentage || 0;
                                return `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm">${index + 1}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <a href="https://polygonscan.com/address/${holder.account}" target="_blank" class="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                                                ${truncateAddress(holder.account)}
                                            </a>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(holder.amount)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                                            <div class="flex items-center">
                                                <span class="mr-2">${percentage.toFixed(2)}%</span>
                                                <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div class="bg-purple-500 h-2 rounded-full" style="width: ${Math.min(percentage * 2, 100)}%"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    // Function to create transactions section
    const createTransactionsSection = (transactions) => {
        if (!transactions || !transactions.length) {
            return `
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"></path>
                        </svg>
                        Recent Transactions
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 text-center py-4">No transaction data available</p>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"></path>
                    </svg>
                    Recent Transactions
                </h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tx Hash</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">From</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            ${transactions.slice(0, 15).map(tx => `
                                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank" class="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                                            ${truncateAddress(tx.hash)}
                                        </a>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <a href="https://polygonscan.com/address/${tx.from}" target="_blank" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                                            ${truncateAddress(tx.from)}
                                        </a>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <a href="https://polygonscan.com/address/${tx.to}" target="_blank" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                                            ${truncateAddress(tx.to)}
                                        </a>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(tx.value)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(tx.timestamp)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contractAddress = document.getElementById('contractAddress').value.trim();
        
        if (!contractAddress) {
            alert('Please enter a contract address');
            return;
        }

        // Show loading indicator
        resultDiv.innerHTML = '';
        loadingDiv.classList.remove('hidden');

        try {
            // Make API request
            const response = await fetch('/api/check-contract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contractAddress })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze contract');
            }

            const data = await response.json();
            
            // Extract score from markdown content
            let score = 50; // Default score
            const scoreMatch = data.analysis.match(/Risk Score:?\s*(\d+)/i) || 
                               data.analysis.match(/Overall Score:?\s*(\d+)/i) ||
                               data.analysis.match(/Legitimacy Score:?\s*(\d+)/i);
            
            if (scoreMatch && scoreMatch[1]) {
                score = parseInt(scoreMatch[1], 10);
            }

            // Build the result UI
            let resultHTML = '';
            
            // Add legitimacy gauge
            resultHTML += createLegitimacyGauge(score);
            
            // Add token overview
            resultHTML += createTokenOverview(data.tokenData.tokenInfo);
            
            // Add holders section
            resultHTML += createHoldersSection(data.tokenData.holders);
            
            // Add transactions section
            resultHTML += createTransactionsSection(data.tokenData.transactions);
            
            // Add detailed analysis
            resultHTML += `
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        Detailed Analysis
                    </h3>
                    <div class="prose dark:prose-invert max-w-none markdown-content">
                        ${marked.parse(data.analysis)}
                    </div>
                </div>
            `;
            
            // Update the result div
            resultDiv.innerHTML = resultHTML;
        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                    <p class="font-bold">Error</p>
                    <p>${error.message || 'An error occurred while analyzing the contract'}</p>
                </div>
            `;
        } finally {
            // Hide loading indicator
            loadingDiv.classList.add('hidden');
        }
    });
});
