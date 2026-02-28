document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.querySelector('.products-grid');
    const radioButtons = document.querySelectorAll('input[name="toggle"]');

    if (!productsGrid) {
        return;
    }

    const rawSheetUrl = productsGrid.dataset.sheetUrl;

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

    function escapeHtml(text) {
        return String(text)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function renderProducts(products) {
        productsGrid.innerHTML = '';

        if (!products.length) {
            productsGrid.innerHTML = '<p class="status-message">No products found in the sheet.</p>';
            return;
        }

        const cardsMarkup = products
            .map((product) => {
                const category = escapeHtml((product.category || 'all').trim().toLowerCase());
                const safeName = escapeHtml(product.name || 'Untitled Product');
                const safeLink = escapeHtml(product.productLink || '#');
                const safeImage = escapeHtml(product.photoLink || '');

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

    function findHeaderIndex(header, aliases) {
        const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));

        for (const alias of normalizedAliases) {
            const index = header.indexOf(alias);
            if (index !== -1) {
                return index;
            }
        }
        return -1;
    }

    function mapRowsToProducts(rows) {
        if (!rows.length) {
            return [];
        }

        const header = rows[0].map(normalizeHeader);
        const nameIndex = findHeaderIndex(header, ['productname', 'name', 'title', 'producttitle', 'itemname']);
        const photoIndex = findHeaderIndex(header, ['product photo', 'product image', 'productimage', 'photolink', 'imagelink', 'imageurl', 'image', 'photo', 'thumbnail']);
        const linkIndex = findHeaderIndex(header, ['productlink', 'link', 'url', 'buylink', 'producturl', 'affiliatelink']);
        const categoryIndex = findHeaderIndex(header, ['category', 'type', 'tag', 'section']);

        if (nameIndex === -1 || photoIndex === -1 || linkIndex === -1 || categoryIndex === -1) {
            throw new Error(`Sheet column mismatch. Found headers: ${rows[0].join(', ')}`);
        }

        return rows
            .slice(1)
            .map((row) => ({
                name: row[nameIndex],
                photoLink: row[photoIndex],
                productLink: row[linkIndex],
                category: (row[categoryIndex] || '').trim().toLowerCase(),
            }))
            .filter((item) => item.name && item.photoLink && item.productLink && item.category);
    }

    function showError(message) {
        productsGrid.innerHTML = `<p class="status-message">${escapeHtml(message)}</p>`;
    }

    function resolveSheetCsvUrl(urlText) {
        if (!urlText) {
            return '';
        }

        try {
            const url = new URL(urlText);
            const pathMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

            if (!pathMatch) {
                return urlText;
            }

            const sheetId = pathMatch[1];
            const gid = url.searchParams.get('gid') || '0';
            return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        } catch {
            return urlText;
        }
    }

    async function loadProductsFromSheet() {
        if (!rawSheetUrl || rawSheetUrl.includes('YOUR_SHEET_ID')) {
            showError('Add your Google Sheet link in data-sheet-url to load products.');
            return;
        }

        try {
            const sheetCsvUrl = resolveSheetCsvUrl(rawSheetUrl);
            productsGrid.innerHTML = '<p class="status-message">Loading products...</p>';
            const response = await fetch(sheetCsvUrl);

            if (!response.ok) {
                throw new Error(`Unable to fetch sheet data (${response.status}). Check sharing permissions.`);
            }

            const csvText = await response.text();

            if (csvText.trim().startsWith('<!DOCTYPE html')) {
                throw new Error('Received HTML instead of CSV. Use a public Google Sheet link or publish the sheet.');
            }

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
