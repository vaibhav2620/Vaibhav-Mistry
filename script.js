document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.querySelector('.products-grid');
    const radioButtons = document.querySelectorAll('input[name="toggle"]');

    if (!productsGrid) {
        return;
    }

    const sheetUrl = productsGrid.dataset.sheetUrl;

    function parseCsv(csvText) {
        const rows = [];
        let row = [];
        let value = '';
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i += 1) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    value += '"';
                    i += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                row.push(value.trim());
                value = '';
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i += 1;
                }

                row.push(value.trim());
                if (row.some((cell) => cell !== '')) {
                    rows.push(row);
                }

                row = [];
                value = '';
            } else {
                value += char;
            }
        }

        if (value || row.length > 0) {
            row.push(value.trim());
            if (row.some((cell) => cell !== '')) {
                rows.push(row);
            }
        }

        return rows;
    }

    function renderProducts(products) {
        productsGrid.innerHTML = '';

        if (!products.length) {
            productsGrid.innerHTML = '<p class="status-message">No products found in the sheet.</p>';
            return;
        }

        const cardsMarkup = products
            .map((product) => {
                const category = (product.category || 'all').toLowerCase();
                const safeName = product.name || 'Untitled Product';
                const safeLink = product.productLink || '#';
                const safeImage = product.photoLink || '';

                return `
                    <div class="product-card" data-category="${category}">
                        <a href="${safeLink}" target="_blank" rel="noopener noreferrer">
                            <div class="img-box"><img src="${safeImage}" loading="lazy" alt="${safeName}"></div>
                            <div class="text-box"><p>${safeName}</p></div>
                        </a>
                    </div>
                `;
            })
            .join('');

        productsGrid.innerHTML = cardsMarkup;
    }

    function applyFilter(category) {
        const products = document.querySelectorAll('.product-card');

        products.forEach((product) => {
            const productCategory = product.getAttribute('data-category');
            const shouldShow = category === 'all' || productCategory === category;
            product.classList.toggle('hidden', !shouldShow);
        });
    }

    function normalizeHeader(text) {
        return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function mapRowsToProducts(rows) {
        if (!rows.length) {
            return [];
        }

        const header = rows[0].map(normalizeHeader);
        const nameIndex = header.indexOf('productname');
        const photoIndex = header.indexOf('productphoto') !== -1 ? header.indexOf('productphoto') : header.indexOf('photolink');
        const linkIndex = header.indexOf('productlink');
        const categoryIndex = header.indexOf('category');

        if (nameIndex === -1 || photoIndex === -1 || linkIndex === -1 || categoryIndex === -1) {
            throw new Error('Sheet must contain columns: Product Name, Product Photo (or Photo Link), Product Link, Category');
        }

        return rows
            .slice(1)
            .map((row) => ({
                name: row[nameIndex],
                photoLink: row[photoIndex],
                productLink: row[linkIndex],
                category: row[categoryIndex],
            }))
            .filter((item) => item.name && item.photoLink && item.productLink && item.category);
    }

    function showError(message) {
        productsGrid.innerHTML = `<p class="status-message">${message}</p>`;
    }

    async function loadProductsFromSheet() {
        if (!sheetUrl || sheetUrl.includes('YOUR_SHEET_ID')) {
            showError('Add your published Google Sheet CSV link in data-sheet-url to load products.');
            return;
        }

        try {
            productsGrid.innerHTML = '<p class="status-message">Loading products...</p>';
            const response = await fetch(sheetUrl);

            if (!response.ok) {
                throw new Error(`Unable to fetch sheet data (${response.status})`);
            }

            const csvText = await response.text();
            const rows = parseCsv(csvText);
            const products = mapRowsToProducts(rows);
            renderProducts(products);
            applyFilter(document.querySelector('input[name="toggle"]:checked')?.value || 'all');
        } catch (error) {
            showError(`Could not load products. ${error.message}`);
        }
    }

    radioButtons.forEach((radio) => {
        radio.addEventListener('change', (event) => {
            applyFilter(event.target.value);
        });
    });

    loadProductsFromSheet();
});
