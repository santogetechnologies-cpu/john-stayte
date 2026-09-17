-- =========================================================================
-- 00033_calor_butane_products.sql
-- Calor Gas Butane Refill Products (15kg & 7kg) with exact prices
-- =========================================================================

INSERT INTO public.products (
    name,
    slug,
    brand,
    category_slug,
    subcategory,
    description,
    price,
    stock,
    image_url,
    specs
) VALUES
(
    'Calor Gas Butane - 15kg Refill',
    'calor-gas-butane-15kg-refill',
    'Calor',
    'gas',
    'Butane Cylinders',
    '15kg Butane gas cylinder refill for indoor portable room heaters and domestic gas appliances. Requires an empty cylinder exchange on delivery.',
    58.25,
    35,
    '/calor-butane-15kg.png',
    jsonb_build_object(
        'usage_type', 'DOMESTIC',
        'gas_type', 'Butane',
        'cylinder_size', '15kg',
        'deposit_price', 39.99,
        'refill_price', 58.25,
        'delivery_charge', 0,
        'is_gas_product', true,
        'is_active', true,
        'is_refill', true,
        'is_bestseller', true,
        'images', jsonb_build_array('/calor-butane-15kg.png'),
        'features', jsonb_build_array(
            '21mm Easy-clip valve connection',
            'High-output clean-burning indoor room heating',
            'Standard UK cabinet heater cavity compatibility',
            'Long-lasting 15kg capacity for cold winter periods'
        ),
        'suitable_for', jsonb_build_array(
            'Portable Cabinet Heaters',
            'Living Room Mobile Heating',
            'Indoor Domestic Cookers'
        )
    )
),
(
    'Calor Gas Butane - 7kg Refill',
    'calor-gas-butane-7kg-refill',
    'Calor',
    'gas',
    'Butane Cylinders',
    '7kg Butane gas cylinder refill for small portable heaters, camping stoves and indoor appliances. Requires an empty cylinder exchange on delivery.',
    37.00,
    28,
    '/calor-butane-7kg.png',
    jsonb_build_object(
        'usage_type', 'DOMESTIC',
        'gas_type', 'Butane',
        'cylinder_size', '7kg',
        'deposit_price', 34.99,
        'refill_price', 37.00,
        'delivery_charge', 0,
        'is_gas_product', true,
        'is_active', true,
        'is_refill', true,
        'is_bestseller', true,
        'images', jsonb_build_array('/calor-butane-7kg.png'),
        'features', jsonb_build_array(
            '21mm Easy-clip valve connection',
            'Compact size for easy movement and smaller cabinet heaters',
            'Clean burning indoor butane flame'
        ),
        'suitable_for', jsonb_build_array(
            'Small Mobile Heaters',
            'Camping Stoves & Caravans',
            'Indoor Heating'
        )
    )
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    category_slug = EXCLUDED.category_slug,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    specs = EXCLUDED.specs;
