-- 016: Nearby places, reviews, and housing listings

-- ========================================
-- NEARBY PLACES (Mess, Hostel, PG, Tiffin, etc.)
-- ========================================

CREATE TABLE IF NOT EXISTS nearby_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  location_text text,
  maps_url text,
  price_range text,
  cover_image_url text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nearby_places_category ON nearby_places(category);
CREATE INDEX IF NOT EXISTS idx_nearby_places_created_at ON nearby_places(created_at DESC);

-- ========================================
-- NEARBY REVIEWS
-- ========================================

CREATE TABLE IF NOT EXISTS nearby_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES nearby_places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rating_food smallint CHECK (rating_food >= 1 AND rating_food <= 5),
  rating_hygiene smallint CHECK (rating_hygiene >= 1 AND rating_hygiene <= 5),
  rating_price smallint CHECK (rating_price >= 1 AND rating_price <= 5),
  rating_quantity smallint CHECK (rating_quantity >= 1 AND rating_quantity <= 5),
  rating_cleanliness smallint CHECK (rating_cleanliness >= 1 AND rating_cleanliness <= 5),
  rating_safety smallint CHECK (rating_safety >= 1 AND rating_safety <= 5),
  rating_location smallint CHECK (rating_location >= 1 AND rating_location <= 5),
  rating_value smallint CHECK (rating_value >= 1 AND rating_value <= 5),
  review text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(place_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_nearby_reviews_place ON nearby_reviews(place_id);

-- ========================================
-- HOUSING LISTINGS (Room, Flat, PG availability, Roommate)
-- ========================================

CREATE TABLE IF NOT EXISTS housing_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  listing_type text NOT NULL,
  title text NOT NULL,
  description text,
  rent numeric,
  deposit numeric,
  sharing_type text,
  location_text text,
  maps_url text,
  availability_status text NOT NULL DEFAULT 'available',
  whatsapp_number text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_listings_type ON housing_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_housing_listings_availability ON housing_listings(availability_status);
CREATE INDEX IF NOT EXISTS idx_housing_listings_created_at ON housing_listings(created_at DESC);

-- ========================================
-- HOUSING LISTING IMAGES
-- ========================================

CREATE TABLE IF NOT EXISTS housing_listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES housing_listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_listing_images_listing ON housing_listing_images(listing_id);

-- ========================================
-- HOUSING INTERESTS (contact tracking)
-- ========================================

CREATE TABLE IF NOT EXISTS housing_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES housing_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_housing_interests_listing ON housing_interests(listing_id);

-- ========================================
-- RLS
-- ========================================

ALTER TABLE nearby_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_nearby_places" ON nearby_places FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_nearby_places" ON nearby_places FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "update_own_nearby_place" ON nearby_places FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "delete_own_nearby_place" ON nearby_places FOR DELETE TO authenticated USING (auth.uid() = created_by);

ALTER TABLE nearby_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_nearby_reviews" ON nearby_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_nearby_reviews" ON nearby_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_nearby_review" ON nearby_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete_own_nearby_review" ON nearby_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE housing_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_housing_listings" ON housing_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_housing_listings" ON housing_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_housing_listing" ON housing_listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "delete_own_housing_listing" ON housing_listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);

ALTER TABLE housing_listing_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_housing_listing_images" ON housing_listing_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_housing_listing_images" ON housing_listing_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM housing_listings WHERE id = listing_id AND owner_id = auth.uid())
);
CREATE POLICY "delete_own_housing_listing_image" ON housing_listing_images FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM housing_listings WHERE id = listing_id AND owner_id = auth.uid())
);

ALTER TABLE housing_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_housing_interests" ON housing_interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_housing_interests" ON housing_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_housing_interests" ON housing_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);
