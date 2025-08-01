// ===== MINDUMP - CLEAN & FUNCTIONAL =====

class MindDump {
    constructor() {
        this.thoughts = JSON.parse(localStorage.getItem('mindDumpThoughts')) || [];
        this.timer = null;
        this.timerDuration = 25 * 60; // 25 minutes
        this.currentTime = this.timerDuration;
        this.isZenMode = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderAllThoughts();
        this.updateStats();
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        const dumpInput = document.getElementById('dump-input');
        const dumpBtn = document.getElementById('dump-btn');
        const categoryPreview = document.getElementById('category-preview');
        dumpBtn.addEventListener('click', () => this.dumpThought());
        dumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.dumpThought();
            }
        });
        dumpInput.addEventListener('input', () => {
            this.updateInputStats();
            // Live category preview as you type
            if (categoryPreview) {
                const text = dumpInput.value;
                const category = this.categorizeThought(text);
                categoryPreview.textContent = text.trim()
                    ? `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`
                    : '';
            }
        });
        document.getElementById('focus-timer')?.addEventListener('click', () => this.startFocusTimer());
        document.getElementById('brain-melt')?.addEventListener('click', () => this.startBrainMelt());
        document.getElementById('zen-mode')?.addEventListener('click', () => this.toggleZenMode());
        document.getElementById('voice-dump')?.addEventListener('click', () => this.toggleVoiceDump());
        document.getElementById('timer-stop')?.addEventListener('click', () => this.stopTimer());
        document.getElementById('zen-close')?.addEventListener('click', () => this.toggleZenMode());
        document.getElementById('clear-all')?.addEventListener('click', () => this.clearAll());
        document.getElementById('save-session')?.addEventListener('click', () => this.saveSession());
        document.getElementById('export-data')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('board-mode')?.addEventListener('click', () => this.toggleBoardMode());
        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.addEventListener('click', () => this.usePrompt(btn.textContent));
        });
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.parentElement;
                category.classList.toggle('expanded');
            });
        });
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', () => this.exportData(btn.dataset.format));
        });
        document.getElementById('categories-view-btn')?.addEventListener('click', () => this.showCategoriesView());
        document.getElementById('dump-view-btn')?.addEventListener('click', () => this.showDumpView());
        document.getElementById('back-to-dump')?.addEventListener('click', () => this.showDumpView());
    }

    // ===== THOUGHT MANAGEMENT =====
    dumpThought() {
        const input = document.getElementById('dump-input');
        const text = input.value.trim();
        
        if (!text) return;

        const thought = {
            id: Date.now() + Math.random(),
            content: text,
            timestamp: new Date(),
            category: this.categorizeThought(text),
            tags: this.extractTags(text)
        };

        this.thoughts.push(thought);
        this.saveToStorage();
        this.renderThought(thought);
        this.updateStats();
        
        // Clear input
        input.value = '';
        this.updateInputStats();
        
        // Show success feedback
        this.showNotification('Thought dumped! 🧠', 'success');
        // Update category preview
        const categoryPreview = document.getElementById('category-preview');
        if (categoryPreview) categoryPreview.textContent = '';
    }

    categorizeThought(text) {
        const lower = text.toLowerCase();
        if (/https?:\/\/|www\./i.test(text)) return 'links';
        if (/#todo|!urgent|❗/i.test(text)) return 'todos';
        if (/#idea|💡/i.test(text)) return 'ideas';
        if (/@reminder|📅/i.test(text)) return 'reminders';
        if (/#question|❓/i.test(text)) return 'questions';
        if (/~quote|^"|^'.*'|^“|^”/i.test(text.trim()) || /".*"|“.*”/.test(text)) return 'quotes';
        if (/\b(todo|task|need to|should|must|deadline|due|fix|complete|finish|buy|call|email|send|schedule|appointment|meeting|follow up|remind me|asap|soon|today|tomorrow|next week)\b/i.test(lower)) return 'todos';
        if (/\b(idea|concept|maybe|could|innovation|brainstorm|suggestion|imagine|what if|invention|improve|solution|plan|proposal|experiment|try|explore)\b/i.test(lower)) return 'ideas';
        if (/\?$/.test(text.trim()) || /^(why|how|what|when|where|who|can|should|could|would|is|are|do|does|did|will|may|might)\b/i.test(lower)) return 'questions';
        if (/\b(remember|remind|don't forget|note to self|due date|deadline|alert|alarm|set a reminder|calendar|event|birthday|anniversary|meeting|appointment|schedule|plan|task for)\b/i.test(lower)) return 'reminders';
        if (/\b(said|quote|mentioned|according to|as per|once said|famous|proverb|saying|wisdom|in the words of|noted|remarked|wrote|stated|quoted)\b/i.test(lower)) return 'quotes';
        return 'uncategorized';
    }

    extractTags(text) {
        const tags = [];
        const tagRegex = /#(\w+)/g;
        let match;
        while ((match = tagRegex.exec(text)) !== null) {
            tags.push(match[1]);
        }
        return tags;
    }

    renderThought(thought) {
        const category = thought.category;
        const container = document.getElementById(`${category}-content`);
        if (!container) return;
        const thoughtElement = document.createElement('div');
        thoughtElement.className = `thought-item ${thought.category}`;
        thoughtElement.dataset.thoughtId = thought.id;
        thoughtElement.innerHTML = `
            <div class="content" tabindex="0">${this.formatContent(thought.content)}</div>
            <div class="meta">
                <span class="timestamp">${this.formatTime(thought.timestamp)}</span>
                <div class="actions">
                    <button class="action-btn edit-btn" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn" onclick="mindDump.deleteThought('${thought.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        // Edit button event
        thoughtElement.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editThought(thought, thoughtElement);
        });
        // Double-click to edit on the whole thought bar (except action buttons)
        thoughtElement.addEventListener('dblclick', (e) => {
            if (e.target.closest('.action-btn')) return;
            this.editThought(thought, thoughtElement);
        });
        container.appendChild(thoughtElement);
        this.updateCategoryCount(category);
        const categoryElement = container.closest('.category');
        if (categoryElement) {
            categoryElement.classList.add('has-content');
            categoryElement.classList.add('expanded');
        }
    }

    editThought(thought, thoughtElement) {
        const contentDiv = thoughtElement.querySelector('.content');
        const original = thought.content;
        // Create an input for editing
        const input = document.createElement('textarea');
        input.value = original;
        input.style.width = '100%';
        input.style.minHeight = '40px';
        input.style.fontSize = '1em';
        input.style.fontFamily = 'inherit';
        contentDiv.replaceWith(input);
        input.focus();

        // Save on blur or Enter
        const save = () => {
            const newText = input.value.trim();
            if (newText && newText !== original) {
                thought.content = newText;
                thought.category = this.categorizeThought(newText);
                this.saveToStorage();
                this.renderAllThoughts();
                this.updateStats();
            } else {
                // Restore original if unchanged or empty
                this.renderAllThoughts();
            }
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                this.renderAllThoughts();
            }
        });
    }

    formatContent(content) {
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        content = content.replace(/#(\w+)/g, '<span style="color: var(--primary); font-weight: 500;">#$1</span>');
        content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return content;
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return time.toLocaleDateString();
    }

    renderAllThoughts() {
        document.querySelectorAll('.category-content').forEach(container => {
            container.innerHTML = '';
        });
        this.thoughts.forEach(thought => this.renderThought(thought));
    }

    updateCategoryCount(category) {
        const count = this.thoughts.filter(t => t.category === category).length;
        const countElement = document.querySelector(`[data-category="${category}"] .count`);
        const categoryElement = document.querySelector(`[data-category="${category}"]`);
        if (countElement) {
            countElement.textContent = count;
        }
        if (categoryElement) {
            if (count > 0) {
                categoryElement.classList.add('has-content');
            } else {
                categoryElement.classList.remove('has-content');
            }
        }
    }

    updateStats() {
        const totalThoughts = this.thoughts.length;
        const totalWords = this.thoughts.reduce((sum, thought) => 
            sum + thought.content.split(/\s+/).length, 0);
        document.getElementById('thought-count').textContent = `${totalThoughts} thoughts`;
        document.getElementById('word-count').textContent = `${totalWords} words`;
        ['todos', 'ideas', 'rants', 'links', 'quotes', 'questions', 'reminders', 'uncategorized']
            .forEach(category => this.updateCategoryCount(category));
        this.updateTotalCount();
    }

    updateInputStats() {
        const input = document.getElementById('dump-input');
        const text = input.value;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        // You can add live word count display here if needed
    }

    deleteThought(id) {
        // Find and remove the thought
        const idx = this.thoughts.findIndex(t => String(t.id) === String(id));
        if (idx === -1) return;
        const deletedThought = this.thoughts[idx];
        this.thoughts.splice(idx, 1);
        this.saveToStorage();
        this.renderAllThoughts();
        this.updateStats();
        this.showUndoNotification(deletedThought);
    }

    showUndoNotification(deletedThought) {
        // Remove any existing undo toast
        document.querySelectorAll('.toast-undo').forEach(el => el.remove());
        // Create toast with undo button
        const toast = document.createElement('div');
        toast.className = 'toast toast-info toast-undo';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1em;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = 'Thought deleted';
        const undoBtn = document.createElement('button');
        undoBtn.textContent = 'Undo';
        undoBtn.style.cssText = `
            background: white;
            color: var(--primary);
            border: none;
            border-radius: 6px;
            padding: 4px 14px;
            font-weight: 600;
            margin-left: 12px;
            cursor: pointer;
            font-size: 1em;
        `;
        undoBtn.onclick = () => {
            this.thoughts.push(deletedThought);
            this.saveToStorage();
            this.renderAllThoughts();
            this.updateStats();
            toast.remove();
            this.showNotification('Undo successful!', 'success');
        };
        toast.appendChild(undoBtn);
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    saveToStorage() {
        localStorage.setItem('mindDumpThoughts', JSON.stringify(this.thoughts));
    }

    // ===== TIMER FUNCTIONALITY =====
    startFocusTimer() {
        const display = document.getElementById('timer-display');
        if (this.timer) {
            this.stopTimer();
            return;
        }
        this.currentTime = this.timerDuration;
        display.classList.add('active');
        this.timer = setInterval(() => {
            this.currentTime--;
            this.updateTimerDisplay();
            if (this.currentTime <= 0) {
                this.timerComplete();
            }
        }, 1000);
        this.showNotification('Focus timer started! 🎯', 'success');
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const display = document.getElementById('timer-text');
        if (display) {
            display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const display = document.getElementById('timer-display');
        display.classList.remove('active');
        this.currentTime = this.timerDuration;
        this.updateTimerDisplay();
    }

    timerComplete() {
        this.stopTimer();
        this.showNotification('Focus session complete! 🎉', 'success');
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('MindDump', {
                body: 'Focus session complete!',
                icon: '/favicon.ico'
            });
        }
    }

    // ===== UTILITY FUNCTIONS =====
    usePrompt(promptText) {
        const input = document.getElementById('dump-input');
        input.value = promptText + '\n\n';
        input.focus();
        // Update category preview
        const categoryPreview = document.getElementById('category-preview');
        if (categoryPreview) {
            const category = this.categorizeThought(promptText);
            categoryPreview.textContent = promptText.trim()
                ? `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`
                : '';
        }
    }

    toggleZenMode() {
        const overlay = document.getElementById('zen-overlay');
        overlay.classList.toggle('active');
        this.isZenMode = !this.isZenMode;
        if (this.isZenMode) {
            this.showNotification('Zen mode activated 🧘', 'info');
            // Optionally play audio
            const audio = document.getElementById('zen-audio');
            if (audio) audio.play();
        } else {
            const audio = document.getElementById('zen-audio');
            if (audio) audio.pause();
        }
    }

    clearAll() {
        if (!confirm('Clear all thoughts? This cannot be undone.')) return;
        this.thoughts = [];
        this.saveToStorage();
        this.renderAllThoughts();
        this.updateStats();
        this.showNotification('All thoughts cleared', 'info');
    }

    saveSession() {
        const data = {
            thoughts: this.thoughts,
            timestamp: new Date()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minddump-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Session saved! 💾', 'success');
    }

    showExportModal() {
        const modal = document.getElementById('export-modal');
        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('export-modal');
        modal.classList.remove('active');
    }

    exportData(format) {
        let content = '';
        let filename = `minddump-${new Date().toISOString().split('T')[0]}`;
        switch(format) {
            case 'json':
                content = JSON.stringify(this.thoughts, null, 2);
                filename += '.json';
                break;
            case 'markdown':
                content = this.generateMarkdown();
                filename += '.md';
                break;
            case 'txt':
                content = this.generatePlainText();
                filename += '.txt';
                break;
        }
        const blob = new Blob([content], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.closeModal();
        this.showNotification(`Exported as ${format.toUpperCase()}! 📄`, 'success');
    }

    generateMarkdown() {
        let md = '# MindDump Export\n\n';
        const categories = ['todos', 'ideas', 'questions', 'reminders', 'quotes', 'rants', 'links', 'uncategorized'];
        categories.forEach(cat => {
            const thoughts = this.thoughts.filter(t => t.category === cat);
            if (thoughts.length > 0) {
                md += `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;
                thoughts.forEach(thought => {
                    md += `- ${thought.content}\n  *${this.formatTime(thought.timestamp)}*\n\n`;
                });
            }
        });
        return md;
    }

    generatePlainText() {
        let text = 'MINDDUMP EXPORT\n' + '='.repeat(50) + '\n\n';
        this.thoughts.forEach(thought => {
            text += `[${thought.category.toUpperCase()}] ${thought.content}\n`;
            text += `Time: ${this.formatTime(thought.timestamp)}\n\n`;
        });
        return text;
    }

    toggleBoardMode() {
        this.showNotification('Board mode coming soon! 📋', 'info');
    }

    startBrainMelt() {
        this.showNotification('Brain melt mode activated! 🧠🔥', 'info');
    }

    toggleVoiceDump() {
        this.showNotification('Voice dump feature coming soon! 🎤', 'info');
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== VIEW SWITCHING =====
    showCategoriesView() {
        document.querySelector('.container').style.display = 'none';
        document.getElementById('categories-page').style.display = 'block';
        document.getElementById('dump-view-btn')?.classList.remove('active');
        document.getElementById('categories-view-btn')?.classList.add('active');
    }

    showDumpView() {
        document.querySelector('.container').style.display = 'block';
        document.getElementById('categories-page').style.display = 'none';
        document.getElementById('categories-view-btn')?.classList.remove('active');
        document.getElementById('dump-view-btn')?.classList.add('active');
    }

    updateTotalCount() {
        const totalCount = this.thoughts.length;
        const totalCountElement = document.getElementById('total-count');
        if (totalCountElement) {
            totalCountElement.textContent = totalCount;
        }
    }
}

// ===== INITIALIZE =====
let mindDump;
document.addEventListener('DOMContentLoaded', () => {
    mindDump = new MindDump();
    window.mindDump = mindDump; // Expose globally for inline onclick
});

// Add toast animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== LIGHT/DARK TOGGLE =====
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('light-dark-toggle');
    if (!toggleBtn) return;
    function updateIcon(theme) {
        toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    let theme = localStorage.getItem('mindDumpTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateIcon(theme);
    toggleBtn.addEventListener('click', () => {
        theme = (theme === 'light') ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mindDumpTheme', theme);
        updateIcon(theme);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // ===== ADD CATEGORY BUTTON POPUP =====
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            mindDump?.showNotification('Add category coming soon! 🗂️', 'info');
        });
    }
});
