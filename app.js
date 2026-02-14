// App State
const state = {
    reminders: [],
    editingId: null,
    currentFilter: 'all'
};

// Default Templates
const templates = [
    {
        title: 'Haircut',
        icon: '✂️',
        frequency: 'monthly',
        time: '09:00',
        days: [0,1,2,3,4,5,6]
    },
    {
        title: 'Wash',
        icon: '🚿',
        frequency: 'every3days',
        time: '20:00',
        days: [0,1,2,3,4,5,6]
    },
    {
        title: 'Drink Water',
        icon: '💧',
        frequency: 'hourly',
        time: '08:00',
        days: [1,2,3,4,5],
        officeHours: { start: '08:00', end: '17:00' }
    }
];

// Initialize App
function initApp() {
    loadReminders();
    renderTemplates();
    renderReminders();
    setupEventListeners();
    checkNotificationPermission();
    registerServiceWorker();
    scheduleAllNotifications();
}

// Local Storage
function saveReminders() {
    localStorage.setItem('reminders', JSON.stringify(state.reminders));
}

function loadReminders() {
    const saved = localStorage.getItem('reminders');
    if (saved) {
        state.reminders = JSON.parse(saved);
    }
}

function saveHistory(reminder, completedAt) {
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    history.unshift({
        id: Date.now(),
        reminderId: reminder.id,
        title: reminder.title,
        icon: reminder.icon,
        completedAt: completedAt
    });
    // Keep only last 100 items
    if (history.length > 100) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
}

function getHistory() {
    return JSON.parse(localStorage.getItem('history') || '[]');
}

// Templates
function renderTemplates() {
    const grid = document.getElementById('modalTemplatesGrid');
    if (grid) {
        grid.innerHTML = templates.map((template, index) => `
            <button type="button" class="template-card" onclick="useTemplate(${index})">
                <span class="template-icon">${template.icon}</span>
                <div class="template-title">${template.title}</div>
                <div class="template-desc">${getFrequencyText(template.frequency)}</div>
            </button>
        `).join('');
    }
}

function useTemplate(index) {
    const template = templates[index];
    document.getElementById('reminderTitle').value = template.title;
    document.getElementById('reminderIcon').value = template.icon;
    document.getElementById('reminderFrequency').value = template.frequency;
    document.getElementById('reminderTime').value = template.time;
    document.getElementById('selectedDays').value = template.days.join(',');
    
    // Set icon selection
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === template.icon);
    });
    
    // Set day selection
    updateDayPicker(template.days);
    
    if (template.officeHours) {
        document.getElementById('startTime').value = template.officeHours.start;
        document.getElementById('endTime').value = template.officeHours.end;
    }
    
    handleFrequencyChange();
}

// Reminders CRUD
function createReminder(data) {
    const reminder = {
        id: Date.now(),
        title: data.title,
        icon: data.icon,
        frequency: data.frequency,
        time: data.time,
        days: data.days,
        officeHours: data.officeHours,
        completed: false,
        completedCount: 0,
        history: [],
        createdAt: new Date().toISOString(),
        nextDue: calculateNextDue(data)
    };
    
    state.reminders.push(reminder);
    saveReminders();
    scheduleNotification(reminder);
    renderReminders();
}

function updateReminder(id, data) {
    const index = state.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
        state.reminders[index] = {
            ...state.reminders[index],
            ...data,
            nextDue: calculateNextDue(data)
        };
        saveReminders();
        cancelNotification(id);
        scheduleNotification(state.reminders[index]);
        renderReminders();
    }
}

function deleteReminder(id) {
    if (confirm('Are you sure you want to delete this reminder?')) {
        state.reminders = state.reminders.filter(r => r.id !== id);
        saveReminders();
        cancelNotification(id);
        renderReminders();
    }
}

function toggleComplete(id) {
    const reminder = state.reminders.find(r => r.id === id);
    if (reminder) {
        if (!reminder.completed) {
            // Mark as complete
            const now = new Date().toISOString();
            reminder.completed = true;
            reminder.completedCount++;
            reminder.lastCompleted = now;
            // Add to history
            saveHistory(reminder, now);
            // Calculate next due and unmark as completed
            reminder.nextDue = calculateNextDue(reminder);
            reminder.completed = false; // Auto-unmark for next occurrence
        } else {
            // Undo completion
            reminder.completed = false;
        }
        saveReminders();
        scheduleNotification(reminder);
        renderReminders();
    }
}

// Calculate next due date
function calculateNextDue(reminder) {
    const now = new Date();
    let next = new Date();
    
    // For hourly reminders with office hours
    if (reminder.frequency === 'hourly' && reminder.officeHours) {
        const [startH, startM] = reminder.officeHours.start.split(':');
        const [endH, endM] = reminder.officeHours.end.split(':');
        
        // Start from current hour or next hour
        next = new Date(now);
        if (next.getMinutes() > 0 || next.getSeconds() > 0) {
            next.setHours(next.getHours() + 1);
        }
        next.setMinutes(0, 0, 0);
        
        // Find next valid hour within office hours and valid days
        let attempts = 0;
        while (attempts < 500) { // Safety limit
            const hour = next.getHours();
            const day = next.getDay();
            
            // Check if within office hours and valid day
            if (hour >= parseInt(startH) && hour < parseInt(endH) && 
                reminder.days.includes(day) && next > now) {
                return next.toISOString();
            }
            
            // Move to next hour
            next.setHours(next.getHours() + 1);
            
            // If past end time, move to next day's start time
            if (next.getHours() >= parseInt(endH) || next.getHours() < parseInt(startH)) {
                next.setDate(next.getDate() + 1);
                next.setHours(parseInt(startH), 0, 0, 0);
            }
            
            attempts++;
        }
        return next.toISOString();
    }
    
    // For other frequencies
    const [hours, minutes] = reminder.time.split(':');
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    switch (reminder.frequency) {
        case 'hourly':
            // Regular hourly without office hours
            while (next <= now) {
                next.setHours(next.getHours() + 1);
            }
            break;
            
        case 'daily':
            if (next <= now) next.setDate(next.getDate() + 1);
            // Find next valid day
            while (!reminder.days.includes(next.getDay())) {
                next.setDate(next.getDate() + 1);
            }
            break;
            
        case 'every3days':
            if (next <= now) {
                next.setDate(next.getDate() + 3);
            }
            // Find next valid day
            let daysAdded = 0;
            while (!reminder.days.includes(next.getDay()) && daysAdded < 7) {
                next.setDate(next.getDate() + 1);
                daysAdded++;
            }
            break;
            
        case 'weekly':
            if (next <= now) next.setDate(next.getDate() + 7);
            // Find next valid day
            let weekDaysAdded = 0;
            while (!reminder.days.includes(next.getDay()) && weekDaysAdded < 7) {
                next.setDate(next.getDate() + 1);
                weekDaysAdded++;
            }
            break;
            
        case 'monthly':
            if (next <= now) next.setMonth(next.getMonth() + 1);
            // Find next valid day
            let monthDaysAdded = 0;
            while (!reminder.days.includes(next.getDay()) && monthDaysAdded < 7) {
                next.setDate(next.getDate() + 1);
                monthDaysAdded++;
            }
            break;
    }
    
    return next.toISOString();
}

function isValidDay(date, days) {
    return days.includes(date.getDay());
}

// Render Reminders
function renderReminders() {
    const list = document.getElementById('remindersList');
    const empty = document.getElementById('emptyState');
    
    let filtered = state.reminders;
    if (state.currentFilter === 'active') {
        filtered = filtered.filter(r => !r.completed);
    } else if (state.currentFilter === 'completed') {
        filtered = filtered.filter(r => r.completed);
    }
    
    if (filtered.length === 0) {
        list.style.display = 'none';
        empty.classList.add('visible');
    } else {
        list.style.display = 'flex';
        empty.classList.remove('visible');
        
        list.innerHTML = filtered.map(reminder => {
            const nextDue = new Date(reminder.nextDue);
            const timeUntil = getTimeUntil(nextDue);
            
            return `
                <div class="reminder-card ${reminder.completed ? 'completed' : ''}">
                    <div class="reminder-header">
                        <span class="reminder-icon">${reminder.icon}</span>
                        <div class="reminder-info">
                            <div class="reminder-name">${reminder.title}</div>
                            <div class="reminder-schedule">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 14px; height: 14px;">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                ${getFrequencyText(reminder.frequency)}
                            </div>
                        </div>
                        <div class="reminder-actions">
                            <button class="btn-small" onclick="editReminder(${reminder.id})" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-small" onclick="deleteReminder(${reminder.id})" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="reminder-footer">
                        <div class="reminder-next">Next: ${timeUntil}</div>
                        <div class="reminder-progress">
                            ${reminder.completedCount > 0 ? `<span class="progress-badge">${reminder.completedCount} done</span>` : ''}
                            <button class="btn-small" onclick="toggleComplete(${reminder.id})">
                                ${reminder.completed ? '↩️ Undo' : '✓ Done'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function getTimeUntil(date) {
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return 'Now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} min${minutes > 1 ? 's' : ''}`;
    return 'Now';
}

function getFrequencyText(frequency) {
    const map = {
        'hourly': 'Every hour',
        'daily': 'Every day',
        'every3days': 'Every 3 days',
        'weekly': 'Every week',
        'monthly': 'Every month'
    };
    return map[frequency] || frequency;
}

// Modal
function openModal() {
    document.getElementById('reminderModal').classList.add('active');
    document.getElementById('modalTitle').textContent = state.editingId ? 'Edit Reminder' : 'New Reminder';
    
    // Initialize day picker if creating new reminder
    if (!state.editingId) {
        document.getElementById('selectedDays').value = '0,1,2,3,4,5,6';
        updateDayPicker([0,1,2,3,4,5,6]);
        handleFrequencyChange(); // Ensure proper field visibility
    }
}

function closeModal() {
    document.getElementById('reminderModal').classList.remove('active');
    document.getElementById('reminderForm').reset();
    state.editingId = null;
    document.querySelectorAll('.icon-option')[0].click();
    document.getElementById('selectedDays').value = '0,1,2,3,4,5,6';
    updateDayPicker([0,1,2,3,4,5,6]);
    handleFrequencyChange(); // Reset field visibility
}

function editReminder(id) {
    const reminder = state.reminders.find(r => r.id === id);
    if (reminder) {
        state.editingId = id;
        openModal();
        
        document.getElementById('reminderTitle').value = reminder.title;
        document.getElementById('reminderIcon').value = reminder.icon;
        document.getElementById('reminderFrequency').value = reminder.frequency;
        document.getElementById('reminderTime').value = reminder.time;
        document.getElementById('selectedDays').value = reminder.days.join(',');
        
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.icon === reminder.icon);
        });
        
        updateDayPicker(reminder.days);
        
        if (reminder.officeHours) {
            document.getElementById('startTime').value = reminder.officeHours.start;
            document.getElementById('endTime').value = reminder.officeHours.end;
        }
        
        handleFrequencyChange();
    }
}

// Form Handling
function handleFormSubmit(e) {
    e.preventDefault();
    
    const selectedDaysStr = document.getElementById('selectedDays').value;
    const days = selectedDaysStr ? selectedDaysStr.split(',').map(Number) : [0,1,2,3,4,5,6];
    
    const data = {
        title: document.getElementById('reminderTitle').value,
        icon: document.getElementById('reminderIcon').value,
        frequency: document.getElementById('reminderFrequency').value,
        time: document.getElementById('reminderTime').value,
        days: days,
        officeHours: null
    };
    
    if (data.frequency === 'hourly') {
        data.officeHours = {
            start: document.getElementById('startTime').value,
            end: document.getElementById('endTime').value
        };
    }
    
    if (state.editingId) {
        updateReminder(state.editingId, data);
    } else {
        createReminder(data);
    }
    
    closeModal();
}

function handleFrequencyChange() {
    const frequency = document.getElementById('reminderFrequency').value;
    const officeHoursGroup = document.getElementById('officeHoursGroup');
    const timeGroup = document.getElementById('timeGroup');
    const daysGroup = document.getElementById('daysGroup');
    
    if (frequency === 'hourly') {
        timeGroup.style.display = 'none';
        officeHoursGroup.style.display = 'block';
        daysGroup.style.display = 'block';
    } else {
        timeGroup.style.display = 'block';
        officeHoursGroup.style.display = 'none';
        daysGroup.style.display = 'block';
    }
}

// Day Picker Functions
function updateDayPicker(selectedDays) {
    document.querySelectorAll('.day-option').forEach(btn => {
        const day = parseInt(btn.dataset.day);
        btn.classList.toggle('active', selectedDays.includes(day));
    });
    updateDayPresets(selectedDays);
}

function updateDayPresets(selectedDays) {
    const weekdays = [1,2,3,4,5];
    const weekend = [0,6];
    const everyday = [0,1,2,3,4,5,6];
    
    document.querySelectorAll('.day-preset').forEach(btn => {
        btn.classList.remove('active');
        const preset = btn.dataset.preset;
        
        if (preset === 'weekdays' && arraysEqual(selectedDays, weekdays)) {
            btn.classList.add('active');
        } else if (preset === 'weekend' && arraysEqual(selectedDays, weekend)) {
            btn.classList.add('active');
        } else if (preset === 'everyday' && arraysEqual(selectedDays, everyday)) {
            btn.classList.add('active');
        }
    });
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
}

// History Functions
function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    const content = document.getElementById('historyContent');
    const history = getHistory();
    
    if (history.length === 0) {
        content.innerHTML = '<div class="empty-state visible"><p>No history yet</p></div>';
    } else {
        content.innerHTML = history.map(item => {
            const date = new Date(item.completedAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="history-item">
                    <span class="history-icon">${item.icon}</span>
                    <div class="history-info">
                        <div class="history-title">${item.title}</div>
                        <div class="history-date">${dateStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

// Event Listeners
function setupEventListeners() {
    // Add button
    document.getElementById('addBtn').addEventListener('click', openModal);
    
    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Modal backdrop
    document.getElementById('reminderModal').addEventListener('click', (e) => {
        if (e.target.id === 'reminderModal') closeModal();
    });
    
    // Form submit
    document.getElementById('reminderForm').addEventListener('submit', handleFormSubmit);
    
    // Icon picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('reminderIcon').value = btn.dataset.icon;
        });
    });
    
    // Frequency change
    document.getElementById('reminderFrequency').addEventListener('change', handleFrequencyChange);
    
    // Day picker
    document.querySelectorAll('.day-option').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const selectedDays = Array.from(document.querySelectorAll('.day-option.active'))
                .map(b => parseInt(b.dataset.day))
                .sort();
            document.getElementById('selectedDays').value = selectedDays.join(',');
            updateDayPresets(selectedDays);
        });
    });
    
    // Day presets
    document.querySelectorAll('.day-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            let days = [];
            
            if (preset === 'everyday') {
                days = [0,1,2,3,4,5,6];
            } else if (preset === 'weekdays') {
                days = [1,2,3,4,5];
            } else if (preset === 'weekend') {
                days = [0,6];
            }
            
            document.getElementById('selectedDays').value = days.join(',');
            updateDayPicker(days);
        });
    });
    
    // History modal
    document.getElementById('closeHistoryModal')?.addEventListener('click', closeHistoryModal);
    document.getElementById('historyModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'historyModal') closeHistoryModal();
    });
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentFilter = tab.dataset.filter;
            renderReminders();
        });
    });
    
    // Notification permission
    document.getElementById('enableNotifications')?.addEventListener('click', requestNotificationPermission);
}

// Notifications
function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        document.getElementById('notificationBanner').style.display = 'block';
    }
}

async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            document.getElementById('notificationBanner').style.display = 'none';
            scheduleAllNotifications();
        }
    }
}

function scheduleNotification(reminder) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Cancel any existing notification
        cancelNotification(reminder.id);
        
        // Schedule new notification
        const nextDue = new Date(reminder.nextDue);
        const now = new Date();
        const delay = nextDue - now;
        
        if (delay > 0 && delay < 2147483647) { // Max setTimeout value
            const timeoutId = setTimeout(() => {
                showNotification(reminder);
            }, delay);
            
            // Store timeout ID
            if (!window.notificationTimeouts) window.notificationTimeouts = {};
            window.notificationTimeouts[reminder.id] = timeoutId;
        }
    }
}

function cancelNotification(id) {
    if (window.notificationTimeouts && window.notificationTimeouts[id]) {
        clearTimeout(window.notificationTimeouts[id]);
        delete window.notificationTimeouts[id];
    }
}

function showNotification(reminder) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(reminder.title, {
            body: `Time for: ${reminder.title}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `reminder-${reminder.id}`,
            requireInteraction: true,
            silent: false
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Reschedule next notification
        const index = state.reminders.findIndex(r => r.id === reminder.id);
        if (index !== -1) {
            state.reminders[index].nextDue = calculateNextDue(reminder);
            saveReminders();
            scheduleNotification(state.reminders[index]);
            renderReminders();
        }
    }
}

function scheduleAllNotifications() {
    state.reminders.forEach(reminder => {
        if (!reminder.completed) {
            scheduleNotification(reminder);
        }
    });
}

// Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);

// Refresh notifications when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        renderReminders();
        scheduleAllNotifications();
    }
});
