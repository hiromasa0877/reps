-- Entries are now saved as completed when registered; finalize older todo/doing rows the same way.
UPDATE tasks
SET status = 'done', done_sets = sets, completed_at = COALESCE(completed_at, updated_at)
WHERE status != 'done';
