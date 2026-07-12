insert into departments (name, status) values ('Engineering', 'Active'), ('Facilities', 'Active'), ('Field Ops', 'Active');
insert into asset_categories (name, extra_fields) values
  ('Electronics', '{"warranty_period_months": 24}'),
  ('Furniture', '{}'),
  ('Vehicles', '{}');
-- Employee rows are created automatically via handle_new_user() on real signup — don't hand-insert auth.users rows.
