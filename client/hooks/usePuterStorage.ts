import { useState, useEffect, useCallback } from "react";

export interface ApiKey {
  id: string;
  label: string;
  username: string;
  key: string;
  createdAt: number;
}

const STORAGE_KEY = "api_keys";

export const usePuterStorage = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load keys from puter storage
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const puter = (window as any).puter;
        if (!puter) {
          throw new Error("Puter not initialized");
        }

        const data = await puter.kv.get(STORAGE_KEY);
        if (data) {
          setKeys(JSON.parse(data));
        }
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load keys from puter storage:", err);
        setError((err as Error).message);
        setIsLoaded(true);
      }
    };

    loadKeys();
  }, []);

  // Save keys to puter storage
  const saveKeys = useCallback(async (newKeys: ApiKey[]) => {
    try {
      const puter = (window as any).puter;
      if (!puter) {
        throw new Error("Puter not initialized");
      }

      await puter.kv.set(STORAGE_KEY, JSON.stringify(newKeys));
      setKeys(newKeys);
      return true;
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      console.error("Failed to save keys to puter storage:", err);
      return false;
    }
  }, []);

  const addKey = useCallback(
    async (label: string, username: string, key: string) => {
      const newKey: ApiKey = {
        id: Date.now().toString(),
        label,
        username: username || "MISC",
        key,
        createdAt: Date.now(),
      };
      const updated = [...keys, newKey];
      return saveKeys(updated);
    },
    [keys, saveKeys],
  );

  const updateKey = useCallback(
    async (id: string, label: string, username: string, key: string) => {
      const updated = keys.map((k) =>
        k.id === id ? { ...k, label, username: username || "MISC", key } : k,
      );
      return saveKeys(updated);
    },
    [keys, saveKeys],
  );

  const deleteKey = useCallback(
    async (id: string) => {
      const updated = keys.filter((k) => k.id !== id);
      return saveKeys(updated);
    },
    [keys, saveKeys],
  );

  const exportKeys = useCallback(() => {
    const dataStr = JSON.stringify(keys, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `api-keys-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [keys]);

  // Parse text format API keys (PROVIDER=..., USERNAME=..., KEY=...)
  const parseTextFormat = (text: string): ApiKey[] => {
    const lines = text.split("\n");
    const parsed: ApiKey[] = [];
    let currentKey: { label?: string; username?: string; key?: string } = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        // If we have a complete key, add it
        if (currentKey.label && currentKey.key) {
          parsed.push({
            id: Date.now().toString() + Math.random(),
            label: currentKey.label,
            username: currentKey.username || "MISC",
            key: currentKey.key,
            createdAt: Date.now(),
          });
          currentKey = {};
        }
        continue;
      }

      // Parse PROVIDER=value
      if (trimmed.startsWith("PROVIDER=")) {
        const value = trimmed
          .replace("PROVIDER=", "")
          .replace(/,+$/, "")
          .trim();
        if (value) currentKey.label = value;
      }

      // Parse KEY=value
      if (trimmed.startsWith("KEY=")) {
        const value = trimmed.replace("KEY=", "").replace(/,+$/, "").trim();
        if (value) currentKey.key = value;
      }

      // Parse USERNAME=value
      if (trimmed.startsWith("USERNAME=")) {
        const value = trimmed
          .replace("USERNAME=", "")
          .replace(/,+$/, "")
          .trim();
        if (value) currentKey.username = value;
      }
    }

    // Add last key if exists
    if (currentKey.label && currentKey.key) {
      parsed.push({
        id: Date.now().toString() + Math.random(),
        label: currentKey.label,
        username: currentKey.username || "MISC",
        key: currentKey.key,
        createdAt: Date.now(),
      });
    }

    return parsed;
  };

  const importKeys = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();

        let imported: ApiKey[] = [];

        // Try JSON first
        try {
          const jsonData = JSON.parse(text) as ApiKey[];
          if (Array.isArray(jsonData)) {
            imported = jsonData;
          }
        } catch {
          // Not JSON, try text format
          imported = parseTextFormat(text);
        }

        // If no keys found, try text format as fallback
        if (imported.length === 0) {
          imported = parseTextFormat(text);
        }

        if (imported.length === 0) {
          throw new Error(
            "No API keys found in file. Supported formats: JSON array or KEY=value text format.",
          );
        }

        // Validate structure
        for (const item of imported) {
          if (
            !item.label ||
            !item.key ||
            typeof item.label !== "string" ||
            typeof item.key !== "string"
          ) {
            throw new Error(
              "Invalid format: each item must have a label and a valid key",
            );
          }
        }

        // Merge with existing keys, avoiding duplicates by label
        const existingLabels = new Set(keys.map((k) => k.label));
        const newKeys = imported.filter((k) => !existingLabels.has(k.label));

        if (newKeys.length === 0) {
          throw new Error(
            "All keys in the imported file already exist (duplicates detected).",
          );
        }

        const merged = [
          ...keys,
          ...newKeys.map((k) => ({
            ...k,
            id: k.id || Date.now().toString(),
            createdAt: k.createdAt || Date.now(),
          })),
        ];

        return saveKeys(merged);
      } catch (err) {
        const errorMsg = (err as Error).message;
        setError(errorMsg);
        console.error("Failed to import keys:", err);
        return false;
      }
    },
    [keys, saveKeys],
  );

  return {
    keys,
    isLoaded,
    error,
    addKey,
    updateKey,
    deleteKey,
    exportKeys,
    importKeys,
    setError,
  };
};
