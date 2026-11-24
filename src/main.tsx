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
const state = document.getElementById("query-state")?.textContent;
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      // A generated document is a build snapshot. Always verify its public data
      // after hydration, including when a deployment is less than 30 seconds old.
      refetchOnMount: state ? "always" : true,
    },
  },
});
const root = document.getElementById("root")!;
const app = (
  <QueryClientProvider client={client}>
    <HydrationBoundary state={state ? JSON.parse(state) : undefined}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HydrationBoundary>
  </QueryClientProvider>
);
if (state) hydrateRoot(root, app);
else createRoot(root).render(app);
