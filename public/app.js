document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop();

    // Redirect to login if no token and not on login/register page
    if (!token && currentPage !== 'login.html' && currentPage !== 'register.html') {
        window.location.href = '/login.html';
    }

    // API Wrapper
    const authedFetch = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        return response.json();
    };

    // Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const result = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const responseData = await result.json();
                if (!result.ok) throw new Error(responseData.message);

                localStorage.setItem('token', responseData.token);
                window.location.href = '/dashboard.html';
            } catch (error) {
                alert(`Login failed: ${error.message}`);
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const result = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const responseData = await result.json();
                if (!result.ok) throw new Error(responseData.message);


                localStorage.setItem('token', responseData.token);
                window.location.href = '/dashboard.html';
            } catch (error) {
                alert(`Registration failed: ${error.message}`);
            }
        });
    }

    // Profile Page
    const profileSetupForm = document.getElementById('profile-setup-form');
    if (profileSetupForm) {
        // Load profile data
        authedFetch('/api/profile')
            .then(profile => {
                if (profile) {
                    for (const key in profile) {
                        if (profileSetupForm.elements[key]) {
                            profileSetupForm.elements[key].value = profile[key];
                        }
                    }
                }
            })
            .catch(error => console.error('Error fetching profile:', error));

        // Handle profile update
        profileSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileSetupForm);
            const data = Object.fromEntries(formData.entries());

            try {
                await authedFetch('/api/profile', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
                alert('Profile updated successfully!');
            } catch (error) {
                alert(`Profile update failed: ${error.message}`);
            }
        });
    }

    // Client Page
    const createClientForm = document.getElementById('create-client-form');
    if(createClientForm){
         createClientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(createClientForm);
            const data = Object.fromEntries(formData.entries());

            try {
                await authedFetch('/api/clients', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
                alert('Client created successfully!');
                createClientForm.reset();
                // You might want to refresh the client list here
            } catch (error) {
                alert(`Client creation failed: ${error.message}`);
            }
        });
    }

    const clientSelectDropdown = document.getElementById('client-select-dropdown');
    if (clientSelectDropdown) {
        authedFetch('/api/clients')
            .then(clients => {
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.name;
                    clientSelectDropdown.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching clients:', error));
    }


    // Invoice Form
    const invoiceForm = document.getElementById('invoice-form');
    const addInvoiceItemBtn = document.getElementById('add-invoice-item-btn');
    const invoiceItemsTableBody = document.getElementById('invoice-items-table-body');

    if (invoiceForm) {
        const calculateTotals = () => {
            let subtotal = 0;
            const rows = invoiceItemsTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const quantity = parseFloat(row.querySelector('[name="quantity"]').value) || 0;
                const rate = parseFloat(row.querySelector('[name="rate"]').value) || 0;
                const total = quantity * rate;
                row.querySelector('.item-total').textContent = total.toFixed(2);
                subtotal += total;
            });

            const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            document.getElementById('subtotal').textContent = subtotal.toFixed(2);
            document.getElementById('tax-amount').textContent = taxAmount.toFixed(2);
            document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
        };

        if (addInvoiceItemBtn) {
            addInvoiceItemBtn.addEventListener('click', () => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td><input type="text" class="form-control" name="description" placeholder="Item description"></td>
                    <td><input type="number" class="form-control" name="quantity" value="1"></td>
                    <td><input type="number" class="form-control" name="rate" value="0.00"></td>
                    <td class="item-total">0.00</td>
                    <td><button type="button" class="btn btn-danger btn-sm remove-item-btn">Remove</button></td>
                `;
                invoiceItemsTableBody.appendChild(newRow);
            });
        }

        if(invoiceItemsTableBody){
             invoiceItemsTableBody.addEventListener('input', calculateTotals);
             invoiceItemsTableBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-item-btn')) {
                    e.target.closest('tr').remove();
                    calculateTotals();
                }
            });
        }

        invoiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const items = [];
            const rows = invoiceItemsTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                items.push({
                    description: row.querySelector('[name="description"]').value,
                    quantity: parseFloat(row.querySelector('[name="quantity"]').value),
                    rate: parseFloat(row.querySelector('[name="rate"]').value),
                });
            });

            const invoiceData = {
                client_id: document.getElementById('client-select-dropdown').value,
                items: items,
                subtotal: parseFloat(document.getElementById('subtotal').textContent),
                tax_rate: parseFloat(document.getElementById('tax-rate').value),
                tax_amount: parseFloat(document.getElementById('tax-amount').textContent),
                total_amount: parseFloat(document.getElementById('total-amount').textContent),
            };

            try {
                const newInvoice = await authedFetch('/api/invoices', {
                    method: 'POST',
                    body: JSON.stringify(invoiceData),
                });

                alert('Invoice created successfully!');

                // Show modal with download link
                const downloadLink = document.getElementById('invoice-download-link');
                if(downloadLink){
                    downloadLink.href = `/api/invoices/${newInvoice.id}/pdf`;
                    // Assuming you have a Bootstrap modal with id="invoice-success-modal"
                    if (typeof bootstrap !== 'undefined') {
                        const successModal = new bootstrap.Modal(document.getElementById('invoice-success-modal'));
                        successModal.show();
                    }
                }
                invoiceForm.reset();
                if(invoiceItemsTableBody) {
                    invoiceItemsTableBody.innerHTML = '';
                }
                calculateTotals();

            } catch (error) {
                alert(`Invoice creation failed: ${error.message}`);
            }
        });

        // Initial calculation
        if(invoiceItemsTableBody) {
            calculateTotals();
        }
    }
});
