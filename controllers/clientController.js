const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

const createClient = async (req, res) => {
  const clientData = req.body;
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('clients')
    .insert([{ ...clientData, user_id: userId }])
    .select();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // Create folder structure
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const clientFolderPath = path.join(__dirname, '..', 'uploads', userId, clientData.name, String(year), month);

  fs.mkdirSync(clientFolderPath, { recursive: true });

  res.status(201).json(data);
};

const getClients = async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
};

module.exports = {
  createClient,
  getClients,
};
