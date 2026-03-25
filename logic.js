// Data Models & Seeding (Requirement 2)
let sections = JSON.parse(localStorage.getItem('pharmavise_sections_os'));
let medicines = JSON.parse(localStorage.getItem('pharmavise_medicines_os'));
let billHistory = JSON.parse(localStorage.getItem('pharmavise_bill_history')) || [];

if (!sections || !medicines) {
    // Generate Default Data
    sections = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];
    medicines = [];
    const categories = ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment'];
    const today = new Date();

    for (let i = 1; i <= 50; i++) {
        const isUrgent = i % 8 === 0;  // 6 Urgent
        const isWarning = i % 5 === 0 && !isUrgent; // 8 Warnings
        const isExpired = i % 25 === 0; // 2 Expired

        let expDays = 120 + i; // Safe region
        if (isExpired) expDays = -10;
        else if (isUrgent) expDays = 15; // <= 30
        else if (isWarning) expDays = 45; // 31-60

        let expDate = new Date();
        expDate.setDate(today.getDate() + expDays);

        let mfgDate = new Date();
        mfgDate.setFullYear(today.getFullYear() - 1);
        mfgDate.setDate(today.getDate() - i);

        let qty = 900;
        if (i % 6 === 0) qty = 300; // < 500
        else if (i % 9 === 0) qty = 1800; // > 1500

        medicines.push({
            id: 'med-' + Date.now() + i,
            name: `Medicine Alpha-${i}`,
            category: categories[i % categories.length],
            batch: `BCH-${1000 + i}`,
            mfg: mfgDate.toISOString().split('T')[0],
            exp: expDate.toISOString().split('T')[0],
            qty: qty,
            section: sections[i % 5]
        });
    }
    saveSections();
    saveMedicines();
}

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const topbarSearchSort = document.getElementById('topbar-search-sort');
const topbarSpacer = document.getElementById('topbar-spacer');

const sectionInput = document.getElementById('section-name');
const addSectionBtn = document.getElementById('add-section-btn');
const sectionList = document.getElementById('section-list');
const medSectionSelect = document.getElementById('med-section');

const addMedicineForm = document.getElementById('add-medicine-form');
const inventoryBody = document.getElementById('inventory-body');

const searchInput = document.getElementById('global-search');
const sortSelect = document.getElementById('sort-select');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderSections();
    renderMedicines();
    updateDashboard();
    renderEnvironmentMonitoring();
    renderCurrentBill();
    renderBillHistory();
});

// Tab Navigation (Scoping Search & Sort)
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (item.dataset.tab === 'premium') {
            document.getElementById('premium-modal').classList.add('active');
            return;
        }

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetTab = document.getElementById(`${item.dataset.tab}-tab`);
        if (targetTab) targetTab.classList.add('active');

        // Scope Requirement: Hide search/sort if not inventory
        if (item.dataset.tab === 'inventory') {
            topbarSearchSort.classList.remove('hidden');
            topbarSpacer.style.display = 'none';
        } else {
            topbarSearchSort.classList.add('hidden');
            topbarSpacer.style.display = 'block';
        }
    });
});

// Premium Modal
document.getElementById('close-premium').addEventListener('click', () => document.getElementById('premium-modal').classList.remove('active'));
document.getElementById('premium-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const premiumForm = document.getElementById('premium-form');
    premiumForm.classList.add('hidden');
    document.getElementById('premium-success').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('premium-modal').classList.remove('active');
        premiumForm.classList.remove('hidden');
        document.getElementById('premium-success').classList.add('hidden');
        premiumForm.reset();
        showToast('Premium Activated successfully!', 'success');
    }, 2000);
});

// Sections Management
addSectionBtn.addEventListener('click', () => {
    const name = sectionInput.value.trim();
    if (!name) return showToast('Section name cannot be empty', 'danger');
    if (sections.includes(name)) return showToast('Section already exists', 'warning');

    sections.push(name);
    saveSections();
    renderSections();
    renderEnvironmentMonitoring();
    sectionInput.value = '';
    showToast('Section added successfully', 'success');
    updateDashboard();
});

window.deleteSection = function (index) {
    const sectionName = sections[index];
    const isUsed = medicines.some(m => m.section === sectionName);
    if (isUsed) {
        return showToast('Cannot delete section: It contains medicines', 'danger');
    }
    sections.splice(index, 1);
    saveSections();
    renderSections();
    renderEnvironmentMonitoring();
    showToast('Section deleted successfully', 'success');
    updateDashboard();
}

function renderSections() {
    sectionList.innerHTML = '';
    medSectionSelect.innerHTML = '<option value="" disabled selected>Select Section</option>';

    sections.forEach((sec, idx) => {
        const li = document.createElement('li');
        li.className = 'section-item';
        li.innerHTML = `
            <span class="section-item-name">${sec}</span>
            <button class="btn btn-danger" onclick="deleteSection(${idx})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        sectionList.appendChild(li);

        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = sec;
        medSectionSelect.appendChild(opt);
    });

    if (sections.length === 0) {
        sectionList.innerHTML = '<li class="text-muted" style="padding:12px; font-size: 14px;">No sections created.</li>';
    }
}

function saveSections() { localStorage.setItem('pharmavise_sections_os', JSON.stringify(sections)); }
function saveMedicines() { localStorage.setItem('pharmavise_medicines_os', JSON.stringify(medicines)); }

// Medicine Management
addMedicineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const medSection = document.getElementById('med-section').value;
    const cat = document.getElementById('med-category').value;
    if (!medSection || !cat) return showToast('Please select all dropdown options', 'danger');

    const med = {
        id: 'med-' + Date.now(),
        name: document.getElementById('med-name').value,
        category: cat,
        batch: document.getElementById('med-batch').value,
        mfg: document.getElementById('med-mfg').value,
        exp: document.getElementById('med-exp').value,
        qty: parseInt(document.getElementById('med-qty').value, 10),
        section: medSection
    };

    medicines.push(med);
    saveMedicines();
    renderMedicines();
    addMedicineForm.reset();
    showToast('Medicine added to inventory successfully', 'success');
    updateDashboard();
});

window.deleteMedicine = function (id) {
    medicines = medicines.filter(m => m.id !== id);
    saveMedicines();
    renderMedicines();
    updateDashboard();
    showToast('Medicine entry removed', 'success');
}

function renderMedicines(data = medicines) {
    inventoryBody.innerHTML = '';
    if (data.length === 0) {
        inventoryBody.innerHTML = `<tr><td colspan="9" style="text-align:center;" class="text-muted">No medicines found.</td></tr>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.forEach(med => {
        const expDate = new Date(med.exp);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Requirement: Status Indicators
        let statusHtml = '';
        if (diffDays < 0) {
            statusHtml = `<span class="status-badge status-danger"><i class="fa-solid fa-circle-xmark"></i> EXPIRED</span>`;
        } else if (diffDays <= 30) {
            statusHtml = `<span class="status-badge status-danger"><i class="fa-solid fa-circle-exclamation"></i> URGENT DISPATCH (🔴)</span>`;
        } else if (diffDays <= 60) {
            statusHtml = `<span class="status-badge status-warning"><i class="fa-solid fa-triangle-exclamation"></i> WARNING (🟡)</span>`;
        } else {
            statusHtml = `<span class="status-badge status-safe"><i class="fa-solid fa-circle-check"></i> SAFE</span>`;
        }

        // Requirement: Stock Badges
        let stockBadge = '';
        if (med.qty < 500) stockBadge = `<span class="stock-badge stock-low">LOW!</span>`;
        else if (med.qty > 1500) stockBadge = `<span class="stock-badge stock-over">OVERSTOCK</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${med.name}</strong></td>
            <td>${med.category}</td>
            <td>${med.batch}</td>
            <td>${med.mfg}</td>
            <td>${med.exp}</td>
            <td>${med.qty} ${stockBadge}</td>
            <td>${med.section}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteMedicine('${med.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        inventoryBody.appendChild(tr);
    });
}

// Search & Sort Logic
function filterAndSort() {
    const query = searchInput.value.toLowerCase();
    const sortVal = sortSelect.value;

    let filtered = medicines.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.batch.toLowerCase().includes(query) ||
        m.section.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query)
    );

    filtered.sort((a, b) => {
        if (sortVal === 'expiry-asc') {
            return new Date(a.exp) - new Date(b.exp);
        } else if (sortVal === 'expiry-desc') {
            return new Date(b.exp) - new Date(a.exp);
        } else if (sortVal === 'stock-asc') {
            return a.qty - b.qty;
        } else if (sortVal === 'stock-desc') {
            return b.qty - a.qty;
        }
        return 0;
    });

    renderMedicines(filtered);
}

searchInput.addEventListener('input', filterAndSort);
sortSelect.addEventListener('change', filterAndSort);

function updateDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let expiringSoon = 0; let expired = 0;
    const validMedicines = [];

    const lowStockMeds = [];

    medicines.forEach(med => {
        const expDate = new Date(med.exp);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) expired++;
        else {
            validMedicines.push(med);
            if (diffDays <= 30) expiringSoon++;
        }

        if (med.qty < 500) lowStockMeds.push(med);
    });

    document.getElementById('stat-total-meds').textContent = medicines.length;
    document.getElementById('stat-total-sections').textContent = sections.length;
    document.getElementById('stat-expiring-soon').textContent = expiringSoon;
    document.getElementById('stat-expired').textContent = expired;

    // FEFO Priority Logic
    const fefoDisplay = document.getElementById('fefo-display');
    if (validMedicines.length > 0) {
        validMedicines.sort((a, b) => new Date(a.exp) - new Date(b.exp));
        const topOut = validMedicines.slice(0, 4); // Display top 4

        fefoDisplay.style.display = 'flex';
        fefoDisplay.style.flexDirection = 'column';
        fefoDisplay.style.alignItems = 'stretch';
        fefoDisplay.style.gap = '12px';

        let html = '';
        topOut.forEach(med => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.7); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);">
                    <div class="fefo-alert">
                        <div class="fefo-icon" style="width: 32px; height: 32px; font-size: 16px;"><i class="fa-solid fa-truck-fast"></i></div>
                        <div class="fefo-info">
                            <h4 style="font-size: 15px;">High Priority: ${med.name}</h4>
                            <p style="font-size: 13px;">Batch: <strong>${med.batch}</strong> | Section: ${med.section} | Expiry: <span style="color: var(--danger); font-weight: bold;">${med.exp}</span></p>
                        </div>
                    </div>
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="showToast('Dispatch ordered for ${med.batch}', 'success')">Execute FEFO</button>
                </div>
            `;
        });
        fefoDisplay.innerHTML = html;
    } else {
        fefoDisplay.innerHTML = `<p class="text-muted">No medicines in stock to recommend for dispatch.</p>`;
        fefoDisplay.style.display = 'flex';
        fefoDisplay.style.flexDirection = 'row';
    }

    // Predictive Insights
    const insightsList = document.getElementById('insights-list');
    // Keep AI predict
    const aiInsight = `<div class="insight-item ai-insight">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <p>AI predicts a <strong>25% demand increase</strong> for Paracetamol next week.</p>
    </div>`;

    let lowStockInsight = '';
    if (lowStockMeds.length > 0) {
        const names = lowStockMeds.slice(0, 2).map(m => m.name).join(', ');
        lowStockInsight = `<div class="insight-item warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>Stock is low: Order <strong>1000 units</strong> for ${names} to maintain buffer.</p>
        </div>`;
    }
    insightsList.innerHTML = aiInsight + lowStockInsight;
}

function renderEnvironmentMonitoring() {
    const grid = document.getElementById('env-monitoring-grid');
    grid.innerHTML = '';
    sections.slice(0, 5).forEach((sec, idx) => {
        // Mock data. Make section A or B trigger alert > 30C randomly or fixed.
        let temp = 22 + Math.floor(Math.random() * 6);
        let rh = 40 + Math.floor(Math.random() * 15);
        let isAlert = false;

        // Simulating the exact requirements: Trigger Red Take Action if A/B > 30
        if (sec === 'Section A' || sec === 'Section B') {
            temp = 31; // Force alert for demonstration of logic
            isAlert = true;
        }

        grid.innerHTML += `
            <div class="env-card ${isAlert ? 'alert' : ''}">
                <div class="env-info">
                    <h4>${sec}</h4>
                    <p>Humidity: ${rh}%</p>
                </div>
                <div class="env-action">
                    <span class="env-value">${temp}°C</span>
                    ${isAlert ? `<button class="btn btn-danger" onclick="showToast('HVAC restart initiated for ${sec}', 'success')">Take Action</button>` : `<span class="text-success" style="font-size:12px; font-weight:600;"><i class="fa-solid fa-check"></i> Optimal</span>`}
                </div>
            </div>
        `;
    });
}

// AI Chat Simulation
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatHistory = document.getElementById('chat-history');

function addChatMessage(message, isAi = false) {
    const div = document.createElement('div');
    div.className = `chat-message ${isAi ? 'ai-message' : 'user-message'}`;
    div.innerHTML = `
        <div class="avatar ${isAi ? 'ai-avatar' : 'user-avatar'}">
            <i class="fa-solid ${isAi ? 'fa-robot' : 'fa-user'}"></i>
        </div>
        <div class="message-content">${message}</div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

chatSend.addEventListener('click', handleChat);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-message ai-message typing-indicator-msg';
    div.innerHTML = `
        <div class="avatar ai-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content" style="display: flex; align-items: center; justify-content: center; min-width: 60px;">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div;
}

function handleChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage(text, false);
    chatInput.value = '';

    const typingDiv = showTypingIndicator();

    setTimeout(() => {
        if(typingDiv && typingDiv.parentNode) {
            typingDiv.parentNode.removeChild(typingDiv);
        }

        const t = text.toLowerCase();
        let response = "";
        const personaPrefix = "<strong style='color: var(--blue-primary); display: block; margin-bottom: 6px;'><i class='fa-solid fa-bolt'></i> Entrepreneur AI</strong>As an industry-leading entrepreneur, I've analyzed our global inventory. ";
        const today = new Date();
        today.setHours(0,0,0,0);

        const expireMatch = t.match(/expir.*?(\d+)\s*days/i) || t.match(/(\d+)\s*days.*?expir/i);
        
        if (expireMatch) {
            const days = parseInt(expireMatch[1], 10);
            let count = 0;
            medicines.forEach(med => {
                const expDate = new Date(med.exp);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays > 0 && diffDays <= days) count++;
            });
            response = personaPrefix + `We have exactly <strong>${count}</strong> medicines expiring within the next <strong>${days} days</strong>. My strategic advice: prioritize dispatching these immediately using our FEFO system to minimize revenue loss.`;
        } 
        else if (t.includes('already expired') || (t.includes('how many') && t.includes('expired'))) {
             let count = 0;
             medicines.forEach(med => {
                const expDate = new Date(med.exp);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) count++;
            });
            response = personaPrefix + `Currently, there are <strong>${count}</strong> expired medicines in our warehouses. We must audit our supply chain efficiency to bring this number to zero. Integrity is our currency.`;
        }
        else if (t.includes('low stock') || t.includes('empty')) {
            let count = medicines.filter(m => m.qty < 500).length;
            response = personaPrefix + `We have <strong>${count}</strong> items critically low on stock. I've already prepared smart auto-order suggestions in your Insights panel. Never let stockouts disrupt a market monopoly.`;
        }
        else if (t.includes('total medicine') || t.includes('how many medicine')) {
            response = personaPrefix + `Our warehouses currently manage <strong>${medicines.length}</strong> distinct medicine batches across <strong>${sections.length}</strong> active zones. We are scaling operations beautifully.`;
        }
        else if (t.includes('predict') || t.includes('paracetamol')) {
            response = personaPrefix + "My market analysis predicts that Paracetamol demand will spike next week due to seasonal flu trends (25% increase). Recommendations are updated in your Insights panel.";
        } 
        else if (t.includes('order') || t.includes('suggest')) {
            response = personaPrefix + `I am preparing purchase orders for all items currently mapping into 'LOW!' stock thresholds. Action creates momentum.`;
        }
        else {
            response = "<strong style='color: var(--blue-primary); display: block; margin-bottom: 6px;'><i class='fa-solid fa-bolt'></i> Entrepreneur AI</strong>As a top-tier entrepreneur, my time is focused on macro-strategy and actionable data. Please ask me standard, impactful operational questions like <em>'How many medicines will expire in 10 days?'</em>, <em>'What is our low stock?'</em>, or <em>'Total medicines?'</em>. Let's keep driving growth.";
        }
        
        addChatMessage(response, true);
    }, 1500);
}

window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// ==========================================
// BILLING SYSTEM LOGIC
// ==========================================

let currentBillMedicines = [];
let lastGeneratedBill = null;

const billMedNameInput = document.getElementById('bill-med-name');
const billMedSuggestions = document.getElementById('bill-med-suggestions');
const billQtyInput = document.getElementById('bill-qty');
const billPriceInput = document.getElementById('bill-price');
const btnAddToBill = document.getElementById('btn-add-to-bill');
const currentBillBody = document.getElementById('current-bill-body');
const currentBillTotal = document.getElementById('current-bill-total');
const billCustomerName = document.getElementById('bill-customer-name');
const btnGenerateBill = document.getElementById('btn-generate-bill');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnExportExcel = document.getElementById('btn-export-excel');
const billHistoryBody = document.getElementById('bill-history-body');
const btnClearHistory = document.getElementById('btn-clear-history');

// Autocomplete Logic
if (billMedNameInput) {
    billMedNameInput.addEventListener('input', function () {
        const val = this.value.toLowerCase().trim();
        billMedSuggestions.innerHTML = '';

        if (val.length < 1) {
            billMedSuggestions.classList.remove('active');
            return;
        }

        const matches = medicines.filter(m => m.name.toLowerCase().includes(val) && m.qty > 0);

        if (matches.length > 0) {
            matches.forEach(match => {
                const li = document.createElement('li');
                li.textContent = `${match.name} (Stock: ${match.qty})`;
                li.addEventListener('click', () => {
                    billMedNameInput.value = match.name;
                    billMedNameInput.dataset.id = match.id;
                    billMedSuggestions.classList.remove('active');
                });
                billMedSuggestions.appendChild(li);
            });
            billMedSuggestions.classList.add('active');
        } else {
            const li = document.createElement('li');
            li.textContent = 'No matching medicine found';
            li.style.color = 'var(--danger)';
            billMedSuggestions.appendChild(li);
            billMedSuggestions.classList.add('active');
        }
    });

    // Hide autocomplete on click outside
    document.addEventListener('click', function (e) {
        if (e.target !== billMedNameInput && e.target !== billMedSuggestions) {
            billMedSuggestions.classList.remove('active');
        }
    });

    // Add Medicine to Bill
    btnAddToBill.addEventListener('click', () => {
        const medName = billMedNameInput.value.trim();
        const qty = parseInt(billQtyInput.value);
        const price = parseFloat(billPriceInput.value);

        if (!medName || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
            showToast('Please enter valid medicine, quantity, and price.', 'warning');
            return;
        }

        // Check inventory
        const medInDb = medicines.find(m => m.name === medName);
        if (!medInDb) {
            showToast('Medicine not found in inventory.', 'danger');
            return;
        }

        // Calculate total qty across current bill to prevent overselling
        const existingInBill = currentBillMedicines.find(m => m.id === medInDb.id);
        const existingQty = existingInBill ? existingInBill.qty : 0;

        if (medInDb.qty < (existingQty + qty)) {
            showToast(`Not enough stock. Available: ${medInDb.qty - existingQty}`, 'danger');
            return;
        }

        if (existingInBill) {
            existingInBill.qty += qty;
            existingInBill.total = existingInBill.qty * existingInBill.price;
        } else {
            currentBillMedicines.push({
                id: medInDb.id,
                name: medInDb.name,
                qty: qty,
                price: price,
                total: qty * price
            });
        }

        renderCurrentBill();

        // Reset inputs
        billMedNameInput.value = '';
        delete billMedNameInput.dataset.id;
        billQtyInput.value = '';
        billPriceInput.value = '';
        showToast('Medicine added to bill.', 'success');
    });

    // Generate Bill
    btnGenerateBill.addEventListener('click', () => {
        const customer = billCustomerName.value.trim();
        if (!customer) {
            showToast('Please enter customer name.', 'warning');
            return;
        }

        if (currentBillMedicines.length === 0) {
            showToast('Please add at least one medicine to the bill.', 'warning');
            return;
        }

        let grandTotal = 0;
        let valid = true;

        // Final check for stock before generating
        currentBillMedicines.forEach(item => {
            const medInDb = medicines.find(m => m.id === item.id);
            if (!medInDb || medInDb.qty < item.qty) {
                valid = false;
            } else {
                grandTotal += item.total;
            }
        });

        if (!valid) {
            showToast('Not enough stock available for one or more items.', 'danger');
            return;
        }

        // Update inventory
        currentBillMedicines.forEach(item => {
            const medInDb = medicines.find(m => m.id === item.id);
            medInDb.qty -= item.qty;
        });

        saveMedicines();
        renderMedicines();
        updateDashboard();

        // Finalize bill
        const billId = 'BILL-' + Date.now();
        const dateStr = new Date().toLocaleString();

        const newBill = {
            id: billId,
            customer: customer,
            date: dateStr,
            items: [...currentBillMedicines],
            total: grandTotal
        };

        billHistory.push(newBill);
        localStorage.setItem('pharmavise_bill_history', JSON.stringify(billHistory));
        renderBillHistory();

        // Store as last generated for export
        lastGeneratedBill = Object.assign({}, newBill);

        // Enable export buttons
        btnDownloadPdf.disabled = false;
        btnExportExcel.disabled = false;
        btnDownloadPdf.title = 'Export to PDF';
        btnExportExcel.title = 'Export to Excel';

        showToast(`Bill generated successfully! Total: $${grandTotal.toFixed(2)}`, 'success');

        // Clear form
        currentBillMedicines = [];
        renderCurrentBill();
        billCustomerName.value = '';
    });

    btnClearHistory.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL bill history? This action cannot be undone.')) {
            billHistory = [];
            localStorage.setItem('pharmavise_bill_history', JSON.stringify(billHistory));
            renderBillHistory();
            showToast('All bill history cleared', 'success');

            // disable buttons if no bill exists
            lastGeneratedBill = null;
            btnDownloadPdf.disabled = true;
            btnExportExcel.disabled = true;
        }
    });

    // PDF Export
    btnDownloadPdf.addEventListener('click', () => {
        if (!lastGeneratedBill) {
            showToast('Please generate a bill first', 'warning');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(22);
            doc.text('Pharmavise Billing Invoice', 105, 20, null, null, 'center');

            doc.setFontSize(12);
            doc.text(`Bill ID: ${lastGeneratedBill.id}`, 20, 40);
            doc.text(`Customer Name: ${lastGeneratedBill.customer}`, 20, 50);
            doc.text(`Date: ${lastGeneratedBill.date}`, 20, 60);

            // Table Header
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Medicine Name', 20, 80);
            doc.text('Quantity', 100, 80);
            doc.text('Price', 130, 80);
            doc.text('Total', 170, 80);

            doc.line(20, 82, 190, 82);
            doc.setFont('helvetica', 'normal');

            // Table Rows
            let yPos = 90;
            lastGeneratedBill.items.forEach((item) => {
                doc.text(item.name, 20, yPos);
                doc.text(item.qty.toString(), 100, yPos);
                doc.text('$' + item.price.toFixed(2), 130, yPos);
                doc.text('$' + item.total.toFixed(2), 170, yPos);
                yPos += 10;
            });

            doc.line(20, yPos, 190, yPos);
            yPos += 10;

            // Grand Total
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Grand Total: $${lastGeneratedBill.total.toFixed(2)}`, 130, yPos);

            doc.save('pharmavise_bill.pdf');
            showToast('PDF Document Generated!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error generating PDF. Please try again.', 'danger');
        }
    });

    // Excel Export
    btnExportExcel.addEventListener('click', () => {
        if (!lastGeneratedBill) {
            showToast('Please generate a bill first', 'warning');
            return;
        }

        try {
            const excelData = lastGeneratedBill.items.map(item => ({
                'Medicine Name': item.name,
                'Quantity': item.qty,
                'Price': item.price,
                'Total': item.total
            }));

            // Add a blank row and then grand total
            excelData.push({});
            excelData.push({
                'Medicine Name': 'GRAND TOTAL',
                'Total': lastGeneratedBill.total
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

            XLSX.writeFile(workbook, 'pharmavise_bill.xlsx');
            showToast('Excel Document Generated!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error generating Excel. Please try again.', 'danger');
        }
    });

}

function renderCurrentBill() {
    if (!currentBillBody) return;
    currentBillBody.innerHTML = '';
    let grandTotal = 0;

    if (currentBillMedicines.length === 0) {
        currentBillBody.innerHTML = '<tr><td colspan="5" style="text-align:center" class="text-muted">No medicines added yet.</td></tr>';
        currentBillTotal.textContent = '0.00';
        return;
    }

    currentBillMedicines.forEach((item, index) => {
        grandTotal += item.total;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.qty}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${item.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeFromBill(${index})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        currentBillBody.appendChild(tr);
    });

    currentBillTotal.textContent = grandTotal.toFixed(2);
}

window.removeFromBill = function (index) {
    currentBillMedicines.splice(index, 1);
    renderCurrentBill();
};

function renderBillHistory() {
    if (!billHistoryBody) return;
    billHistoryBody.innerHTML = '';

    if (billHistory.length === 0) {
        billHistoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center" class="text-muted">No bill history available.</td></tr>';
        return;
    }

    // Sort descending by date (most recent first)
    const sortedHistory = [...billHistory].reverse();

    sortedHistory.forEach((bill) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${bill.id}</strong></td>
            <td>${bill.customer}</td>
            <td>${bill.date}</td>
            <td>$${bill.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-primary" onclick="viewBillDetails('${bill.id}')" title="View Details" style="padding: 4px 8px; font-size: 12px; border-radius: 6px;">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteBillHistory('${bill.id}')" title="Delete" style="padding: 4px 8px; font-size: 12px; border-radius: 6px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        billHistoryBody.appendChild(tr);
    });
}

window.viewBillDetails = function (id) {
    const bill = billHistory.find(b => b.id === id);
    if (bill) {
        let details = `Bill ID: ${bill.id}\nCustomer: ${bill.customer}\nDate: ${bill.date}\n\nItems:\n`;
        bill.items.forEach(i => {
            details += `- ${i.name}: ${i.qty} x $${i.price.toFixed(2)} = $${i.total.toFixed(2)}\n`;
        });
        details += `\nGrand Total: $${bill.total.toFixed(2)}`;
        alert(details);
    }
};

window.deleteBillHistory = function (id) {
    if (confirm('Are you sure you want to delete this bill record?')) {
        billHistory = billHistory.filter(b => b.id !== id);
        localStorage.setItem('pharmavise_bill_history', JSON.stringify(billHistory));
        renderBillHistory();
        showToast('Bill history deleted', 'success');
    }
};
