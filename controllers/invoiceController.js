const supabase = require('../config/supabase');
const pdfService = require('../services/pdfService');
const fs = require('fs');
const path = require('path');

// Helper function to handle invoice creation with retries for race conditions
const createInvoiceWithRetry = async (invoiceData, userId, profile, client, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      // 1. Generate invoice number
      const { data: lastInvoice, error: lastInvoiceError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastInvoiceError) throw lastInvoiceError;

      let serialNumber = 1;
      if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_number) {
        const lastSerial = parseInt(lastInvoice[0].invoice_number.split('/').pop(), 10);
        if (!isNaN(lastSerial)) {
            serialNumber = lastSerial + 1;
        }
      }

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const invoiceNumber = `${profile.short_form || 'INV'}/${client.short_form || 'CLIENT'}/${year}/${String(serialNumber).padStart(3, '0')}`;

      // 2. Attempt to save the invoice
      const { data: newInvoice, error: newInvoiceError } = await supabase
        .from('invoices')
        .insert([{ ...invoiceData, user_id: userId, invoice_number: invoiceNumber }])
        .select()
        .single();

      if (newInvoiceError) {
        // Check for unique constraint violation (Postgres error code '23505')
        if (newInvoiceError.code === '23505') {
          console.log(`Attempt ${i + 1} failed due to duplicate invoice number. Retrying...`);
          continue; // Retry the loop
        }
        // It's a different error, so throw it
        throw newInvoiceError;
      }

      // 3. Success! Return the new invoice
      return newInvoice;

    } catch (error) {
      if (i === retries - 1) { // Last attempt failed
        throw error;
      }
    }
  }
  // If the loop completes without success
  throw new Error('Failed to create invoice after multiple attempts due to high concurrency. Please try again.');
};


const createInvoice = async (req, res) => {
  const invoiceData = req.body;
  const userId = req.user.id;

  try {
    // Fetch profile and client data first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoiceData.client_id)
      .eq('user_id', userId) // Ensure client belongs to the user
      .single();

    if (clientError) throw clientError;
    if (!client) throw new Error('Client not found or does not belong to the user.');


    // Call the retry logic
    const newInvoice = await createInvoiceWithRetry(invoiceData, userId, profile, client);

    // Generate PDF
    const pdfBuffer = await pdfService.generate(profile, client, newInvoice);

    // Save PDF to file system
    const date = new Date(newInvoice.created_at);
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const filePath = path.join(__dirname, '..', 'uploads', userId, client.name, year, month, `${newInvoice.invoice_number}.pdf`);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, pdfBuffer);

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Failed to create invoice:', error);
    res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
  }
};

const getInvoicePDF = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, clients(name)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ message: 'Invoice not found or you do not have permission to view it.' });
    }

    const date = new Date(invoice.created_at);
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const filePath = path.join(__dirname, '..', 'uploads', userId, invoice.clients.name, year, month, `${invoice.invoice_number}.pdf`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'PDF file not found for this invoice.' });
    }
  } catch (error) {
    console.error('Failed to get invoice PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createInvoice,
  getInvoicePDF,
};
