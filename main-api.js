// Frontend logic with API integration (Express backend)
(() => {
  const API_BASE_URL = 'http://localhost:3001/api';

  function qs(id) {
    return document.getElementById(id);
  }

  // API helpers
  async function apiCall(method, endpoint, data = null, file = null) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const options = { method, headers: {} };

      if (file) {
        // Multipart form data for file upload
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', data.type);
        formData.append('itemName', data.itemName);
        formData.append('location', data.location);
        formData.append('description', data.description);
        formData.append('contact', data.contact);
        options.body = formData;
      } else if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('API call failed:', error);
      announce(`Error: ${error.message}`);
      throw error;
    }
  }

  async function loadItems(type = 'all', search = '') {
    try {
      let endpoint = '/items';
      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      if (search) params.append('search', search);
      if (params.toString()) endpoint += '?' + params.toString();

      return await apiCall('GET', endpoint);
    } catch (error) {
      console.error('Failed to load items:', error);
      return [];
    }
  }

  async function addItem(type, data, imageFile = null) {
    try {
      const itemData = {
        type,
        itemName: data.itemName || 'Unnamed',
        location: data.location || '',
        description: data.description || '',
        contact: data.contact || ''
      };

      const result = await apiCall('POST', '/items', itemData, imageFile);
      announce(`${result.itemName} added to ${type} items.`);
      return result;
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  }

  async function removeItem(id, itemName) {
    try {
      await apiCall('DELETE', `/items/${id}`);
      announce(`${itemName} marked as resolved.`);
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  }

  function maskContact(contact) {
    if (!contact) return '—';
    if (contact.length <= 4) return '****';
    return contact.slice(0, 2) + '*'.repeat(Math.max(0, contact.length - 4)) + contact.slice(-2);
  }

  function announce(message) {
    try {
      const live = qs('a11y-live');
      if (!live) return;
      live.textContent = '';
      setTimeout(() => { live.textContent = message; }, 100);
    } catch (e) {
      console.error('Announce failed', e);
    }
  }

  async function renderItems(items) {
    const ul = qs('items-list-ul');
    if (!ul) return;
    ul.innerHTML = '';

    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No items found.';
      ul.appendChild(li);
      announce('No items found matching your search and filters.');
      return;
    }

    items.forEach((it) => {
      const li = document.createElement('li');

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      const createdDate = new Date(it.createdAt).toLocaleString();
      meta.textContent = `${it.type.toUpperCase()} • ${it.location || 'Unknown'} • ${createdDate}`;

      const title = document.createElement('strong');
      title.textContent = it.itemName;

      const desc = document.createElement('p');
      desc.textContent = it.description || '';

      // Image if present
      if (it.imageUrl) {
        const img = document.createElement('img');
        img.src = it.imageUrl;
        img.alt = it.itemName;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '6px';
        img.style.marginTop = '0.5rem';
        li.appendChild(img);
      }

      const contact = document.createElement('div');
      contact.className = 'item-contact';
      contact.textContent = `Contact: ${maskContact(it.contact)}`;

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const revealBtn = document.createElement('button');
      revealBtn.textContent = 'Reveal Contact';
      revealBtn.addEventListener('click', async () => {
        try {
          const result = await apiCall('POST', `/items/${it.id}/reveal-contact`);
          contact.textContent = `Contact: ${result.contact}`;
        } catch (error) {
          announce('Failed to reveal contact');
        }
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Mark Resolved';
      removeBtn.addEventListener('click', async () => {
        try {
          await removeItem(it.id, it.itemName);
          await refreshItems();
        } catch (error) {
          announce('Failed to remove item');
        }
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

  async function refreshItems() {
    const filter = qs('filter-select')?.value || 'all';
    const search = (qs('search-input')?.value || '').toLowerCase().trim();
    const items = await loadItems(filter, search);
    await renderItems(items);
  }

  // Event wiring
  document.addEventListener('DOMContentLoaded', async () => {
    const lostForm = qs('lost-item-form');
    const foundForm = qs('found-item-form');
    const searchInput = qs('search-input');
    const filterSelect = qs('filter-select');

    const lostImageInput = qs('lost-item-image');
    const foundImageInput = qs('found-item-image');
    const lostPreview = qs('lost-image-preview');
    const foundPreview = qs('found-image-preview');

    // Initial load
    await refreshItems();

    if (lostForm) {
      lostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageFile = lostImageInput?.files?.[0] || null;
        const data = {
          itemName: lostForm.itemName.value,
          location: lostForm.location.value,
          description: lostForm.description.value,
          contact: lostForm.contact.value
        };

        try {
          await addItem('lost', data, imageFile);
          lostForm.reset();
          if (lostPreview) lostPreview.innerHTML = '';
          await refreshItems();
        } catch (error) {
          announce('Failed to add lost item');
        }
      });
    }

    if (foundForm) {
      foundForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageFile = foundImageInput?.files?.[0] || null;
        const data = {
          itemName: foundForm.itemName.value,
          location: foundForm.location.value,
          description: foundForm.description.value,
          contact: foundForm.contact.value
        };

        try {
          await addItem('found', data, imageFile);
          foundForm.reset();
          if (foundPreview) foundPreview.innerHTML = '';
          await refreshItems();
        } catch (error) {
          announce('Failed to add found item');
        }
      });
    }

    // Image preview handlers
    function handleImageInput(inputEl, previewEl) {
      if (!inputEl) return;
      inputEl.addEventListener('change', () => {
        const file = inputEl.files?.[0];
        previewEl.innerHTML = '';
        if (!file) return;
        const maxBytes = 1.5 * 1024 * 1024;
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
        };
        reader.readAsDataURL(file);
      });
    }

    handleImageInput(lostImageInput, lostPreview);
    handleImageInput(foundImageInput, foundPreview);

    // Search and filter
    if (searchInput) {
      searchInput.addEventListener('input', () => refreshItems());
    }
    if (filterSelect) {
      filterSelect.addEventListener('change', () => refreshItems());
    }
  });
})();
