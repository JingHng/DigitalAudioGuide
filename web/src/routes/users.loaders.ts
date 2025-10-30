import { authFetch } from "../utils/api";

export type Role = { id: number; name: string };
export type User = { id: number; email: string; profile?: { fullName?: string }; roles: { role: Role }[] };

export type PaginatedUserResponse = {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export async function usersLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  
  const res = await authFetch(`/api/users?page=${page}&limit=${limit}`);
  return (await res.json()) as PaginatedUserResponse;
}
