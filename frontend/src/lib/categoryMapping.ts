import type { Category } from "@/lib/types";

type CategorySeed = {
  id: number;
  name: string;
  parentId: number | null;
};

// backend/src/main/resources/category.sql 기준
const CATEGORY_SEED: CategorySeed[] = [
  { id: 1, name: "전자기기/IT", parentId: null },
  { id: 2, name: "모바일", parentId: 1 },
  { id: 3, name: "컴퓨터", parentId: 1 },
  { id: 4, name: "카메라/촬영기기", parentId: 1 },
  { id: 5, name: "게임", parentId: 1 },
  { id: 6, name: "패션/의류", parentId: null },
  { id: 7, name: "의류", parentId: 6 },
  { id: 8, name: "신발", parentId: 6 },
  { id: 9, name: "가방", parentId: 6 },
  { id: 10, name: "잡화", parentId: 6 },
  { id: 11, name: "뷰티/미용", parentId: null },
  { id: 12, name: "화장품", parentId: 11 },
  { id: 13, name: "미용기기", parentId: 11 },
  { id: 14, name: "생활/가정", parentId: null },
  { id: 15, name: "가전", parentId: 14 },
  { id: 16, name: "가구", parentId: 14 },
  { id: 17, name: "생활용품", parentId: 14 },
  { id: 18, name: "스포츠/레저", parentId: null },
  { id: 19, name: "운동기구", parentId: 18 },
  { id: 20, name: "아웃도어", parentId: 18 },
  { id: 21, name: "스포츠용품", parentId: 18 },
  { id: 22, name: "자동차/모빌리티", parentId: null },
  { id: 23, name: "자동차", parentId: 22 },
  { id: 24, name: "오토바이", parentId: 22 },
  { id: 25, name: "부품/용품", parentId: 22 },
  { id: 26, name: "도서/취미", parentId: null },
  { id: 27, name: "도서", parentId: 26 },
  { id: 28, name: "취미", parentId: 26 },
  { id: 29, name: "수집품", parentId: 26 },
  { id: 30, name: "티켓/상품권", parentId: null },
  { id: 31, name: "공연/이벤트", parentId: 30 },
  { id: 32, name: "상품권", parentId: 30 },
  { id: 33, name: "기타", parentId: null },
  { id: 34, name: "기타물품", parentId: 33 },
];

const seedById = new Map<number, CategorySeed>(
  CATEGORY_SEED.map((category) => [category.id, category])
);

const seedOrderById = new Map<number, number>(
  CATEGORY_SEED.map((category, index) => [category.id, index])
);

export function normalizeCategoriesBySeed(categories: Category[]): Category[] {
  const normalized = categories.map((category) => {
    const seed = seedById.get(category.id);
    if (!seed) return category;
    return {
      id: seed.id,
      name: seed.name,
      parentId: seed.parentId,
    };
  });

  return normalized.sort((a, b) => {
    const orderA = seedOrderById.get(a.id);
    const orderB = seedOrderById.get(b.id);
    if (orderA != null && orderB != null) return orderA - orderB;
    if (orderA != null) return -1;
    if (orderB != null) return 1;
    return a.id - b.id;
  });
}

