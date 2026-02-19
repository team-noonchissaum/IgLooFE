import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

function showError(el: HTMLElement, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : "";
  el.innerHTML = `
    <div style="padding:20px;font-family:monospace;white-space:pre-wrap;color:#c00;max-width:800px">
      <strong>앱 로드 오류</strong><br/><br/>${msg}
      ${stack ? `<br/><br/>${stack}` : ""}
    </div>
  `;
  console.error(err);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    "<p style='padding:20px;font-family:sans-serif'>#root 요소를 찾을 수 없습니다.</p>";
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });

  import("./App")
    .then(({ default: App }) => {
      ReactDOM.createRoot(rootEl!).render(
        <React.StrictMode>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </React.StrictMode>,
      );
    })
    .catch((err) => showError(rootEl, err));
}
