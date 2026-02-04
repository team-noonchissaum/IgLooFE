import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "@/services/categoryApi";
import type { Category } from "@/lib/types";

/** 평면 목록을 부모-자식 트리로 변환 (parentId === null 이 최상위) */
function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();
  categories.forEach((c) => {
    byId.set(c.id, { ...c, children: [] });
  });
  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    if (node.parentId == null) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  return roots;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

export function CategorySidebar() {
  const [searchParams] = useSearchParams();
  const currentCategoryId = searchParams.get("categoryId")
    ? Number(searchParams.get("categoryId"))
    : null;

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    retry: false,
  });

  const rootNodes = useMemo(() => buildCategoryTree(categories), [categories]);

  /** 토글된 대분류 ID들 */
  const [expandedRootIds, setExpandedRootIds] = useState<Set<number>>(new Set());

  /** 현재 선택된 카테고리의 부모 대분류를 찾아서 자동으로 펼치기 */
  useEffect(() => {
    if (currentCategoryId == null || categories.length === 0) return;
    
    const byId = new Map(categories.map((c) => [c.id, c]));
    let current: Category | undefined = byId.get(currentCategoryId);
    
    // 현재 카테고리의 최상위 부모(대분류) 찾기
    while (current && current.parentId != null) {
      current = byId.get(current.parentId);
    }
    
    if (current) {
      setExpandedRootIds((prev) => new Set(prev).add(current!.id));
    }
  }, [currentCategoryId, categories]);

  const toggleRoot = (rootId: number) => {
    setExpandedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) {
        next.delete(rootId);
      } else {
        next.add(rootId);
      }
      return next;
    });
  };

  /** 카테고리가 현재 선택된 카테고리 또는 그 하위 카테고리인지 확인 */
  const isCategorySelected = (categoryId: number): boolean => {
    if (currentCategoryId === null) return false;
    if (currentCategoryId === categoryId) return true;
    
    // 하위 카테고리인지 확인
    const byId = new Map(categories.map((c) => [c.id, c]));
    let current: Category | undefined = byId.get(currentCategoryId);
    while (current) {
      if (current.id === categoryId) return true;
      current = current.parentId != null ? byId.get(current.parentId) : undefined;
    }
    return false;
  };

  return (
    <aside className="hidden md:block w-64 shrink-0 bg-white dark:bg-[var(--surface)] border-r border-border">
      <div className="sticky top-[72px] pt-[120px] p-4 max-h-[calc(100vh-72px)] overflow-y-auto">
        <h2 className="text-lg font-bold text-text-main mb-4">카테고리</h2>
        <nav className="flex flex-col gap-1">
          <Link
            to="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentCategoryId == null
                ? "bg-primary text-white"
                : "text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            전체
          </Link>
          {rootNodes.map((root) => {
            const isExpanded = expandedRootIds.has(root.id);
            const hasChildren = root.children.length > 0;
            const isSelected = isCategorySelected(root.id);

            const handleRootClick = () => {
              if (hasChildren) {
                setExpandedRootIds((prev) => {
                  const next = new Set(prev);
                  if (!next.has(root.id)) {
                    next.add(root.id);
                  }
                  return next;
                });
              }
            };

            return (
              <div key={root.id} className="flex flex-col">
                <div className="flex items-center">
                  <Link
                    to={`/?categoryId=${root.id}`}
                    onClick={handleRootClick}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected && !hasChildren
                        ? "bg-primary text-white"
                        : "text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {root.name}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleRoot(root.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isSelected
                          ? "text-white hover:bg-primary/80"
                          : "text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      aria-label={isExpanded ? "접기" : "펼치기"}
                    >
                      <span
                        className={`material-symbols-outlined transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    {root.children.map((child) => {
                      const isChildSelected = isCategorySelected(child.id);
                      return (
                        <Link
                          key={child.id}
                          to={`/?categoryId=${child.id}`}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isChildSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
