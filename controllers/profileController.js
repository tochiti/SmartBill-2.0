const supabase = require('../config/supabase');

const getProfile = async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
};

const updateProfile = async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: req.user.id, ...req.body })
    .select();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
};

module.exports = {
  getProfile,
  updateProfile,
};
