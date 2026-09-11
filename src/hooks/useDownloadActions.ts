import { useDownloadFlow } from "./useDownloadFlow";
import { useSettingsActions } from "./useSettingsActions";

/** Combined actions hook for call sites that need settings + download flow. */
export function useDownloadActions() {
  const settings = useSettingsActions();
  const flow = useDownloadFlow();
  return { ...settings, ...flow };
}
