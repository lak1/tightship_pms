-- Seed common delivery platforms
INSERT INTO platforms (id, name, type, "logoUrl", settings, "isActive") VALUES
  ('deliveroo', 'Deliveroo', 'DELIVERY', null, '{"apiBaseUrl": "https://api.deliveroo.com"}', true),
  ('uber-eats', 'Uber Eats', 'DELIVERY', null, '{"apiBaseUrl": "https://api.uber.com"}', true),
  ('just-eat', 'Just Eat', 'DELIVERY', null, '{"apiBaseUrl": "https://api.just-eat.com"}', true),
  ('doordash', 'DoorDash', 'DELIVERY', null, '{"apiBaseUrl": "https://api.doordash.com"}', true),
  ('grubhub', 'Grubhub', 'DELIVERY', null, '{"apiBaseUrl": "https://api.grubhub.com"}', true),
  ('website', 'Website', 'WEBSITE', null, '{}', true)
ON CONFLICT (name) DO NOTHING;