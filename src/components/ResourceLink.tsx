import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useAuthDialogs } from "../auth/AuthDialogs";
import { safeUrl } from "../models/content";

export function ResourceLink({
  url,
  children,
  requiresLogin = false,
  newTab = false,
  className = "btn btn--outline",
}: {
  url: string;
  children: ReactNode;
  requiresLogin?: boolean;
  newTab?: boolean;
  className?: string;
}) {
  const { user } = useAuth();
  const { openAuth } = useAuthDialogs();
  const destination = safeUrl(url);
  if (!destination) return null;
  if (requiresLogin && !user)
    return (
      <button className={className} onClick={openAuth}>
        {children}
      </button>
    );
  if (destination.startsWith("/"))
    return (
      <Link to={destination} className={className}>
        {children}
      </Link>
    );
  return (
    <a
      href={destination}
      className={className}
      target={newTab || requiresLogin ? "_blank" : undefined}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
