// ========== APP STATE ==========
const state = {
    songs: [],
    currentFilter: 'Все',
    isLoading: true
};

// ========== DOM ELEMENTS ==========
const elements = {
    stats: document.getElementById('stats'),
    searchInput: document.getElementById('searchInput'),
    filters: document.getElementById('filters'),
    songsContainer: document.getElementById('songsContainer'),
    scrollTop: document.getElementById('scrollTop'),
    toast: document.getElementById('toast')
};

// ========== UTILITIES ==========
const utils = {
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, (m) => {
            const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
            return escapes[m];
        });
    },

    showToast(message = 'Код скопирован!') {
        elements.toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 2000);
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast();
        }).catch(() => {
            this.showToast('Ошибка копирования');
        });
    },

    debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
};

// ========== RENDER FUNCTIONS ==========
const render = {
    stats() {
        const count = state.songs.length;
        elements.stats.innerHTML = `<i class="fas fa-database"></i> ${count} треков | <i class="far fa-calendar-alt"></i> Обновлено: 21.11.25`;
    },

    filters() {
        const categories = ['Все', 'Песни', 'Просто песни', 'Разное', 'Звуки'];
        const html = categories.map(cat => `
            <button class="filter-btn ${state.currentFilter === cat ? 'active' : ''}" data-filter="${cat}">
                ${cat === 'Все' ? '<i class="fas fa-th-large"></i>' : ''} ${cat}
            </button>
        `).join('');
        
        elements.filters.innerHTML = html;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentFilter = btn.dataset.filter;
                render.filters();
                render.songs();
            });
        });
    },

    songs() {
        const searchTerm = elements.searchInput.value.toLowerCase();
        const categories = ['Песни', 'Просто песни', 'Разное', 'Звуки'];
        let hasResults = false;
        let html = '';
        
        for (const category of categories) {
            if (state.currentFilter !== 'Все' && state.currentFilter !== category) continue;
            
            let songsInCategory = state.songs.filter(s => s.category === category);
            
            if (searchTerm) {
                songsInCategory = songsInCategory.filter(s => 
                    s.name.toLowerCase().includes(searchTerm) || 
                    s.code.includes(searchTerm)
                );
            }
            
            if (songsInCategory.length === 0) continue;
            hasResults = true;
            
            const categoryIcons = {
                'Песни': '🎵',
                'Просто песни': '🎹',
                'Разное': '📦',
                'Звуки': '🔊'
            };
            
            html += `
                <div class="category-section">
                    <h2 class="category-title"><i class="fas ${categoryIcons[category] === '🎵' ? 'fa-music' : categoryIcons[category] === '🎹' ? 'fa-piano' : categoryIcons[category] === '📦' ? 'fa-box' : 'fa-volume-up'}"></i> ${category}</h2>
                    <div class="songs-grid">
                        ${songsInCategory.map(song => `
                            <div class="song-card" data-code="${song.code}">
                                <div class="song-info">
                                    <div class="song-name">${utils.escapeHtml(song.name)}</div>
                                    <div class="song-code"><i class="fas fa-hashtag"></i> ${song.code}</div>
                                </div>
                                <button class="copy-btn" data-code="${song.code}"><i class="fas fa-copy"></i> Копировать</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        elements.songsContainer.innerHTML = hasResults 
            ? html 
            : '<div class="no-results"><i class="fas fa-search"></i> Ничего не найдено. Попробуй другой запрос.</div>';
        
        document.querySelectorAll('.song-card').forEach(card => {
            card.addEventListener('click', () => {
                const code = card.dataset.code;
                if (code) utils.copyToClipboard(code);
            });
        });
        
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                if (code) utils.copyToClipboard(code);
            });
        });
    },

    loading(show = true) {
        if (show) {
            elements.songsContainer.innerHTML = '<div class="loading"><i class="fas fa-compact-disc fa-spin"></i> Загрузка песен...</div>';
            elements.searchInput.disabled = true;
        } else {
            elements.searchInput.disabled = false;
        }
    },

    error(message) {
        elements.songsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i><br>
                Ошибка загрузки данных<br>
                <small>${message}</small><br><br>
                <i class="fas fa-sync-alt"></i> Обнови страницу или проверь файл data/songs.json
            </div>
        `;
        elements.stats.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ошибка загрузки';
    }
};

// ========== DATA LOADING ==========
async function loadSongs() {
    try {
        render.loading(true);
        const response = await fetch('data/songs.json');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (!data.songs || !Array.isArray(data.songs)) {
            throw new Error('Неверный формат данных');
        }
        
        state.songs = data.songs;
        state.isLoading = false;
        
        render.stats();
        render.filters();
        render.songs();
        render.loading(false);
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        render.error(error.message);
        state.isLoading = false;
    }
}

// ========== EVENT HANDLERS ==========
function initEventListeners() {
    const debouncedRender = utils.debounce(() => render.songs(), 300);
    elements.searchInput.addEventListener('input', debouncedRender);
    
    window.addEventListener('scroll', () => {
        const show = window.scrollY > 300;
        elements.scrollTop.classList.toggle('show', show);
    });
    
    elements.scrollTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== INITIALIZATION ==========
function init() {
    initEventListeners();
    loadSongs();
}

init();
