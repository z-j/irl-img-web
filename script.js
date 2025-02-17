let locationData = null;
let visaChart;

const DEFAULT_LOCATION = 'Ireland';
const DEFAULT_WEEKS = 5;

// Function to populate location dropdown and set default
function populateLocationSelect(locations) {
    const select = document.getElementById('locationSelect');
    select.innerHTML = ''; // Clear existing options
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        // Set Ireland as default selected option
        if (location === DEFAULT_LOCATION) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Function to get last N weeks of dates
function getLastNWeeks(dates, n) {
    const sortedDates = dates.sort((a, b) => new Date(b) - new Date(a)); // Sort in descending order
    return sortedDates.slice(0, n); // Get last n dates
}

// Function to format date as DD-MMM-YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Function to get data for selected date range
function getDataInRange(location, startDate, endDate) {
    const locationStats = locationData[location];
    const filteredData = {
        approved: [],
        rejected: [],
        labels: []
    };

    // Convert dates to timestamps for comparison
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    // Filter and sort dates within range
    Object.keys(locationStats)
        .filter(date => {
            const timestamp = new Date(date).getTime();
            return timestamp >= start && timestamp <= end;
        })
        .sort((a, b) => new Date(a) - new Date(b))
        .forEach(date => {
            const stats = locationStats[date];
            filteredData.approved.push(stats.approved);
            filteredData.rejected.push(stats.rejected);
            // Use the new date format
            filteredData.labels.push(formatDate(date));
        });

    return filteredData;
}

// Function to update chart with new data
function updateCharts(location, startDate, endDate) {
    const data = getDataInRange(location, startDate, endDate);
    
    // Update chart
    visaChart.data.labels = data.labels;
    visaChart.data.datasets[0].data = data.approved;
    visaChart.data.datasets[1].data = data.rejected;
    visaChart.update();
}

// Function to initialize chart
function initializeCharts(initialData) {
    const canvas = document.getElementById('visaChart');
    const ctx = canvas.getContext('2d');
    
    visaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: initialData.labels,
            datasets: [
                {
                    label: 'Approved Visas',
                    data: initialData.approved,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Rejected Visas',
                    data: initialData.rejected,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Visa Processing Statistics'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return '' // Explicitly defining the title callback
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const approved = context.chart.data.datasets[0].data[dataIndex];
                            const rejected = context.chart.data.datasets[1].data[dataIndex];
                            const total = approved + rejected;
                            return [
                                    `Total: ${total}`,
                                    `Approved: ${approved}`,
                                    `Rejected: ${rejected}`
                                ];
                            
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

// Load data and initialize application
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        
        locationData = await response.json();
        
        // Populate location dropdown with available locations
        const locations = Object.keys(locationData);
        populateLocationSelect(locations);
        
        // Get dates for Ireland
        const allDates = Object.keys(locationData[DEFAULT_LOCATION]);
        const lastFiveWeeks = getLastNWeeks(allDates, DEFAULT_WEEKS);
        
        // Set the start date input to the earliest of the last 5 weeks
        const startDateInput = document.getElementById('startDate');
        startDateInput.value = lastFiveWeeks[lastFiveWeeks.length - 1]; // Last item is earliest date
        
        // Get data for last 5 weeks
        const initialData = getDataInRange(
            DEFAULT_LOCATION, 
            lastFiveWeeks[lastFiveWeeks.length - 1], // Start date (earliest)
            lastFiveWeeks[0] // End date (latest)
        );
        
        initializeCharts(initialData);
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        return false;
    }
}

// Function to check application status
async function checkApplicationStatus(applicationId) {
    try {
        const baseUrl = 'https://odzvx636kd.execute-api.eu-west-1.amazonaws.com/prod/getstatus';
        const url = `${baseUrl}?application_id=${encodeURIComponent(applicationId)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        console.log('Data:', data);
        
        return data;
    } catch (error) {
        console.error('Error checking status:', error);
        throw error;
    }
}

// Function to display status result
function displayStatus(result) {
    const statusResult = document.getElementById('statusResult');
    statusResult.innerHTML = ''; // Clear previous results
    
    if (result.status === 'success') {
        const formattedDate = formatDate(result.data.extraction_date);
        statusResult.className = 'mt-4 status-success';
        if (result.data.decision.toLowerCase() === 'approved') {
            statusResult.textContent = `🎉 Congratulations! 🎊 Your application was approved on ${formattedDate} ✅`;
        } else if (result.data.decision.toLowerCase() === 'refused') {
            statusResult.textContent = `We regret to inform you that your application was refused on ${formattedDate}`;
        }
    } else if (result.status === 'not_found') {
        statusResult.className = 'mt-4 status-error';
        statusResult.textContent = result.message;
    } else {
        statusResult.className = 'mt-4 status-error';
        statusResult.textContent = result.error || 'Failed to retrieve status';
    }
    
    statusResult.classList.remove('hidden');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData().then(success => {
        if (!success) {
            alert('Failed to load data. Please try again later.');
        }
    });

    // Update button click handler
    document.getElementById('updateButton').addEventListener('click', function() {
        const location = document.getElementById('locationSelect').value;
        const startDate = document.getElementById('startDate').value;
        const currentDate = new Date().toISOString().split('T')[0];
        
        if (!startDate) {
            alert('Please select a date');
            return;
        }

        if (new Date(startDate) > new Date(currentDate)) {
            alert('Selected date cannot be in the future');
            return;
        }

        updateCharts(location, startDate, currentDate);
    });

    // Add status check button handler
    document.getElementById('checkStatusButton').addEventListener('click', async function() {
        const applicationId = document.getElementById('applicationId').value.trim();
        
        if (!applicationId) {
            alert('Please enter an application ID');
            return;
        }

        const statusResult = document.getElementById('statusResult');
        statusResult.className = 'mt-4 status-loading';
        statusResult.textContent = 'Checking status...';
        statusResult.classList.remove('hidden');

        try {
            const result = await checkApplicationStatus(applicationId);
            displayStatus(result);
        } catch (error) {
            displayStatus({
                success: false,
                message: 'Failed to check status. Please try again later.'
            });
        }
    });
}); 