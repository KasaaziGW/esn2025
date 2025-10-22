document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const loadMore = document.getElementById('loadMore');
    const noResults = document.getElementById('noResults');
    const currentContext = document.getElementById('currentContext');
    const searchHint = document.getElementById('searchHint');
    const tabButtons = document.querySelectorAll('.tab-button');

    let currentSearchContext = 'citizens';
    let currentPage = 1;
    const resultsPerPage = 10;

    // Context-specific placeholders and hints
    const contextConfig = {
        'citizens': {
            placeholder: 'Enter a username or part of a username',
            hint: 'Search by username to find citizens'
        },
        'status': {
            placeholder: 'Enter status (OK, Help, Emergency)',
            hint: 'Search citizens by their current status'
        },
        'public-messages': {
            placeholder: 'Enter words to search in public messages',
            hint: 'Search through public chat messages'
        },
        'private-messages': {
            placeholder: 'Enter words to search in private messages',
            hint: 'Search through your private messages'
        }
    };

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentSearchContext = button.dataset.context;
            currentContext.textContent = button.textContent;
            searchInput.placeholder = contextConfig[currentSearchContext].placeholder;
            searchHint.textContent = contextConfig[currentSearchContext].hint;
            searchInput.value = '';
            clearResults();
        });
    });

    // Search form submission
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        currentPage = 1;
        await performSearch();
    });

    // Load more results
    loadMore.addEventListener('click', async () => {
        currentPage++;
        await performSearch(true);
    });

        // Cancel search button
        let cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelBtn.className = 'search-button search-cancel-button';
        cancelBtn.style.marginTop = '1rem';
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = function() {
            clearResults();
            searchInput.value = '';
            cancelBtn.style.display = 'none';
        };
        searchResults.parentNode.insertBefore(cancelBtn, searchResults.nextSibling);

    async function performSearch(append = false) {
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) return;

        try {
            const response = await fetch(`/api/search?context=${currentSearchContext}&term=${encodeURIComponent(searchTerm)}&page=${currentPage}`);
            const data = await response.json();

            if (!append) {
                clearResults();
            }

            if (data.results.length === 0 && currentPage === 1) {
                    showNoResults();
                    cancelBtn.style.display = 'block';
                    return;
            }

            renderResults(data.results, append);
            loadMore.style.display = data.hasMore ? 'block' : 'none';
            noResults.style.display = 'none';
                cancelBtn.style.display = 'block';

        } catch (error) {
                showNoResults('An error occurred while searching. Please try again later.');
                cancelBtn.style.display = 'block';
        }
    }

    function renderResults(results, append) {
        const container = append ? searchResults : document.createElement('div');
        
        results.forEach(result => {
            const resultElement = createResultElement(result);
            if (append) {
                searchResults.appendChild(resultElement);
            } else {
                container.appendChild(resultElement);
            }
        });

        if (!append) {
            searchResults.innerHTML = '';
            searchResults.appendChild(container);
        }
    }

    function createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'result-card';

        switch (currentSearchContext) {
            case 'citizens':
            case 'status':
                div.className += ' citizen-result';
                div.innerHTML = `
                    <div class="citizen-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="citizen-info">
                        <h4 class="citizen-name">${result.fullname}</h4>
                        <div class="citizen-status">
                            <span class="status-indicator status-${result.status.toLowerCase()}"></span>
                            <span>${result.status}</span>
                            <span style="margin-left: auto">${result.online ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                `;
                break;

            case 'public-messages':
            case 'private-messages':
                div.className += ' message-result';
                div.innerHTML = `
                    <div class="message-header">
                        <span>${result.sender}</span>
                        <span>${result.sentTime}</span>
                    </div>
                    <div class="message-content">${result.message}</div>
                `;
                break;
        }

        return div;
    }

    function clearResults() {
        searchResults.innerHTML = '';
        loadMore.style.display = 'none';
        noResults.style.display = 'none';
    }

    function showNoResults() {
        searchResults.innerHTML = '';
        loadMore.style.display = 'none';
        noResults.style.display = 'block';
        noResults.querySelector('p').textContent = 'No results found';
    }

    // Overload for custom message
    function showNoResults(msg) {
        searchResults.innerHTML = '';
        loadMore.style.display = 'none';
        noResults.style.display = 'block';
        noResults.querySelector('p').textContent = msg || 'No results found';
    }

    function showError() {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>An error occurred while searching</p>
                <small>Please try again later</small>
            </div>
        `;
        loadMore.style.display = 'none';
    }
});