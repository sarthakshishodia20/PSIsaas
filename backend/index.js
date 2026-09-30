const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/assistant', require('./routes/assistant'));

app.get('/', (req, res) => {
  res.json({ message: 'PSI Assistant Backend Running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
