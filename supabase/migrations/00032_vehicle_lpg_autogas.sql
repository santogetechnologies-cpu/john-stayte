-- =========================================================================
-- 00032_vehicle_lpg_autogas.sql
-- Vehicle LPG / Autogas Category and Product Setup
-- =========================================================================

-- 1. Insert or update Vehicle LPG / Autogas category
INSERT INTO public.categories (
    name,
    slug,
    icon,
    description,
    subcategories,
    display_order,
    is_active
) VALUES (
    'Vehicle LPG / Autogas',
    'vehicle-lpg-autogas',
    'Car',
    'LPG and Autogas solutions for compatible cars, vans, taxis and commercial vehicles, including vehicle refuelling services.',
    ARRAY[
        'Forecourt Autogas Refuelling',
        'Commercial Fleet LPG Refuelling',
        'Autogas Adapters & Connectors',
        'Vehicle Refuelling Bay Booking'
    ],
    4,
    true
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    subcategories = EXCLUDED.subcategories,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- 2. Seed initial active Autogas products if not present
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
    'Forecourt Vehicle Autogas Refuelling (Per Litre)',
    'forecourt-vehicle-autogas-refuelling',
    'John Stayte Services',
    'vehicle-lpg-autogas',
    'Forecourt Autogas Refuelling',
    'Direct pump-dispensed Automotive LPG fuel for bi-fuel and dedicated LPG cars, taxis, and vans at our Gloucestershire service stations.',
    0.89,
    5000,
    '/src/assets/image-1.png',
    jsonb_build_object(
        'usage_type', 'AUTOGAS',
        'gas_type', 'Autogas (Automotive LPG)',
        'cylinder_size', 'Per Litre Forecourt Dispensed',
        'deposit_price', 0,
        'refill_price', 0.89,
        'delivery_charge', 0,
        'is_gas_product', true,
        'is_active', true,
        'features', jsonb_build_array(
            'EN 589 compliant automotive grade LPG fuel',
            'High octane 105+ for smooth engine performance and low emissions',
            'Available at Fromebridge and Wild Goose Garage forecourts',
            'Compatible with all UK bayonet filler nozzles'
        ),
        'suitable_for', jsonb_build_array(
            'LPG Cars & Taxis',
            'Bi-fuel Vans & Light Commercials',
            'Motorhomes & Campervan Refillable Autogas Tanks'
        )
    )
),
(
    'Commercial Fleet Vehicle Autogas Account (Metered Keycard)',
    'commercial-fleet-autogas-account',
    'John Stayte Services',
    'vehicle-lpg-autogas',
    'Commercial Fleet LPG Refuelling',
    'Commercial fleet autogas account for local businesses, delivery fleets, and taxi operators with weekly itemised invoicing and keycard pump access.',
    0.84,
    10000,
    '/src/assets/image-1.png',
    jsonb_build_object(
        'usage_type', 'AUTOGAS',
        'gas_type', 'Autogas (Automotive LPG)',
        'cylinder_size', 'Per Litre Fleet Account',
        'deposit_price', 0,
        'refill_price', 0.84,
        'delivery_charge', 0,
        'is_gas_product', true,
        'is_active', true,
        'features', jsonb_build_array(
            'Dedicated fleet driver RFID keycard access',
            'Discounted commercial fleet tariff per litre',
            'Weekly consolidated VAT invoicing',
            '24/7 automated forecourt refuelling authorization'
        ),
        'suitable_for', jsonb_build_array(
            'Commercial Van Fleets',
            'Taxi & Private Hire Operators',
            'Municipal & Utility Vehicles'
        )
    )
),
(
    'UK Bayonet to Euro Dish & ACME Autogas Adapter Kit',
    'uk-bayonet-to-euro-autogas-adapter-kit',
    'John Stayte Services',
    'vehicle-lpg-autogas',
    'Autogas Adapters & Connectors',
    'Solid brass precision-machined vehicle LPG refuelling adapter kit for travelling between the UK and Continental Europe.',
    24.99,
    60,
    '/src/assets/image-4.png',
    jsonb_build_object(
        'usage_type', 'AUTOGAS',
        'gas_type', 'Hardware & Adapter',
        'cylinder_size', 'Standard Fitting Kit',
        'deposit_price', 0,
        'refill_price', 24.99,
        'delivery_charge', 0,
        'is_gas_product', true,
        'is_active', true,
        'features', jsonb_build_array(
            'High-grade solid brass construction with leak-proof seals',
            'Converts UK W21.8 bayonet filler to European Dish & ACME',
            'Protective storage pouch included',
            'Tested to 30 bar pressure rating'
        ),
        'suitable_for', jsonb_build_array(
            'European Touring Vehicles',
            'Motorhomes & Campervans',
            'Imported LPG Vehicles'
        )
    )
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    specs = EXCLUDED.specs;
