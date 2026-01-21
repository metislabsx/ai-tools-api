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

app.get('/api', (req, res) => res.json({ name: 'AI Tools Database API', version: '2.0.0', total_tools: tools.length }));
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
  const filtered = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q)));
  res.json(paginate(filtered, req.query.page || 1, req.query.limit || 20));
});

// NEW: Compare endpoint
app.get('/api/compare', (req, res) => {
  const toolsParam = req.query.tools;
  
  if (!toolsParam) {
    return res.status(400).json({ 
      error: 'Missing query parameter: tools',
      usage: '/api/compare?tools=chatgpt,claude',
      example: '/api/compare?tools=chatgpt,claude,gemini'
    });
  }
  
  const slugs = toolsParam.split(',').map(s => s.trim().toLowerCase());
  
  if (slugs.length < 2) {
    return res.status(400).json({
      error: 'Please provide at least 2 tools to compare',
      usage: '/api/compare?tools=chatgpt,claude'
    });
  }
  
  const toolsToCompare = slugs
    .map(slug => tools.find(t => t.slug === slug))
    .filter(Boolean);
  
  if (toolsToCompare.length < 2) {
    const foundSlugs = toolsToCompare.map(t => t.slug);
    const notFound = slugs.filter(s => !foundSlugs.includes(s));
    return res.status(404).json({ 
      error: 'Could not find enough tools to compare',
      requested: slugs,
      found: foundSlugs,
      not_found: notFound,
      hint: 'Use /api/tools to see all available tool slugs'
    });
  }

  const comparison = {
    tools: toolsToCompare,
    comparison: {
      pricing: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        model: t.pricing?.model || 'unknown',
        free_tier: t.pricing?.free_tier || false,
        starting_price: t.pricing?.starting_price || null,
        currency: t.pricing?.currency || 'USD',
        billing_cycle: t.pricing?.billing_cycle || 'monthly'
      })),
      ratings: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        rating: t.rating || null,
        popularity_score: t.popularity_score || null
      })),
      categories: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        category: t.category
      })),
      features: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        features: t.features || [],
        count: (t.features || []).length
      })),
      best_for: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        best_for: t.best_for || []
      })),
      pros_cons: toolsToCompare.map(t => ({
        name: t.name,
        slug: t.slug,
        pros: t.pros || [],
        cons: t.cons || []
      }))
    },
    summary: {
      compared_count: toolsToCompare.length,
      highest_rated: toolsToCompare.reduce((a, b) => 
        (a.rating || 0) > (b.rating || 0) ? a : b
      ).name,
      most_popular: toolsToCompare.reduce((a, b) => 
        (a.popularity_score || 0) > (b.popularity_score || 0) ? a : b
      ).name,
      cheapest: toolsToCompare
        .filter(t => t.pricing?.starting_price)
        .sort((a, b) => (a.pricing?.starting_price || 999) - (b.pricing?.starting_price || 999))[0]?.name || 'N/A',
      has_free_tier: toolsToCompare.filter(t => t.pricing?.free_tier).map(t => t.name)
    }
  };
  
  return res.json(comparison);
});

module.exports = app;
