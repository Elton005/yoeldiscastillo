import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { defaultSiteSettings, type SiteSettings } from "../models/siteSettings";
import { readSiteSettings, siteSettingsKey } from "../services/siteSettings";
const Preview = createContext<SiteSettings | null>(null);
export function useSiteSettingsQuery() {
  return useQuery({
    queryKey: siteSettingsKey,
    queryFn: readSiteSettings,
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 1,
  });
}
export function useSiteSettings() {
  const preview = useContext(Preview);
  const query = useSiteSettingsQuery();
  return preview ?? query.data?.settings ?? defaultSiteSettings;
}
export function SiteSettingsPreview({
  value,
  children,
}: {
  value: SiteSettings;
  children: ReactNode;
}) {
  return <Preview value={value}>{children}</Preview>;
}
