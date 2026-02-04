import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/userApi";
import { walletApi } from "@/services/walletApi";
import { bidApi } from "@/services/bidApi";
import { formatKrw } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

export function MePage() {
  const { data: mypage, isLoading } = useQuery({
    queryKey: ["users", "me", "mypage"],
    queryFn: () => userApi.getMypage(),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMe(),
  });

  const { data: myBidsPage } = useQuery({
    queryKey: ["bid", "my"],
    queryFn: () => bidApi.myBids(),
  });
  const myBids = myBidsPage?.content ?? [];

  if (isLoading || !mypage) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-8">
        <Skeleton className="h-24 w-64 mb-8" />
        <Skeleton className="h-32 w-full rounded-xl mb-6" />
      </main>
    );
  }

  const balance = mypage.balance ?? wallet?.balance ?? 0;

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <div className="flex gap-4 items-center mb-8">
            <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {mypage.profileUrl ? (
                <img
                  src={mypage.profileUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-primary text-3xl">
                  person
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-main">
                {mypage.nickname}
              </h1>
              <p className="text-sm text-text-muted">
                {mypage.email ?? "이메일 없음"}
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <Link
              to="/me/edit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-text-main font-medium transition-colors"
            >
              <span className="material-symbols-outlined">edit</span>
              프로필 수정
            </Link>
            <Link
              to="/wallet"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-text-main font-medium transition-colors"
            >
              <span className="material-symbols-outlined fill-icon">
                account_balance_wallet
              </span>
              지갑
            </Link>
            <Link
              to="/notifications"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-text-main font-medium transition-colors"
            >
              <span className="material-symbols-outlined">notifications</span>
              알림
            </Link>
            <Link
              to="/me/charges"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-text-main font-medium transition-colors"
            >
              <span className="material-symbols-outlined">pending_actions</span>
              충전대기 목록 보기
            </Link>
          </nav>
        </aside>
        <section className="flex-1">
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                account_balance_wallet
              </span>
              지갑 잔액
            </h2>
            <p className="text-3xl font-black text-primary">
              {formatKrw(balance)}
            </p>
            <Link to="/credits/charge" className="inline-block mt-4">
              <span className="text-primary font-semibold text-sm hover:underline">
                충전하기
              </span>
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                gavel
              </span>
              내 입찰 참여 경매
            </h2>
            <ul className="divide-y divide-border">
              {myBids.length === 0 ? (
                <li className="py-8 text-center text-text-muted">
                  참여한 경매가 없습니다.
                </li>
              ) : (
                myBids.slice(0, 10).map((b) => (
                  <li
                    key={`${b.auctionId}-${b.myHighestBidPrice}`}
                    className="py-3 flex justify-between items-center"
                  >
                    <Link
                      to={`/auctions/${b.auctionId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {b.itemTitle} (경매 #{b.auctionId})
                    </Link>
                    <span className="font-bold">
                      {formatKrw(b.myHighestBidPrice)}
                      {b.isHighestBidder && (
                        <span className="text-primary text-xs ml-1">
                          최고가
                        </span>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="text-sm text-text-muted mt-4">
              내 등록 경매 목록은 서버 미지원으로 표시되지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
