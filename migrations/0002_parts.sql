ALTER TABLE tasks ADD COLUMN part TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_tasks_user_name ON tasks(user_id, name, date);
