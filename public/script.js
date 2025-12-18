const container = document.getElementById('cats-container');
const searchInput = document.getElementById('search');
const tagFilter = document.getElementById('tag-filter');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageNumbersContainer = document.getElementById('page-numbers');

let globalCats = [];
let filteredCats = [];
let currentPage = 1;
const itemsPerPage = 9;

async function fetchCats() {
    try {
        const response = await fetch('/cats');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        globalCats = await response.json();
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
    
    // Clear existing except first
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

        const actions = document.createElement('div');
        actions.className = 'flex gap-3 mt-auto';

        const editBtn = document.createElement('button');
        editBtn.className = 'flex-grow inline-flex items-center justify-center px-4 py-3 bg-slate-50 text-slate-900 text-sm font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm';
        editBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            Edit
        `;
        editBtn.onclick = () => openEditModal(cat);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'inline-flex items-center justify-center px-4 py-3 bg-red-50 text-red-600 text-sm font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm';
        deleteBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m3 4h.01"></path></svg>
        `;
        deleteBtn.onclick = () => openDeleteModal(cat);

        actions.append(editBtn, deleteBtn);
        content.append(title, description, actions);
        card.append(imgWrapper, content);
        container.appendChild(card);
    });

    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredCats.length / itemsPerPage);
    
    // Previous Button
    prevBtn.disabled = currentPage === 1;
    
    // Next Button
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Page Numbers
    pageNumbersContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.className = `w-12 h-12 flex items-center justify-center rounded-xl font-bold transition-all shadow-sm ${
            i === currentPage 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
        }`;
        pageBtn.onclick = () => {
            currentPage = i;
            renderGallery();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        pageNumbersContainer.appendChild(pageBtn);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
searchInput.addEventListener('input', applyFilters);
tagFilter.addEventListener('change', applyFilters);

prevBtn.onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        renderGallery();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

nextBtn.onclick = () => {
    const totalPages = Math.ceil(filteredCats.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderGallery();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ==========================================
// MODAL LOGIC
// ==========================================
const toggleBodyScroll = (disable) => {
    document.body.style.overflow = disable ? 'hidden' : '';
};

const editModal = document.getElementById('edit-modal');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

function openEditModal(cat) {
    document.getElementById('edit-id').value = cat.id;
    document.getElementById('edit-tag').value = cat.tag || '';
    document.getElementById('edit-img').value = cat.img || '';
    document.getElementById('edit-description').value = cat.description || '';
    editModal.classList.remove('hidden');
    toggleBodyScroll(true);
}

function closeEditModal() {
    editModal.classList.add('hidden');
    toggleBodyScroll(false);
}

cancelBtn.onclick = closeEditModal;

saveBtn.onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const tag = document.getElementById('edit-tag').value;
    const img = document.getElementById('edit-img').value;
    const description = document.getElementById('edit-description').value;

    try {
        const response = await fetch(`/cats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag, img, description })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        closeEditModal();
        fetchCats();
    } catch (error) {
        console.error('Error updating cat:', error);
    }
};

const addModal = document.getElementById('add-modal');
const addBtn = document.getElementById('add-btn');
const addSaveBtn = document.getElementById('add-save-btn');
const addCancelBtn = document.getElementById('add-cancel-btn');

function openAddModal() {
    document.getElementById('add-tag').value = '';
    document.getElementById('add-img').value = '';
    document.getElementById('add-description').value = '';
    addModal.classList.remove('hidden');
    toggleBodyScroll(true);
}

function closeAddModal() {
    addModal.classList.add('hidden');
    toggleBodyScroll(false);
}

addBtn.onclick = openAddModal;
addCancelBtn.onclick = closeAddModal;

addSaveBtn.onclick = async () => {
    const tag = document.getElementById('add-tag').value;
    const img = document.getElementById('add-img').value;
    const description = document.getElementById('add-description').value;
    const id = Date.now().toString();

    try {
        const response = await fetch('/cats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tag, img, description })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        closeAddModal();
        fetchCats(); 
    } catch (error) {
        console.error('Error adding cat:', error);
    }
};

const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

function openDeleteModal(cat) {
    document.getElementById('delete-id').value = cat.id;
    deleteModal.classList.remove('hidden');
    toggleBodyScroll(true);
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    toggleBodyScroll(false);
}

cancelDeleteBtn.onclick = closeDeleteModal;

confirmDeleteBtn.onclick = async () => {
    const id = document.getElementById('delete-id').value;

    try {
        const response = await fetch(`/cats/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        closeDeleteModal();
        fetchCats(); 
    } catch (error) {
        console.error('Error deleting cat:', error);
    }
};

fetchCats();