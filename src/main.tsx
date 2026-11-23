import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { App } from "./App";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
const state = document.getElementById("query-state")?.textContent;
const root = document.getElementById("root")!;
const app = (
  <QueryClientProvider client={client}>
    <HydrationBoundary state={state ? JSON.parse(state) : undefined}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HydrationBoundary>
  </QueryClientProvider>
);
if (state) hydrateRoot(root, app);
else createRoot(root).render(app);
