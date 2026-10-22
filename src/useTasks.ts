import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, haptic, type Status, type Task, type TaskDraft } from "./api";
import { useToast } from "./components/Toast";

export const STATUS_ORDER: Status[] = ["doing", "todo", "done"];
export const STATUS_META: Record<Status, { label: string; color: string }> = {
  todo: { label: "未着手", color: "#8e96a8" },
  doing: { label: "実施中", color: "#ff9500" },
  done: { label: "完了", color: "#22c55e" },
};
export const nextStatus = (s: Status): Status | null => (s === "todo" ? "doing" : s === "doing" ? "done" : null);
export const prevStatus = (s: Status): Status | null => (s === "done" ? "doing" : s === "doing" ? "todo" : null);

/** Mirrors the server's status/done_sets rules so optimistic updates match the response. */
function applyPatch(t: Task, patch: Partial<Task>): Task {
  const n = { ...t, ...patch };
  n.done_sets = Math.min(Math.max(0, n.done_sets), n.sets);
  if (n.status === "done" && t.status !== "done") n.done_sets = n.sets;
  if (n.status === "todo" && t.status !== "todo") n.done_sets = 0;
  if (n.status === "doing" && n.done_sets >= n.sets) n.done_sets = Math.max(0, n.sets - 1);
  n.completed_at = n.status === "done" ? (t.completed_at ?? Date.now()) : null;
  return n;
}

export function useTasks(date: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["tasks", date];
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const query = useQuery({ queryKey: key, queryFn: () => api.tasks(date), enabled: !!date });

  const setTasks = (fn: (ts: Task[]) => Task[]) => qc.setQueryData<Task[]>(key, (ts) => fn(ts ?? []));
  const refreshSummary = () => qc.invalidateQueries({ queryKey: ["summary"] });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) => api.updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      setTasks((ts) => ts.map((t) => (t.id === id ? applyPatch(t, patch) : t)));
    },
    onSuccess: (saved) => setTasks((ts) => ts.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))),
    onError: () => {
      toast("保存できませんでした");
      qc.invalidateQueries({ queryKey: key });
    },
    onSettled: () => {
      refreshSummary();
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const create = useMutation({
    mutationFn: (items: TaskDraft[]) => api.createTasks(date, items),
    onSuccess: (created) => {
      setTasks((ts) => [...ts, ...created]);
      qc.invalidateQueries({ queryKey: key }); // pick up server-computed "prev" records
      refreshSummary();
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: () => toast("追加できませんでした"),
  });

  const setStatus = useCallback(
    (task: Task, status: Status) => {
      const before = { status: task.status, done_sets: task.done_sets };
      haptic(status === "done" ? [10, 40, 18] : 10);
      update.mutate({ id: task.id, patch: { status } });
      toast(`${task.name} → ${STATUS_META[status].label}`, {
        label: "元に戻す",
        run: () => update.mutate({ id: task.id, patch: before }),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date],
  );

  const setDoneSets = useCallback(
    (task: Task, done_sets: number) => {
      const status: Status = done_sets >= task.sets ? "done" : done_sets > 0 ? "doing" : task.status === "done" ? "doing" : task.status;
      haptic(status === "done" && task.status !== "done" ? [10, 40, 18] : 6);
      update.mutate({ id: task.id, patch: { done_sets, status } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date],
  );

  /** Removes immediately from the UI; the server delete waits until the undo window closes. */
  const remove = useCallback(
    (task: Task) => {
      haptic([6, 30, 6]);
      setTasks((ts) => ts.filter((t) => t.id !== task.id));
      const timer = setTimeout(async () => {
        pendingDeletes.current.delete(task.id);
        await api.deleteTask(task.id).catch(() => qc.invalidateQueries({ queryKey: key }));
        refreshSummary();
      }, 4000);
      pendingDeletes.current.set(task.id, timer);
      toast(`${task.name} を削除`, {
        label: "元に戻す",
        run: () => {
          clearTimeout(pendingDeletes.current.get(task.id));
          pendingDeletes.current.delete(task.id);
          setTasks((ts) => [...ts, task].sort((a, b) => a.position - b.position));
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date],
  );

  return { query, update, create, setStatus, setDoneSets, remove };
}
