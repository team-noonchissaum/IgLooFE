import { api, unwrapData } from "@/lib/api";
import { normalizeCategoriesBySeed } from "@/lib/categoryMapping";
import type { Category } from "@/lib/types";

/** GET /api/categories - ApiResponse 없이 List<CategoryListRes> 직접 반환 */
export const categoryApi = {
  list: () =>
    api
      .get<Category[]>("/api/categories")
      .then((r) => normalizeCategoriesBySeed(r.data)),

  /** POST /api/categories - 카테고리 추가 (관리자) */
  add: (body: { parentId: number | null; name: string }) =>
    api
      .post<{ message: string; data: { id: number; name: string; parentId: number | null } }>(
        "/api/categories",
        body
      )
      .then(unwrapData),

  /** DELETE /api/categories/{categoryId} - 카테고리 삭제 (관리자, '기타' 제외) */
  delete: (categoryId: number) =>
    api.delete(`/api/categories/${categoryId}`),
};
