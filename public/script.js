const container = document.getElementById('cats-container');

async function fetchCats() {
    try {
        const response = await fetch('/cats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cats = await response.json();
        displayCats(cats);
    } catch (error) {
        console.error('Error fetching cats:', error);
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load cats. Please try again later.</p>';
    }
}

function displayCats(cats) {
    container.innerHTML = ''; 

    if (cats.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No cats found.</p>';
        return;
    }

    cats.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'max-w-sm bg-white rounded-xl shadow-md overflow-hidden border hover:shadow-lg transition-shadow duration-300';

        const img = document.createElement('img');
        img.className = 'w-full h-48 object-cover';
        img.src = cat.img;
        img.alt = cat.tag || 'Cat';
        
        const subContainer = document.createElement('div');
        subContainer.className = 'p-4';

        const cardTitle = document.createElement('h2');
        cardTitle.className = 'text-xl font-semibold text-gray-800 mb-2 capitalize';
        cardTitle.innerText = cat.tag || 'Unknown Cat';

        const desc = document.createElement('p');
        desc.className = 'text-gray-600 text-sm leading-relaxed';
        desc.innerText = cat.description || 'No description available.';

        const editBtn = document.createElement('button');
        editBtn.className = 'mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300';
        editBtn.innerText = 'Edit';
        editBtn.onclick = () => openEditModal(cat);

        subContainer.append(cardTitle, desc, editBtn);
        card.append(img, subContainer);
        container.appendChild(card);
    });
}

fetchCats();

// ==========================================
// EDIT MODAL LOGIC
// ==========================================
const editModal = document.getElementById('edit-modal');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

function openEditModal(cat) {
    document.getElementById('edit-id').value = cat.id;
    document.getElementById('edit-tag').value = cat.tag;
    document.getElementById('edit-img').value = cat.img;
    document.getElementById('edit-description').value = cat.description;
    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tag, img, description })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        closeEditModal();
        fetchCats(); // Refresh the list
    } catch (error) {
        console.error('Error updating cat:', error);
        alert('Failed to update cat. Please try again.');
    }
};

// ==========================================
// ADD MODAL LOGIC
// ==========================================
const addModal = document.getElementById('add-modal');
const addBtn = document.getElementById('add-btn');
const addSaveBtn = document.getElementById('add-save-btn');
const addCancelBtn = document.getElementById('add-cancel-btn');

function openAddModal() {
    document.getElementById('add-tag').value = '';
    document.getElementById('add-img').value = '';
    document.getElementById('add-description').value = '';
    addModal.classList.remove('hidden');
}

function closeAddModal() {
    addModal.classList.add('hidden');
}

addBtn.onclick = openAddModal;
addCancelBtn.onclick = closeAddModal;

addSaveBtn.onclick = async () => {
    const tag = document.getElementById('add-tag').value;
    const img = document.getElementById('add-img').value;
    const description = document.getElementById('add-description').value;
    const id = Date.now().toString(); // Generate a simple ID

    try {
        const response = await fetch('/cats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, tag, img, description })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        closeAddModal();
        fetchCats(); 
    } catch (error) {
        console.error('Error adding cat:', error);
        alert('Failed to add cat. Please try again.');
    }
};