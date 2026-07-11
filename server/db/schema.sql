CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'paid',
  subtotal NUMERIC(10, 2) NOT NULL,
  shipping_fee NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  shipping_full_name TEXT NOT NULL,
  shipping_email TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_card_last4 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

INSERT INTO categories (id, name, icon) VALUES
  ('electronics', 'Electronics', '💻'),
  ('clothing', 'Clothing', '👕'),
  ('home-kitchen', 'Home & Kitchen', '🏠'),
  ('books', 'Books', '📚'),
  ('sports', 'Sports & Outdoors', '⚽')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, category_id, name, description, price, stock, image, rating) VALUES
  ('elec-wireless-headphones', 'electronics', 'Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.', 129.99, 18, '🎧', 4.6),
  ('elec-smartwatch', 'electronics', 'Fitness Smartwatch', 'Track heart rate, sleep, and workouts with a 7-day battery and always-on display.', 89.50, 24, '⌚', 4.3),
  ('elec-bt-speaker', 'electronics', 'Portable Bluetooth Speaker', 'Compact waterproof speaker with rich bass and 12-hour playtime.', 45.00, 32, '🔊', 4.5),
  ('elec-webcam', 'electronics', '1080p HD Webcam', 'Plug-and-play webcam with auto light correction, ideal for video calls.', 39.99, 0, '📷', 4.1),
  ('elec-power-bank', 'electronics', '20,000mAh Power Bank', 'Fast-charging power bank with dual USB-C ports, charges a phone 4-5 times.', 34.99, 40, '🔋', 4.4),

  ('cloth-denim-jacket', 'clothing', 'Classic Denim Jacket', 'Timeless mid-wash denim jacket with button front and chest pockets.', 59.99, 15, '🧥', 4.2),
  ('cloth-running-shoes', 'clothing', 'Lightweight Running Shoes', 'Breathable mesh running shoes with cushioned sole for daily training.', 74.00, 22, '👟', 4.7),
  ('cloth-wool-sweater', 'clothing', 'Merino Wool Sweater', 'Soft merino wool crew-neck sweater, warm without the bulk.', 65.50, 12, '🧶', 4.5),
  ('cloth-baseball-cap', 'clothing', 'Adjustable Baseball Cap', 'Cotton twill cap with adjustable strap, one size fits most.', 19.99, 50, '🧢', 4.0),

  ('home-coffee-maker', 'home-kitchen', 'Programmable Coffee Maker', '12-cup drip coffee maker with programmable timer and auto shut-off.', 54.99, 14, '☕', 4.4),
  ('home-knife-set', 'home-kitchen', '6-Piece Chef Knife Set', 'High-carbon stainless steel knives with ergonomic handles and wood block.', 79.99, 9, '🔪', 4.6),
  ('home-air-fryer', 'home-kitchen', 'Digital Air Fryer 5.5L', 'Oil-free frying with 8 preset programs and a dishwasher-safe basket.', 99.00, 0, '🍟', 4.5),
  ('home-bedsheet-set', 'home-kitchen', 'Cotton Bedsheet Set (Queen)', 'Soft 400-thread-count cotton sheet set, includes 2 pillowcases.', 42.50, 26, '🛏️', 4.3),

  ('book-scifi-novel', 'books', 'The Last Horizon (Sci-Fi Novel)', 'A gripping tale of survival on humanity''s first deep-space colony.', 14.99, 60, '📖', 4.8),
  ('book-cookbook', 'books', 'Everyday Flavors Cookbook', '120 easy weeknight recipes with step-by-step photos.', 22.00, 17, '📕', 4.5),
  ('book-history', 'books', 'Empires of the Ancient World', 'A sweeping narrative history of the civilizations that shaped antiquity.', 18.50, 21, '📗', 4.4),

  ('sports-yoga-mat', 'sports', 'Non-Slip Yoga Mat', 'Extra-thick 6mm mat with carrying strap for yoga and floor workouts.', 25.99, 35, '🧘', 4.6),
  ('sports-camping-tent', 'sports', '4-Person Camping Tent', 'Weatherproof dome tent with quick setup, includes rainfly and stakes.', 119.99, 6, '⛺', 4.5),
  ('sports-basketball', 'sports', 'Official Size Basketball', 'Indoor/outdoor composite leather basketball, official size and weight.', 29.99, 28, '🏀', 4.3),
  ('sports-dumbbell-set', 'sports', 'Adjustable Dumbbell Set', 'Pair of adjustable dumbbells, 5-50 lbs each, space-saving design.', 149.00, 5, '🏋️', 4.7)
ON CONFLICT (id) DO NOTHING;
