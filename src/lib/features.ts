export type FeatureName =
  | "VOICE"
  | "WALLET"
  | "REVIEWS"
  | "CHAT"
  | "AUTO_UPDATE";

const DEFAULTS: Record<FeatureName, boolean> = {
  VOICE: true,
  WALLET: true,
  REVIEWS: true,
  CHAT: true,
  AUTO_UPDATE: false
};

function parseFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;

  return fallback;
}

export function featureEnabled(name: FeatureName): boolean {
  return parseFlag(
    process.env["FEATURE_" + name],
    DEFAULTS[name]
  );
}
