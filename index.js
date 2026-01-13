const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// AI Tools Database (embedded for simplicity)
const tools = require('../data/tools.json');

// Helper: Filter and paginate results
const paginate = (data, page = 1, limit = 20) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      total: data.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(data.length / limit)
    }
  };
};

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Tools Database API',
    version: '1.0.0',
    description: 'Get structured data on 60+ AI tools',
    total_tools: tools.length,
    endpoints: {
      '/api/tools': 'List all tools (paginated)',
      '/api/tools/:slug': 'Get tool by slug',
      '/api/search?q=query': 'Search tools',
      '/api/categories': 'List all categories',
      '/api/compare?tool1=X&tool2=Y': 'Compare two tools',
      '/api/stats': 'API statistics'
    }
  });
});

// GET /api/tools
app.get('/api/tools', (req, res) => {
  const { page = 1, limit = 20, category, pricing, sort } = req.query;
  let filtered = [...tools];
  
  if (category) {
    filtered = filtered.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }
  if (pricing) {
    filtered = filtered.filter(t => t.pricing.model.toLowerCase() === pricing.toLowerCase());
  }
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'popularity') filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
  
  res.json(paginate(filtered, page, limit));
});

// GET /api/tools/:slug
app.get('/api/tools/:slug', (req, res) => {
  const tool = tools.find(t => t.slug === req.params.slug);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  res.json(tool);
});

// GET /api/search
app.get('/api/search', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  const query = q.toLowerCase();
  const filtered = tools.filter(t => 
    t.name.toLowerCase().includes(query) ||
    t.description.toLowerCase().includes(query) ||
    t.category.toLowerCase().includes(query) ||
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
  );
  res.json(paginate(filtered, page, limit));
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const categories = {};
  tools.forEach(tool => {
    const cat = tool.category;
    if (categories[cat]) categories[cat].count++;
    else categories[cat] = { name: cat, count: 1 };
  });
  res.json({
    total_categories: Object.keys(categories).length,
    categories: Object.values(categories).sort((a, b) => b.count - a.count)
  });
});

// GET /api/compare
app.get('/api/compare', (req, res) => {
  const { tool1, tool2 } = req.query;
  if (!tool1 || !tool2) {
    return res.status(400).json({ error: 'Please provide both tool1 and tool2 slugs' });
  }
  const t1 = tools.find(t => t.slug === tool1);
  const t2 = tools.find(t => t.slug === tool2);
  if (!t1) return res.status(404).json({ error: `Tool '${tool1}' not found` });
  if (!t2) return res.status(404).json({ error: `Tool '${tool2}' not found` });
  
  res.json({
    tools: [t1, t2],
    comparison: {
      pricing: { [t1.slug]: t1.pricing, [t2.slug]: t2.pricing },
      features: { [t1.slug]: t1.features || [], [t2.slug]: t2.features || [] },
      ratings: { [t1.slug]: t1.rating, [t2.slug]: t2.rating },
      best_for: { [t1.slug]: t1.best_for || [], [t2.slug]: t2.best_for || [] }
    }
  });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  const categories = [...new Set(tools.map(t => t.category))];
  const pricingModels = [...new Set(tools.map(t => t.pricing.model))];
  res.json({
    total_tools: tools.length,
    total_categories: categories.length,
    pricing_models: pricingModels,
    last_updated: '2026-01-13',
    api_version: '1.0.0'
  });
});

// Export for Vercel
module.exports = app;
