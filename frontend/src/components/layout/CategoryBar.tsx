import { useMemo, useState } from "react";
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

/** 트리에서 id로 노드 찾기 */
function findNode(nodes: CategoryNode[], id: number): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inChild = findNode(n.children, id);
    if (inChild) return inChild;
  }
  return null;
}

/** 현재 선택된 카테고리 경로 (루트 → 리프) 이름 배열. id에 해당하는 카테고리가 없으면 빈 배열 */
function getCategoryPath(categories: Category[], id: number): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: string[] = [];
  let cur: Category | undefined = byId.get(id);
  while (cur) {
    path.unshift(cur.name);
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function CategoryBar() {
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

  /** 현재 선택 카테고리 경로 (브레드크럼용) */
  const breadcrumbPath = useMemo(
    () =>
      currentCategoryId != null && !Number.isNaN(currentCategoryId)
        ? getCategoryPath(categories, currentCategoryId)
        : [],
    [categories, currentCategoryId]
  );

  /** 호버 중인 최상위 카테고리 */
  const [hoverRootId, setHoverRootId] = useState<number | null>(null);
  /** 플라이아웃 체인: 컬럼1에서 호버 중인 노드 id, 컬럼2에서 호버 중인 노드 id, ... (각 노드는 자식이 있음) */
  const [hoverChain, setHoverChain] = useState<number[]>([]);

  const hoverRoot = rootNodes.find((r) => r.id === hoverRootId);

  const closeDropdown = () => {
    setHoverRootId(null);
    setHoverChain([]);
  };

  /** 컬럼 0: 루트의 자식들 */
  const column0Children = hoverRoot?.children ?? [];

  /** 컬럼 i (i>=1): hoverChain[i-1] 노드의 자식들 */
  const getColumnChildren = (columnIndex: number): CategoryNode[] => {
    if (columnIndex === 0) return column0Children;
    const nodeId = hoverChain[columnIndex - 1];
    if (nodeId == null) return [];
    const node = findNode(rootNodes, nodeId);
    return node?.children ?? [];
  };

  /** 컬럼 0의 한 행에 마우스 올림 */
  const onColumn0RowEnter = (node: CategoryNode) => {
    if (node.children.length > 0) setHoverChain([node.id]);
    else setHoverChain([]);
  };

  /** 컬럼 i (i>=1)의 한 행에 마우스 올림 */
  const onColumnRowEnter = (columnIndex: number, node: CategoryNode) => {
    if (node.children.length > 0) {
      setHoverChain((prev) => {
        const next = prev.slice(0, columnIndex);
        next.push(node.id);
        return next;
      });
    } else {
      setHoverChain((prev) => prev.slice(0, columnIndex));
    }
  };

  /** 드롭다운 전체에 마우스 나감 */
  const onDropdownLeave = () => {
    setHoverRootId(null);
    setHoverChain([]);
  };

  const showDropdown =
    hoverRootId != null &&
    (column0Children.length > 0 || hoverChain.length > 0);

  return (
    <nav className="sticky top-[72px] z-40 w-full bg-white border-b border-border shadow-sm">
      <div
        className="max-w-[1200px] mx-auto w-full px-6 relative"
        onMouseLeave={onDropdownLeave}
      >
        {/* 최상단 카테고리 바 */}
        <ul className="flex items-center gap-1 min-h-[48px]">
          <li className="flex items-center">
            <Link
              to="/"
              className={`px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                currentCategoryId == null
                  ? "text-primary bg-primary/10"
                  : "text-text-main hover:bg-[#f8f9fa]"
              }`}
            >
              전체
            </Link>
          </li>
          {rootNodes.map((root) => (
            <li
              key={root.id}
              className="relative"
              onMouseEnter={() => {
                setHoverRootId(root.id);
                setHoverChain([]);
              }}
            >
              <Link
                to={`/?categoryId=${root.id}`}
                onClick={closeDropdown}
                className={`inline-flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                  currentCategoryId === root.id
                    ? "text-primary bg-primary/10"
                    : "text-text-main hover:bg-[#f8f9fa]"
                }`}
              >
                {root.name}
                {root.children.length > 0 && (
                  <span className="material-symbols-outlined text-base ml-0.5 opacity-70">
                    expand_more
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* 플라이아웃: 호버 시 첫 블록 아래, 그 다음은 옆에 새 블록이 붙는 형태 */}
        {showDropdown && hoverRoot && (
          <div className="absolute left-6 right-6 top-full pt-0 z-50">
            <div className="bg-white rounded-xl border border-border shadow-lg py-2 flex min-h-[120px]">
              {/* 컬럼 0: 루트의 직계 자식 */}
              <div className="flex flex-col min-w-[200px] border-r border-border pr-1">
                <ul className="py-1">
                  {column0Children.map((child) => (
                    <li
                      key={child.id}
                      onMouseEnter={() => onColumn0RowEnter(child)}
                    >
                      <Link
                        to={`/?categoryId=${child.id}`}
                        onClick={closeDropdown}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm w-full text-left rounded-lg mx-1 transition-colors ${
                          currentCategoryId === child.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-text-main hover:bg-[#f8f9fa]"
                        }`}
                      >
                        <span>{child.name}</span>
                        {child.children.length > 0 && (
                          <span className="material-symbols-outlined text-lg text-text-muted">
                            chevron_right
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {/* 컬럼 1, 2, ...: 호버한 항목의 자식들이 옆 블록으로 */}
              {hoverChain.map((_, idx) => {
                const children = getColumnChildren(idx + 1);
                if (children.length === 0) return null;
                return (
                  <div
                    key={idx}
                    className="flex flex-col min-w-[200px] border-r border-border last:border-r-0 px-1"
                  >
                    <ul className="py-1">
                      {children.map((child) => (
                        <li
                          key={child.id}
                          onMouseEnter={() => onColumnRowEnter(idx + 1, child)}
                        >
                          <Link
                            to={`/?categoryId=${child.id}`}
                            onClick={closeDropdown}
                            className={`flex items-center justify-between px-4 py-2.5 text-sm w-full text-left rounded-lg mx-1 transition-colors ${
                              currentCategoryId === child.id
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-text-main hover:bg-[#f8f9fa]"
                            }`}
                          >
                            <span>{child.name}</span>
                            {child.children.length > 0 && (
                              <span className="material-symbols-outlined text-lg text-text-muted">
                                chevron_right
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 현재 카테고리 경로 브레드크럼 (카테고리 선택 시에만) */}
        {breadcrumbPath.length > 0 && (
          <div className="flex items-center gap-1.5 py-2 text-sm text-text-muted border-t border-border/50">
            <span className="font-medium text-text-main">현재 카테고리</span>
            <span className="text-border">|</span>
            <span className="font-medium text-primary">
              {breadcrumbPath.join(" > ")}
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
