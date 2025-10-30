import { redirect } from "react-router-dom";
import { authFetch } from "../utils/api";

export type Task = { 
  id: number; 
  title: string; 
  done: boolean;
  createdAt: string;
  assignedToId?: number;
  assignedTo?: {
    id: number;
    email: string;
    profile?: {
      fullName?: string;
    };
  };
};

export type PaginatedTaskResponse = {
  tasks: Task[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export async function tasksLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  
  const res = await authFetch(`/api/tasks?page=${page}&limit=${limit}`);
  return (await res.json()) as PaginatedTaskResponse;
}

export async function createTaskAction({ request }: { request: Request }) {
  const form = await request.formData();
  const intent = String(form.get("intent") || "create");
  
  if (intent === "delete") {
    const taskId = String(form.get("taskId"));
    await authFetch(`/api/tasks/${taskId}`, {
      method: "DELETE"
    });
    return redirect("/");
  }
  
  if (intent === "update") {
    const taskId = String(form.get("taskId"));
    const title = String(form.get("title") || "");
    const assignedToId = String(form.get("assignedToId") || "");
    const done = form.get("done") === "true";
    
    await authFetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title,
        assignedToId: assignedToId || undefined,
        done
      })
    });
    return redirect("/");
  }
  
  // Default create action
  const title = String(form.get("title") || "");
  const assignedToId = String(form.get("assignedToId") || "");
  
  await authFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      title,
      assignedToId: assignedToId || undefined
    })
  });
  return redirect("/");
}
