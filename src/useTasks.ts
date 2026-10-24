import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, haptic, type Task, type TaskDraft } from "./api";
import { useToast } from "./components/Toast";

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
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
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

  return { query, update, create, remove };
}
