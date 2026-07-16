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
        maximumFractionDigits: 2
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
    chart1: '#8b5cf6',
    chart2: '#c084fc',
    chart1Dark: '#3b0f7a',
    chart2Dark: '#6d28a8',
    bgSecondary: 'rgba(255, 255, 255, 0.03)'
};

// Register custom tooltip positioner
Chart.Tooltip.positioners.outside = function(elements, eventPosition) {
    if (!elements.length) return false;
    
    const chart = this.chart;
    const center = {
        x: chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2,
        y: chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2
    };

    const dx = eventPosition.x - center.x;
    const dy = eventPosition.y - center.y;
    
    const angle = Math.atan2(dy, dx);
    const radius = Math.min(chart.chartArea.right - chart.chartArea.left, chart.chartArea.bottom - chart.chartArea.top) / 2;
    
    // Push it outside the pie radius
    const pushDistance = radius + 10; 
    
    return {
        x: center.x + Math.cos(angle) * pushDistance,
        y: center.y + Math.sin(angle) * pushDistance
    };
};

// Faux 3D Chart Plugin
const faux3DPlugin = {
    id: 'faux3d',
    beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        
        // --- 1. Physics Engine for Hover Lift ---
        chart.fauxLifts = chart.fauxLifts || [0, 0];
        const activeElements = chart.getActiveElements();
        const hoveredIndex = activeElements.length > 0 ? activeElements[0].index : -1;
        
        const targetLifts = [0, 0];
        if (hoveredIndex === 0) {
            targetLifts[0] = 20;   // Hovered block rises 20px
            targetLifts[1] = -10;  // Other block sinks 10px
        } else if (hoveredIndex === 1) {
            targetLifts[0] = -10;
            targetLifts[1] = 20;
        }
        
        let needsRedraw = false;
        for (let i = 0; i < 2; i++) {
            chart.fauxLifts[i] += (targetLifts[i] - chart.fauxLifts[i]) * 0.15;
            if (Math.abs(chart.fauxLifts[i] - targetLifts[i]) > 0.1) needsRedraw = true;
        }

        // Loop animation until targets reached
        if (needsRedraw) {
            requestAnimationFrame(() => chart.render());
        }

        const baseDepth = 28;
        
        ctx.save();
        
        // 1. Calculate absolute Y bounds for all blocks
        // Assuming all meta.data elements share the same center y
        const bottomY = Math.floor(meta.data[0].y + baseDepth); 
        let minTopY = bottomY;
        const topYs = [];
        
        meta.data.forEach((element, index) => {
            topYs[index] = Math.floor(element.y - chart.fauxLifts[index]);
            if (topYs[index] < minTopY) minTopY = topYs[index];
        });
        
        // 2. Draw true isometric 3D (Render slices from absolute bottom to absolute top)
        for (let absY = bottomY; absY >= minTopY; absY--) {
            meta.data.forEach((element, index) => {
                // If this block exists at the current absolute Y slice
                if (absY >= topYs[index] && absY <= bottomY) {
                    const { x, y, startAngle, endAngle, innerRadius, outerRadius } = element;
                    
                    // --- Draw Wall Slice ---
                    ctx.beginPath();
                    ctx.arc(x, absY, outerRadius, startAngle, endAngle);
                    ctx.arc(x, absY, innerRadius, endAngle, startAngle, true);
                    ctx.closePath();
                    
                    ctx.fillStyle = index === 0 ? '#1a0545' : '#4a107a';
                    
                    // Shadow for bottom-most layer
                    if (absY === bottomY) {
                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                        ctx.shadowBlur = 20;
                        ctx.shadowOffsetY = 15;
                    } else {
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetY = 0;
                    }
                    ctx.fill();
                    
                    // --- If Top Layer, Draw Top Face & Highlights immediately so it Z-sorts properly ---
                    if (absY === topYs[index]) {
                        ctx.shadowColor = 'transparent';
                        
                        // Top Face
                        ctx.beginPath();
                        ctx.arc(x, absY, outerRadius, startAngle, endAngle);
                        ctx.arc(x, absY, innerRadius, endAngle, startAngle, true);
                        ctx.closePath();
                        
                        const gradient = ctx.createLinearGradient(0, y - outerRadius, 0, y + outerRadius);
                        if (index === 0) {
                            gradient.addColorStop(0, '#6366f1');
                            gradient.addColorStop(1, '#4338ca');
                        } else {
                            gradient.addColorStop(0, '#d946ef');
                            gradient.addColorStop(1, '#a855f7');
                        }
                        ctx.fillStyle = gradient;
                        ctx.fill();
                        
                        // Specular Highlight
                        const midRadius = (innerRadius + outerRadius) / 2;
                        const midAngle = (startAngle + endAngle) / 2;
                        const highlightX = x + Math.cos(midAngle) * midRadius * 0.3;
                        const highlightY = absY - outerRadius * 0.4;
                        
                        const shine = ctx.createRadialGradient(
                            highlightX, highlightY, 0,
                            highlightX, highlightY, outerRadius * 1.2
                        );
                        shine.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                        shine.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
                        shine.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
                        shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
                        
                        ctx.fillStyle = shine;
                        ctx.fill();
                        
                        // Thin bright rim
                        ctx.beginPath();
                        ctx.arc(x, absY, outerRadius - 0.5, startAngle, endAngle);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            });
        }
        
        ctx.restore();
    }
};

// Common Chart Config
const getChartConfig = (labels, data) => ({
    type: 'doughnut',
    data: {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: 'transparent', // Custom draw plugin handles rendering instead
            borderWidth: 0,
            spacing: 0, 
            borderRadius: 0,
            hoverOffset: 0 // Disable 2D native expansion for 3D physical lift
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%', // Thicker ring like the reference image
        layout: {
            padding: {
                top: 25, // Room for hover lift popup
                bottom: 40, // Room for thick 3D walls + shadow
                left: 25, // Prevent clipping on the sides
                right: 25
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true,
            duration: 1000,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                position: 'outside',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    // Force tooltip color boxes to use the proper colors (since native dataset is transparent)
                    labelColor: function(context) {
                        return {
                            borderColor: 'transparent',
                            backgroundColor: context.dataIndex === 0 ? '#6366f1' : '#d946ef'
                        };
                    },
                    label: function(context) {
                        return ' ' + context.label + ': ' + formatCurrency(context.raw);
                    }
                }
            }
        }
    },
    plugins: [faux3DPlugin]
});


// --- EMI Calculator ---
const initEmiCalculator = () => {
    // Inputs
    const pInput = document.getElementById('emi-principal-input');
    if (!pInput) return () => {}; // Calculator not on this page

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
        
        // Update Center Metric
        const centerValueEl = document.getElementById('emi-chart-center-value');
        if (centerValueEl) centerValueEl.textContent = formatCurrency(totalAmount);

        // Update Chart
        emiChart.data.datasets[0].data = [p, totalInterest];
        emiChart.update();
    };

    // Sync Input & Slider
    const sync = (inputEl, sliderEl) => {
        const updateSliderFill = (val) => {
            const min = parseFloat(sliderEl.min);
            const max = parseFloat(sliderEl.max);
            const percentage = ((val - min) / (max - min)) * 100;
            sliderEl.style.setProperty('--fill', `${percentage}%`);
        };

        inputEl.addEventListener('input', () => {
            let val = parseFloat(inputEl.value);
            let min = parseFloat(inputEl.min);
            let max = parseFloat(inputEl.max);
            
            if(val < min) inputEl.value = min;
            if(val > max) inputEl.value = max;
            
            sliderEl.value = inputEl.value;
            updateSliderFill(inputEl.value);
            requestAnimationFrame(calculate);
        });
        
        sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            updateSliderFill(sliderEl.value);
            requestAnimationFrame(calculate);
        });

        // Init fill
        updateSliderFill(sliderEl.value);
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
    if (!mInput) return () => {}; // Calculator not on this page

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
        
        // Update Center Metric
        const centerValueEl = document.getElementById('sip-chart-center-value');
        if (centerValueEl) centerValueEl.textContent = formatCurrency(futureValue);

        // Update Chart
        sipChart.data.datasets[0].data = [totalInvested, estReturns];
        sipChart.update();
    };

    // Sync Input & Slider
    const sync = (inputEl, sliderEl) => {
        const updateSliderFill = (val) => {
            const min = parseFloat(sliderEl.min);
            const max = parseFloat(sliderEl.max);
            const percentage = ((val - min) / (max - min)) * 100;
            sliderEl.style.setProperty('--fill', `${percentage}%`);
        };

        inputEl.addEventListener('input', () => {
            let val = parseFloat(inputEl.value);
            let min = parseFloat(inputEl.min);
            let max = parseFloat(inputEl.max);
            
            if(val < min) inputEl.value = min;
            if(val > max) inputEl.value = max;
            
            sliderEl.value = inputEl.value;
            updateSliderFill(inputEl.value);
            requestAnimationFrame(calculate);
        });
        
        sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            updateSliderFill(sliderEl.value);
            requestAnimationFrame(calculate);
        });

        // Init fill
        updateSliderFill(sliderEl.value);
    };

    sync(mInput, mSlider);
    sync(rInput, rSlider);
    sync(tInput, tSlider);

    // Initial calc
    calculate();
    return calculate;
};

// --- Scroll Reveal Animations ---
const initScrollReveal = () => {
    const reveals = document.querySelectorAll('.reveal');
    if(reveals.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(reveal => observer.observe(reveal));
};

// --- Navigation Active State ---
const initNavigationObserver = () => {
    const sections = document.querySelectorAll('.calculator-section, .learn-section');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    if(sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active from all
                navLinks.forEach(link => link.classList.remove('active'));
                
                // Add active to the current section (using $= to match ends with #id since hrefs are absolute now)
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar-nav a[href$="#${id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }, { threshold: 0.3 }); // Trigger when 30% of the section is visible

    sections.forEach(section => observer.observe(section));
};

// --- Sidebar Toggle Logic ---
const initSidebarToggle = () => {
    const openBtns = document.querySelectorAll('.sidebar-open-btn');
    const closeBtns = document.querySelectorAll('.sidebar-close-btn');
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;

    const toggleSidebar = () => {
        if(window.innerWidth <= 1024) {
            sidebar.classList.toggle('open');
        } else {
            body.classList.toggle('sidebar-collapsed');
        }
    };

    openBtns.forEach(btn => btn.addEventListener('click', toggleSidebar));
    closeBtns.forEach(btn => btn.addEventListener('click', toggleSidebar));
};

// --- Custom Dropdown Builder ---
const buildCustomDropdowns = (calcEmi, calcSip) => {
    document.querySelectorAll('.currency-selector').forEach(select => {
        const parent = select.parentElement;
        
        // Create custom dropdown wrapper
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        
        // Create trigger button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-dropdown-trigger';
        const selectedOption = select.options[select.selectedIndex];
        trigger.innerHTML = `<span class="dd-text">${selectedOption.text}</span><span class="dd-arrow">▼</span>`;
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';
        
        Array.from(select.options).forEach(option => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            if (option.selected) item.classList.add('selected');
            item.textContent = option.text;
            item.dataset.value = option.value;
            
            item.addEventListener('click', () => {
                // Update native select
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                
                // Update trigger text
                trigger.querySelector('.dd-text').textContent = option.text;
                
                // Update selected state
                menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                // Close dropdown
                dropdown.classList.remove('open');
            });
            
            menu.appendChild(item);
        });
        
        // Toggle on click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close any other open dropdowns
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });
        
        dropdown.appendChild(trigger);
        dropdown.appendChild(menu);
        parent.insertBefore(dropdown, select);
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
    });
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const calcEmi = initEmiCalculator();
    const calcSip = initSipCalculator();
    initNavigationObserver();
    initScrollReveal();
    initSidebarToggle();

    // Strictly enforce numeric-only input
    document.querySelectorAll('input[type="text"]').forEach(input => {
        // Only target inputs meant for numbers by checking their IDs
        if (input.id.includes('input')) {
            input.addEventListener('input', (e) => {
                // Replace anything that is not a digit or a single decimal point
                let value = e.target.value;
                value = value.replace(/[^0-9.]/g, '');
                
                // Prevent multiple decimal points
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                e.target.value = value;
            });
        }
    });

    const currencySelects = document.querySelectorAll('.currency-selector');
    currencySelects.forEach(select => {
        select.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            updateCurrencySymbols();
            requestAnimationFrame(() => {
                calcEmi();
                calcSip();
            });
        });
    });

    buildCustomDropdowns(calcEmi, calcSip);
});
