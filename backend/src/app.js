const express = require('express');
const cors = require('cors');
const { ApiError, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'Đường dẫn không tồn tại.'));
});
app.use(errorHandler);

module.exports = app;
