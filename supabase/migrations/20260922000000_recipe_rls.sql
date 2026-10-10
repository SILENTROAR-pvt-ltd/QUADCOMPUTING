ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can full access recipe_ingredients" ON recipe_ingredients
FOR ALL
USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);
