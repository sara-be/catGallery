// Check if running on localhost
if (window.location.protocol === 'file:') {
    alert("Please open this app using the local server URL: http://localhost:5000\nThe backend API will not work when opening the file directly.");
}

const container = document.getElementById('cats-container');
const searchInput = document.getElementById('search');
const tagFilter = document.getElementById('tag-filter');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageNumbersContainer = document.getElementById('page-numbers');

// Auth elements
const loginNavBtn = document.getElementById('login-nav-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const authModal = document.getElementById('auth-modal');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const addBtn = document.getElementById('add-btn');
const viewAdoptedBtn = document.getElementById('view-adopted-btn');
const adoptedModal = document.getElementById('adopted-modal');
const closeAdoptedBtn = document.getElementById('close-adopted-btn');
const adoptedCatsContainer = document.getElementById('adopted-cats-container');
const noAdoptionsMsg = document.getElementById('no-adoptions-msg');

let globalCats = [];
let filteredCats = [];
let currentPage = 1;
const itemsPerPage = 9;
let isAuthenticated = false;

async function checkAuthStatus() {
    try {
        const response = await fetch('/check-auth');
        const data = await response.json();
        isAuthenticated = data.authenticated;
        updateAuthUI(data.username);
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateAuthUI(username) {
    if (isAuthenticated) {
        loginNavBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        usernameDisplay.textContent = username;
        addBtn.classList.remove('hidden');
        viewAdoptedBtn.classList.remove('hidden');
    } else {
        loginNavBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        addBtn.classList.add('hidden');
        viewAdoptedBtn.classList.add('hidden');
    }
    renderGallery(); // Re-render to show/hide edit/delete buttons
}

async function fetchCats() {
    try {
        const response = await fetch('/cats');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        globalCats = await response.json();
        console.log(`Successfully fetched ${globalCats.length} cats from Supabase.`);
        populateTagFilter();
        applyFilters();
    } catch (error) {
        console.error('Error fetching cats:', error);
        container.innerHTML = '<p class="text-red-500 text-center col-span-full font-medium">Failed to load cats. Please try again later.</p>';
    }
}

function populateTagFilter() {
    const tags = new Set();
    globalCats.forEach(cat => { if(cat.tag) tags.add(cat.tag); });
    tagFilter.innerHTML = '<option value="all">All Tags</option>';
    [...tags].sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const activeTag = tagFilter.value;
    filteredCats = globalCats.filter(cat => {
        const matchesSearch = (cat.tag && cat.tag.toLowerCase().includes(searchTerm)) ||
                            (cat.description && cat.description.toLowerCase().includes(searchTerm));
        const matchesTag = activeTag === 'all' || cat.tag === activeTag;
        return matchesSearch && matchesTag;
    });
    currentPage = 1;
    renderGallery();
}

function renderGallery() {
    container.innerHTML = '';
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagedCats = filteredCats.slice(startIndex, endIndex);

    if (pagedCats.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center col-span-full py-40 text-xl font-medium">No felines found matching your criteria.</p>';
        updatePagination();
        return;
    }

    pagedCats.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2';

        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'relative h-72 overflow-hidden';
        const img = document.createElement('img');
        img.className = 'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110';
        img.src = cat.img;
        img.alt = cat.tag || 'Cat';
        imgWrapper.appendChild(img);
        
        const content = document.createElement('div');
        content.className = 'p-8 flex flex-col h-[calc(100%-18rem)]';
        const title = document.createElement('h2');
        title.className = 'text-2xl font-black text-slate-900 mb-3 capitalize tracking-tight';
        title.innerText = cat.tag || 'Unknown Cat';
        const description = document.createElement('p');
        description.className = 'text-slate-500 text-sm leading-relaxed mb-8 line-clamp-3 font-medium';
        description.innerText = cat.description || 'Information pending for this magnificent feline.';

        content.append(title, description);

        if (isAuthenticated) {
            const actions = document.createElement('div');
            actions.className = 'flex gap-3 mt-auto';
            const editBtn = document.createElement('button');
            editBtn.className = 'flex-grow inline-flex items-center justify-center px-4 py-3 bg-slate-50 text-slate-900 text-sm font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm';
            editBtn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>Edit`;
            editBtn.onclick = () => openEditModal(cat);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'inline-flex items-center justify-center px-4 py-3 bg-red-50 text-red-600 text-sm font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm';
            deleteBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m3 4h.01"></path></svg>`;
            deleteBtn.onclick = () => openDeleteModal(cat);
            
            const adoptBtn = document.createElement('button');
            adoptBtn.className = 'flex-grow inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-700 transition-all duration-300 shadow-md transform active:scale-95';
            adoptBtn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>Adopt`;
            adoptBtn.onclick = () => adoptCat(cat.id);

            actions.append(editBtn, deleteBtn);
            const actionContainer = document.createElement('div');
            actionContainer.className = 'flex flex-col gap-3 mt-auto';
            actionContainer.append(actions, adoptBtn);
            content.append(actionContainer);
        }

        card.append(imgWrapper, content);
        container.appendChild(card);
    });
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredCats.length / itemsPerPage);
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    pageNumbersContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.className = `w-12 h-12 flex items-center justify-center rounded-xl font-bold transition-all shadow-sm ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'}`;
        pageBtn.onclick = () => { currentPage = i; renderGallery(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
        pageNumbersContainer.appendChild(pageBtn);
    }
}

// ==========================================
// AUTH LOGIC
// ==========================================
loginNavBtn.onclick = () => {
    authModal.classList.remove('hidden');
    loginFormContainer.classList.remove('hidden');
    signupFormContainer.classList.add('hidden');
    toggleBodyScroll(true);
};

document.getElementById('switch-to-signup').onclick = () => {
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.remove('hidden');
};

document.getElementById('switch-to-login').onclick = () => {
    signupFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
};

const closeAuthModal = () => {
    authModal.classList.add('hidden');
    toggleBodyScroll(false);
};

document.getElementById('auth-cancel-btn').onclick = closeAuthModal;
document.getElementById('auth-signup-cancel-btn').onclick = closeAuthModal;

document.getElementById('login-submit-btn').onclick = async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            isAuthenticated = true;
            updateAuthUI(data.username);
            closeAuthModal();
        } else {
            alert(data.error || "Login failed");
        }
    } catch (err) { console.error(err); }
};

document.getElementById('signup-submit-btn').onclick = async () => {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
        const res = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            console.log('Signup successful! Please log in.');
            document.getElementById('switch-to-login').click();
        } else {
            alert(data.error || "Signup failed");
        }
    } catch (err) { console.error(err); }
};

logoutBtn.onclick = async () => {
    try {
        await fetch('/logout', { method: 'POST' });
        isAuthenticated = false;
        updateAuthUI();
    } catch (err) { console.error(err); }
};

// ==========================================
// CAT MODALS
// ==========================================
const toggleBodyScroll = (disable) => { document.body.style.overflow = disable ? 'hidden' : ''; };
const editModal = document.getElementById('edit-modal');

function openEditModal(cat) {
    document.getElementById('edit-id').value = cat.id;
    document.getElementById('edit-tag').value = cat.tag || '';
    document.getElementById('edit-img').value = cat.img || '';
    document.getElementById('edit-description').value = cat.description || '';
    editModal.classList.remove('hidden');
    toggleBodyScroll(true);
}

document.getElementById('cancel-btn').onclick = () => { editModal.classList.add('hidden'); toggleBodyScroll(false); };

document.getElementById('save-btn').onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const tag = document.getElementById('edit-tag').value;
    const img = document.getElementById('edit-img').value;
    const description = document.getElementById('edit-description').value;
    try {
        const res = await fetch(`/cats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag, img, description })
        });
        if (res.ok) { editModal.classList.add('hidden'); toggleBodyScroll(false); fetchCats(); }
        else if (res.status === 401) { alert('Session expired. Please log in.'); isAuthenticated = false; updateAuthUI(); }
        else { alert('Failed to update cat'); }
    } catch (error) { console.error(error); }
};

const addModal = document.getElementById('add-modal');
addBtn.onclick = () => {
    document.getElementById('add-tag').value = '';
    document.getElementById('add-img').value = '';
    document.getElementById('add-description').value = '';
    addModal.classList.remove('hidden');
    toggleBodyScroll(true);
};

document.getElementById('add-cancel-btn').onclick = () => { addModal.classList.add('hidden'); toggleBodyScroll(false); };

document.getElementById('add-save-btn').onclick = async () => {
    const id = Date.now().toString();
    const tag = document.getElementById('add-tag').value;
    const img = document.getElementById('add-img').value;
    const description = document.getElementById('add-description').value;
    try {
        const res = await fetch('/cats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tag, img, description })
        });
        if (res.ok) { addModal.classList.add('hidden'); toggleBodyScroll(false); fetchCats(); }
        else if (res.status === 401) { alert('Session expired. Please log in.'); isAuthenticated = false; updateAuthUI(); }
        else { alert('Failed to add cat'); }
    } catch (error) { console.error(error); }
};

const deleteModal = document.getElementById('delete-modal');
function openDeleteModal(cat) {
    document.getElementById('delete-id').value = cat.id;
    deleteModal.classList.remove('hidden');
    toggleBodyScroll(true);
}

document.getElementById('cancel-delete-btn').onclick = () => { deleteModal.classList.add('hidden'); toggleBodyScroll(false); };

document.getElementById('confirm-delete-btn').onclick = async () => {
    const id = document.getElementById('delete-id').value;
    try {
        const res = await fetch(`/cats/${id}`, { method: 'DELETE' });
        if (res.ok) { deleteModal.classList.add('hidden'); toggleBodyScroll(false); fetchCats(); }
        else if (res.status === 401) { alert('Session expired. Please log in.'); isAuthenticated = false; updateAuthUI(); }
        else { alert('Failed to delete cat'); }
    } catch (error) { console.error(error); }
};

// ==========================================
// ADOPTION LOGIC
// ==========================================
async function adoptCat(catId) {
    try {
        const res = await fetch('/adopt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catId })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Congratulations! You have adopted a new feline friend!');
        } else {
            alert(data.error || 'Adoption failed');
        }
    } catch (error) {
        console.error('Adoption error:', error);
    }
}

viewAdoptedBtn.onclick = async () => {
    try {
        const res = await fetch('/adopted');
        const adoptedCats = await res.json();
        
        adoptedCatsContainer.innerHTML = '';
        if (adoptedCats.length === 0) {
            noAdoptionsMsg.classList.remove('hidden');
        } else {
            noAdoptionsMsg.classList.add('hidden');
            adoptedCats.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3';
                card.innerHTML = `
                    <div class="h-40 overflow-hidden rounded-xl">
                        <img src="${cat.img}" class="w-full h-full object-cover shadow-sm">
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-900 capitalize">${cat.tag}</h4>
                        <p class="text-xs text-slate-500">Adopted on: ${new Date(cat.adoptionDate).toLocaleDateString()}</p>
                    </div>
                `;
                adoptedCatsContainer.appendChild(card);
            });
        }
        adoptedModal.classList.remove('hidden');
        toggleBodyScroll(true);
    } catch (error) {
        console.error('Fetch adopted cats error:', error);
        alert("Failed to load your adoptions. Please try again.");
    }
};

closeAdoptedBtn.onclick = () => {
    adoptedModal.classList.add('hidden');
    toggleBodyScroll(false);
};

// INIT
searchInput.addEventListener('input', applyFilters);
tagFilter.addEventListener('change', applyFilters);
prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderGallery(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
nextBtn.onclick = () => { const totalPages = Math.ceil(filteredCats.length / itemsPerPage); if (currentPage < totalPages) { currentPage++; renderGallery(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

checkAuthStatus().then(fetchCats);