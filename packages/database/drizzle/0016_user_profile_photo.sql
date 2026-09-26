ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo_key varchar(512);
