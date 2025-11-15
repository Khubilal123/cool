// Main JS: handles form submissions, localStorage persistence and rendering
(() => {
    // prefer shared lib when available (for tests)
    const lib = (typeof appLib !== 'undefined') ? appLib : null;
    const STORAGE_KEY = lib?.STORAGE_KEY || 'campus_lost_found_items_v1';

    function qs(id) {
        return document.getElementById(id);
    }

    const loadItems = lib?.loadItems || function () {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load items from storage', e);
            return [];
        }
    };

    const saveItems = lib?.saveItems || function (items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error('Failed to save items to storage', e);
        }
    };

    function renderItems(items) {
        const ul = qs('items-list-ul');
        if (!ul) return;
        ul.innerHTML = '';

        const filter = qs('filter-select')?.value || 'all';
        const search = (qs('search-input')?.value || '').toLowerCase().trim();

        const filtered = items.filter((it) => {
            if (filter !== 'all' && it.type !== filter) return false;
            if (!search) return true;
            return (
                it.itemName.toLowerCase().includes(search) ||
                (it.location || '').toLowerCase().includes(search) ||
                (it.description || '').toLowerCase().includes(search)
            );
        });

        if (filtered.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No items found.';
            ul.appendChild(li);
            announce('No items found matching your search and filters.');
            return;
        }

        filtered.forEach((it, idx) => {
            const li = document.createElement('li');
            const meta = document.createElement('div');
            meta.className = 'item-meta';
            meta.textContent = `${it.type.toUpperCase()} • ${it.location || 'Unknown'} • ${new Date(it.createdAt).toLocaleString()}`;

            const title = document.createElement('strong');
            title.textContent = it.itemName;

            const desc = document.createElement('p');
            desc.textContent = it.description || '';

            const contact = document.createElement('div');
            contact.className = 'item-contact';
            const mask = (lib?.maskContact) ? lib.maskContact(it.contact) : maskContact(it.contact);
            contact.textContent = `Contact: ${mask}`;

            const actions = document.createElement('div');
            actions.className = 'item-actions';

            const revealBtn = document.createElement('button');
            revealBtn.textContent = 'Reveal Contact';
            revealBtn.addEventListener('click', () => {
                contact.textContent = `Contact: ${it.contact}`;
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Mark Resolved';
            removeBtn.addEventListener('click', () => {
                items.splice(items.indexOf(it), 1);
                saveItems(items);
                renderItems(items);
                const msg = `${it.itemName} marked as resolved.`;
                if (lib?.announce) lib.announce(msg); else announce(msg);
            });

            actions.appendChild(revealBtn);
            actions.appendChild(removeBtn);

            li.appendChild(meta);
            li.appendChild(title);
            li.appendChild(desc);
            li.appendChild(contact);
            li.appendChild(actions);
            ul.appendChild(li);
        });
    }

    function maskContact(contact) {
        if (!contact) return '—';
        if (contact.length <= 4) return '****';
        return contact.slice(0, 2) + '*'.repeat(Math.max(0, contact.length - 4)) + contact.slice(-2);
    }

    function addItem(type, data) {
        const items = loadItems();
        const item = {
            id: cryptoRandomId(),
            type,
            itemName: data.itemName || 'Unnamed',
            location: data.location || '',
            description: data.description || '',
            contact: data.contact || '',
            createdAt: Date.now(),
        };
        items.unshift(item);
        saveItems(items);
        renderItems(items);
        const msg = `${item.itemName} added to ${type} items.`;
        if (lib?.announce) lib.announce(msg); else announce(msg);
    }

    function announce(message) {
        try {
            const live = qs('a11y-live');
            if (!live) return;
            live.textContent = '';
            // small timeout to ensure assistive tech notices the change
            setTimeout(() => { live.textContent = message; }, 100);
        } catch (e) {
            // non-fatal
            console.error('Announce failed', e);
        }
    }

    function cryptoRandomId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    // Event wiring
    document.addEventListener('DOMContentLoaded', () => {
        const lostForm = qs('lost-item-form');
        const foundForm = qs('found-item-form');
        const searchInput = qs('search-input');
        const filterSelect = qs('filter-select');

        const lostImageInput = qs('lost-item-image');
        const foundImageInput = qs('found-item-image');
        const lostPreview = qs('lost-image-preview');
        const foundPreview = qs('found-image-preview');

        const items = loadItems();
        renderItems(items);

        if (lostForm) {
            lostForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    itemName: lostForm.itemName.value,
                    location: lostForm.location.value,
                    description: lostForm.description.value,
                    contact: lostForm.contact.value,
                    imageData: lostForm._imageData || null,
                };
                addItem('lost', data);
                lostForm.reset();
                if (lostPreview) lostPreview.innerHTML = '';
            });
        }

        if (foundForm) {
            foundForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    itemName: foundForm.itemName.value,
                    location: foundForm.location.value,
                    description: foundForm.description.value,
                    contact: foundForm.contact.value,
                    imageData: foundForm._imageData || null,
                };
                addItem('found', data);
                foundForm.reset();
                if (foundPreview) foundPreview.innerHTML = '';
            });
        }

        // Image preview helpers
        function handleImageInput(inputEl, previewEl, formEl) {
            if (!inputEl) return;
            inputEl.addEventListener('change', () => {
                const file = inputEl.files && inputEl.files[0];
                previewEl.innerHTML = '';
                formEl._imageData = null;
                if (!file) return;
                const maxBytes = 1.5 * 1024 * 1024; // 1.5MB
                if (!file.type.startsWith('image/')) {
                    announce('Selected file is not an image. Please choose a JPG or PNG.');
                    return;
                }
                if (file.size > maxBytes) {
                    announce('Image is too large. Please choose an image smaller than 1.5 MB.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.alt = 'Preview';
                    previewEl.appendChild(img);
                    formEl._imageData = ev.target.result; // store dataURL for now
                };
                reader.readAsDataURL(file);
            });
        }

        handleImageInput(lostImageInput, lostPreview, lostForm);
        handleImageInput(foundImageInput, foundPreview, foundForm);

        if (searchInput) {
            searchInput.addEventListener('input', () => renderItems(loadItems()));
        }
        if (filterSelect) {
            filterSelect.addEventListener('change', () => renderItems(loadItems()));
        }
    });
})();