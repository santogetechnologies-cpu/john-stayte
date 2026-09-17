-- Migration to ensure Big K products have brand set to 'Big K'
UPDATE products
SET brand = 'Big K'
WHERE slug = 'heat-logs-hollow-wrapped-pack-of-12';

UPDATE products
SET brand = 'Big K'
WHERE slug IN (
  'instant-lighting-firelog-single',
  'heat-logs-hollow-wrapped-pack-of-12',
  'instant-lighting-charcoal-2kg',
  'large-party-barbecue',
  'bbq-lighter-fluid-1l'
);
