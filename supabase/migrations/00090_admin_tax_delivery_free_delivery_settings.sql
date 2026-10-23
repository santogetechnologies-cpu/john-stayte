-- Migration 00090: Configure Admin-controlled Tax & VAT Settings, Delivery Settings, and Free Delivery Settings
-- Establishes initial approved defaults in cms_content_blocks under 'admin_system_settings':
-- * Initial configured VAT rate: 0% (£0.00 initial VAT amount)
-- * Initial configured delivery fee: £0.00
-- * Initial configured free delivery threshold: £0.00 (with explicit eligibility rule flag)
-- Preserves all existing products, inventory, orders, customer records, and RLS policies.

INSERT INTO public.cms_content_blocks (section_key, title, content)
VALUES (
  'admin_system_settings',
  'Admin System Settings',
  '{"platformName":"John Stayte Services — Admin Portal","businessName":"John Stayte Services Ltd","supportEmail":"admin@jss.com","phone":"01452 741234","operatingHours":"Mon–Sat 7:00–20:00 · Sun 8:00–18:00","vatRate":0,"fuelVatRate":0,"taxPricingMode":"exclusive","taxEnabled":false,"taxCategories":{"standard":0,"reducedFuel":0,"zeroRated":0},"defaultShippingFee":0,"deliveryChargesEnabled":false,"deliveryTierName":"Standard Fleet Delivery","freeDeliveryEnabled":false,"freeDeliveryThreshold":0,"minOrderValue":15,"deliverySlaDays":2,"autoApproveOrders":false,"emailAlerts":true,"lowStockAlerts":true}'
)
ON CONFLICT (section_key) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();
