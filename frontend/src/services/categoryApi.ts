import { api, unwrapData } from "@/lib/api";
import type { Category } from "@/lib/types";

/** GET /api/categories - ApiResponse 없이 List<CategoryListRes> 직접 반환 */
export const categoryApi = {
  list: () =>
    api
      .get<Category[]>("/api/categories")
      .then((r) =>
        [...r.data].sort((a, b) => {
          const aParent = a.parentId ?? 0;
          const bParent = b.parentId ?? 0;
          if (aParent !== bParent) return aParent - bParent;
          const nameCmp = a.name.localeCompare(b.name, "ko");
          if (nameCmp !== 0) return nameCmp;
          return a.id - b.id;
        })
      ),

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
