import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

/** GET /api/categories - ApiResponse 없이 List<CategoryListRes> 직접 반환 */
export const categoryApi = {
  list: () => api.get<Category[]>("/api/categories").then((r) => r.data),
};
