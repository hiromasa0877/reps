-- Per-set detail: JSON array of {weight, reps, note}. '[]' on older rows means identical sets from sets/reps/weight.
ALTER TABLE tasks ADD COLUMN set_list TEXT NOT NULL DEFAULT '[]';
-- Total load (sum of weight x reps over sets), stored so summaries stay simple when sets differ.
ALTER TABLE tasks ADD COLUMN volume REAL NOT NULL DEFAULT 0;
UPDATE tasks SET volume = sets * reps * weight;
