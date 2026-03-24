const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

const createClient = async (req, res) => {
  const clientData = req.body;
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...clientData, user_id: userId }])
      .select();

    if (error) {
      throw error;
    }

    // Create folder structure
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const clientFolderPath = path.join(__dirname, '..', 'uploads', userId, clientData.name, String(year), month);

    await fs.promises.mkdir(clientFolderPath, { recursive: true });

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
  }
};

const getClients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
  }
};

module.exports = {
  createClient,
  getClients,
};
