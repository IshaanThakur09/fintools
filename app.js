let currentCurrency = 'INR';

// --- Utilities ---
const formatCurrency = (value) => {
    let locale = 'en-US';
    if(currentCurrency === 'INR') locale = 'en-IN';
    else if(currentCurrency === 'EUR') locale = 'en-IE';
    else if(currentCurrency === 'GBP') locale = 'en-GB';
    else if(currentCurrency === 'JPY') locale = 'ja-JP';
    else if(currentCurrency === 'AUD') locale = 'en-AU';
    else if(currentCurrency === 'CAD') locale = 'en-CA';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currentCurrency,
        maximumFractionDigits: 0
    }).format(value);
};

const updateCurrencySymbols = () => {
    // We don't have static text symbols anymore, they are native <select> elements.
    // So we just update the selected value of all select elements to match currentCurrency.
    const selects = document.querySelectorAll('.currency-selector');
    selects.forEach(select => {
        select.value = currentCurrency;
    });
};

// Colors matching CSS variables
const COLORS = {
    chart1: '#3b82f6',
    chart2: '#10b981',
    bgSecondary: '#1e293b'
};

// Common Chart Config
const getChartConfig = (labels, data) => ({
    type: 'doughnut',
    data: {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: [COLORS.chart1, COLORS.chart2],
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '75%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        return ' ' + context.label + ': ' + formatCurrency(context.raw);
                    }
                }
            }
        }
    }
});


// --- EMI Calculator ---
const initEmiCalculator = () => {
    // Inputs
    const pInput = document.getElementById('emi-principal-input');
    const pSlider = document.getElementById('emi-principal-slider');
    const rInput = document.getElementById('emi-rate-input');
    const rSlider = document.getElementById('emi-rate-slider');
    const tInput = document.getElementById('emi-tenure-input');
    const tSlider = document.getElementById('emi-tenure-slider');

    // Outputs
    const monthlyRes = document.getElementById('emi-monthly-result');
    const principalRes = document.getElementById('emi-principal-result');
    const interestRes = document.getElementById('emi-interest-result');
    const totalRes = document.getElementById('emi-total-result');

    // Chart
    const ctx = document.getElementById('emiChart').getContext('2d');
    let emiChart = new Chart(ctx, getChartConfig(['Principal Amount', 'Total Interest'], [50, 50]));

    const calculate = () => {
        let p = parseFloat(pInput.value) || 0;
        let rAnnual = parseFloat(rInput.value) || 0;
        let tYears = parseFloat(tInput.value) || 0;

        let rMonthly = rAnnual / 12 / 100;
        let nMonths = tYears * 12;

        let emi = 0;
        let totalAmount = 0;
        let totalInterest = 0;

        if (p > 0 && rAnnual > 0 && tYears > 0) {
            emi = p * rMonthly * Math.pow(1 + rMonthly, nMonths) / (Math.pow(1 + rMonthly, nMonths) - 1);
            totalAmount = emi * nMonths;
            totalInterest = totalAmount - p;
        }

        // Update UI
        monthlyRes.textContent = formatCurrency(emi);
        principalRes.textContent = formatCurrency(p);
        interestRes.textContent = formatCurrency(totalInterest);
        totalRes.textContent = formatCurrency(totalAmount);

        // Update Chart
        emiChart.data.datasets[0].data = [p, totalInterest];
        emiChart.update();
    };

    // Sync Input & Slider
    const sync = (inputEl, sliderEl) => {
        inputEl.addEventListener('input', () => {
            let val = parseFloat(inputEl.value);
            let min = parseFloat(inputEl.min);
            let max = parseFloat(inputEl.max);
            
            if(val < min) inputEl.value = min;
            if(val > max) inputEl.value = max;
            
            sliderEl.value = inputEl.value;
            calculate();
        });
        
        sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            calculate();
        });
    };

    sync(pInput, pSlider);
    sync(rInput, rSlider);
    sync(tInput, tSlider);

    // Initial calc
    calculate();
    return calculate;
};


// --- SIP Calculator ---
const initSipCalculator = () => {
    // Inputs
    const mInput = document.getElementById('sip-monthly-input');
    const mSlider = document.getElementById('sip-monthly-slider');
    const rInput = document.getElementById('sip-rate-input');
    const rSlider = document.getElementById('sip-rate-slider');
    const tInput = document.getElementById('sip-tenure-input');
    const tSlider = document.getElementById('sip-tenure-slider');

    // Outputs
    const totalRes = document.getElementById('sip-total-result');
    const investedRes = document.getElementById('sip-invested-result');
    const returnsRes = document.getElementById('sip-returns-result');

    // Chart
    const ctx = document.getElementById('sipChart').getContext('2d');
    let sipChart = new Chart(ctx, getChartConfig(['Invested Amount', 'Est. Returns'], [50, 50]));

    const calculate = () => {
        let p = parseFloat(mInput.value) || 0;
        let rAnnual = parseFloat(rInput.value) || 0;
        let tYears = parseFloat(tInput.value) || 0;

        let rMonthly = rAnnual / 12 / 100;
        let nMonths = tYears * 12;

        let futureValue = 0;
        let totalInvested = p * nMonths;
        let estReturns = 0;

        if (p > 0 && rAnnual > 0 && tYears > 0) {
            futureValue = p * ((Math.pow(1 + rMonthly, nMonths) - 1) / rMonthly) * (1 + rMonthly);
            estReturns = futureValue - totalInvested;
        } else if (p > 0 && rAnnual === 0) {
             futureValue = totalInvested;
        }

        // Update UI
        totalRes.textContent = formatCurrency(futureValue);
        investedRes.textContent = formatCurrency(totalInvested);
        returnsRes.textContent = formatCurrency(estReturns);

        // Update Chart
        sipChart.data.datasets[0].data = [totalInvested, estReturns];
        sipChart.update();
    };

    // Sync Input & Slider
    const sync = (inputEl, sliderEl) => {
        inputEl.addEventListener('input', () => {
            let val = parseFloat(inputEl.value);
            let min = parseFloat(inputEl.min);
            let max = parseFloat(inputEl.max);
            
            if(val < min) inputEl.value = min;
            if(val > max) inputEl.value = max;
            
            sliderEl.value = inputEl.value;
            calculate();
        });
        
        sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            calculate();
        });
    };

    sync(mInput, mSlider);
    sync(rInput, rSlider);
    sync(tInput, tSlider);

    // Initial calc
    calculate();
    return calculate;
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const calcEmi = initEmiCalculator();
    const calcSip = initSipCalculator();

    const currencySelects = document.querySelectorAll('.currency-selector');
    currencySelects.forEach(select => {
        select.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            updateCurrencySymbols();
            calcEmi();
            calcSip();
        });
    });
});
