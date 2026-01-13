const express = require('express');
const cors = require('cors');
const tools = require('./tools.json');

const app = express();
app.use(cors());
app.use(express.json());

const paginate = (data, page = 1, limit = 20) => {
  const start = (page - 1) * limit;
  return {
    data: data.slice(start, start + parseInt(limit)),
    pagination: { total: data.length, page: +page, limit: +limit, pages: Math.ceil(data.length / limit) }
  };
};

app.get('/api', (req, res) => res.json({ name: 'AI Tools Database API', version: '1.0.0', total_tools: tools.length }));
app.get('/api/stats', (req, res) => res.json({ total_tools: tools.length, total_categories: [...new Set(tools.map(t => t.category))].length }));
app.get('/api/tools', (req, res) => res.json(paginate(tools, req.query.page || 1, req.query.limit || 20)));
app.get('/api/tools/:slug', (req, res) => {
  const tool = tools.find(t => t.slug === req.params.slug);
  tool ? res.json(tool) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/categories', (req, res) => {
  const cats = {};
  tools.forEach(t => cats[t.category] = (cats[t.category] || 0) + 1);
  res.json(Object.entries(cats).map(([name, count]) => ({ name, count })));
});
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const filtered = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  res.json(paginate(filtered, req.query.page || 1, req.query.limit || 20));
});

module.exports = app;
