import { useState, useRef, useMemo, useEffect } from "react";
import { usePuterStorage, ApiKey } from "@/hooks/usePuterStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit2,
  Download,
  Upload,
  Plus,
  Check,
  X,
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

export default function ApiKeyManager() {
  const {
    keys,
    isLoaded,
    error,
    addKey,
    updateKey,
    deleteKey,
    exportKeys,
    importKeys,
    setError,
  } = usePuterStorage();

  const [provider, setProvider] = useState("");
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUsernames, setExpandedUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [saveToKvLoading, setSaveToKvLoading] = useState(false);
  const [fetchFromKvLoading, setFetchFromKvLoading] = useState(false);
  const [saveToKvMessage, setSaveToKvMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fetchFromKvMessage, setFetchFromKvMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [puterUser, setPuterUser] = useState<{ username?: string } | null>(
    null,
  );

  // Check Puter auth status on mount
  useEffect(() => {
    const checkPuterAuth = async () => {
      try {
        const puter = (window as any).puter;
        if (puter && puter.auth) {
          const user = await puter.auth.getUser();
          setPuterUser(user);
        }
      } catch (err) {
        console.log("Not authenticated with Puter yet");
      }
    };
    checkPuterAuth();
  }, []);

  const handlePuterSignIn = async () => {
    try {
      const puter = (window as any).puter;
      if (puter && puter.auth) {
        await puter.auth.signIn();
        const user = await puter.auth.getUser();
        setPuterUser(user);
        toast.success(`Signed in as ${user?.username || "User"}`);
      }
    } catch (err) {
      console.error("Puter auth error:", err);
      toast.error("Failed to sign in with Puter");
    }
  };

  const handleSignOut = async () => {
    try {
      const puter = (window as any).puter;
      if (puter && puter.auth) {
        await puter.auth.signOut();
        setPuterUser(null);
        setShowUserMenu(false);
        toast.success("Signed out successfully");
      }
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out");
    }
  };

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedKeys(newRevealed);
  };

  const toggleExpandProvider = (providerName: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerName)) {
      newExpanded.delete(providerName);
    } else {
      newExpanded.add(providerName);
    }
    setExpandedProviders(newExpanded);
  };

  const toggleExpandUsername = (key: string) => {
    const newExpanded = new Set(expandedUsernames);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedUsernames(newExpanded);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const handleAddOrUpdate = async () => {
    if (!provider.trim() || !key.trim()) {
      toast.error("Please fill in Provider and API Key");
      return;
    }

    const finalUsername = username.trim() || "MISC";
    let success = false;

    if (editingId) {
      success = await updateKey(editingId, provider, finalUsername, key);
      if (success) {
        toast.success("Key updated successfully");
        setEditingId(null);
        setShowEditModal(false);
      }
    } else {
      success = await addKey(provider, finalUsername, key);
      if (success) {
        toast.success("Key added successfully");
      }
    }

    if (success) {
      setProvider("");
      setUsername("");
      setKey("");
    }
  };

  const handleEdit = (apiKey: ApiKey) => {
    setEditingId(apiKey.id);
    setProvider(apiKey.label);
    setUsername(apiKey.username);
    setKey(apiKey.key);
    setShowEditModal(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setProvider("");
    setUsername("");
    setKey("");
    setShowEditModal(false);
  };

  const handleDeleteKey = async (id: string) => {
    const success = await deleteKey(id);
    if (success) {
      toast.success("Key deleted successfully");
      setRevealedKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    if (keys.length === 0) {
      toast.error("No keys to export");
      return;
    }
    exportKeys();
    toast.success("Keys exported successfully");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await importKeys(file);
    if (success) {
      toast.success("Keys imported successfully");
    } else {
      toast.error("Failed to import keys");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveToKV = async () => {
    setSaveToKvLoading(true);
    setSaveToKvMessage(null);

    try {
      const puter = (window as any).puter;
      if (!puter || !puter.kv) {
        throw new Error("Puter KV not available");
      }

      const dataToSave = JSON.stringify(keys, null, 2);
      await puter.kv.set("api_keys", dataToSave);

      setSaveToKvMessage({
        type: "success",
        text: `Successfully saved ${keys.length} API keys to Puter KV Store`,
      });
      toast.success("Keys saved to Puter KV Store");
    } catch (err) {
      const errorMsg = (err as Error).message;
      setSaveToKvMessage({
        type: "error",
        text: `Failed to save to KV: ${errorMsg}`,
      });
      toast.error(`Failed to save: ${errorMsg}`);
    } finally {
      setSaveToKvLoading(false);
    }
  };

  const handleFetchFromKV = async () => {
    setFetchFromKvLoading(true);
    setFetchFromKvMessage(null);

    try {
      const puter = (window as any).puter;
      if (!puter || !puter.kv) {
        throw new Error("Puter KV not available");
      }

      const data = await puter.kv.get("api_keys");
      if (!data) {
        throw new Error("No saved keys found in Puter KV Store");
      }

      const fetchedKeys: ApiKey[] = JSON.parse(data);
      if (!Array.isArray(fetchedKeys)) {
        throw new Error("Invalid data format in KV Store");
      }

      if (fetchedKeys.length === 0) {
        throw new Error("No keys found in Puter KV Store");
      }

      // Merge with existing keys, avoiding duplicates by provider+username combination
      const existingKeys = new Set(
        keys.map((k) => `${k.label}||${k.username}`),
      );
      const newKeysToAdd = fetchedKeys.filter(
        (k) => !existingKeys.has(`${k.label}||${k.username}`),
      );

      if (newKeysToAdd.length === 0) {
        setFetchFromKvMessage({
          type: "success",
          text: "All keys from KV Store are already in the app (no duplicates added)",
        });
        toast.info("All keys already exist");
        return;
      }

      // Add each new key
      let addedCount = 0;
      for (const keyToAdd of newKeysToAdd) {
        const success = await addKey(
          keyToAdd.label,
          keyToAdd.username,
          keyToAdd.key,
        );
        if (success) {
          addedCount++;
        }
      }

      if (addedCount > 0) {
        setFetchFromKvMessage({
          type: "success",
          text: `Successfully fetched and added ${addedCount} API key(s) from Puter KV Store`,
        });
        toast.success(`Fetched ${addedCount} keys from KV Store`);
      } else {
        throw new Error("Failed to add keys from KV Store");
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      setFetchFromKvMessage({
        type: "error",
        text: `Failed to fetch from KV: ${errorMsg}`,
      });
      toast.error(`Failed to fetch: ${errorMsg}`);
    } finally {
      setFetchFromKvLoading(false);
    }
  };

  // Group keys by provider, then by username
  const groupedKeys = useMemo(() => {
    const groups = new Map<string, Map<string, ApiKey[]>>();

    keys.forEach((key) => {
      if (!groups.has(key.label)) {
        groups.set(key.label, new Map());
      }
      const providerGroup = groups.get(key.label)!;
      const username = key.username || "MISC";
      if (!providerGroup.has(username)) {
        providerGroup.set(username, []);
      }
      providerGroup.get(username)!.push(key);
    });

    return Array.from(groups.entries())
      .map(
        ([provider, usernames]) =>
          [
            provider,
            Array.from(usernames.entries()).sort((a, b) =>
              a[0].localeCompare(b[0]),
            ),
          ] as [string, [string, ApiKey[]][]],
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [keys]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">API Keys</span>
          </div>

          <div className="flex items-center gap-4">
            {puterUser ? (
              <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
                <PopoverTrigger asChild>
                  <button className="text-sm text-slate-300 hover:text-white transition cursor-pointer">
                    {puterUser.username || "Signed in"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-0 border border-slate-700 bg-slate-800">
                  <div className="p-3">
                    <p className="text-xs text-slate-400 mb-3">
                      Signed in as{" "}
                      <span className="text-white font-medium">
                        {puterUser.username}
                      </span>
                    </p>
                    <Button
                      onClick={handleSignOut}
                      className="w-full bg-red-600 hover:bg-red-700 text-white border-0 text-sm flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                onClick={handlePuterSignIn}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 text-sm"
              >
                Sign in with Puter
              </Button>
            )}

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Add New API Key
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provider
              </label>
              <Input
                type="text"
                placeholder="e.g., OpenAI, Stripe, GitHub"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username <span className="text-slate-500">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="Account name or email (defaults to MISC if left blank)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <Input
                type="password"
                placeholder="Paste your API key here"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddOrUpdate}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Key
              </Button>
            </div>
          </div>
        </div>

        {/* Import/Export Actions */}
        <div className="mb-8">
          <div className="flex gap-3 mb-3">
            <Button
              onClick={handleExport}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={handleImportClick}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Keys
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,.text"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <p className="text-xs text-slate-400">
            💡 Supports JSON format or text files with PROVIDER=...,
            USERNAME=..., KEY=... format
          </p>
        </div>

        {/* Keys List */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">
            Saved Keys ({keys.length})
          </h3>

          {keys.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <p className="text-slate-400">
                No API keys saved yet. Add your first key above!
              </p>
            </div>
          ) : (
            <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
              {groupedKeys.map(
                ([providerName, usernameGroups], providerIndex) => (
                  <div
                    key={providerName}
                    className={
                      providerIndex !== groupedKeys.length - 1
                        ? "border-b border-slate-700"
                        : ""
                    }
                  >
                    {/* Provider Header */}
                    <button
                      onClick={() => toggleExpandProvider(providerName)}
                      className="w-full px-6 py-4 bg-slate-800/50 hover:bg-slate-800/70 transition flex items-center justify-between text-white group"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <h3 className="text-lg font-semibold text-white">
                          {providerName}
                        </h3>
                        <span className="text-sm text-slate-400">
                          (
                          {usernameGroups.reduce(
                            (sum, [, keys]) => sum + keys.length,
                            0,
                          )}{" "}
                          key
                          {usernameGroups.reduce(
                            (sum, [, keys]) => sum + keys.length,
                            0,
                          ) !== 1
                            ? "s"
                            : ""}
                          )
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          expandedProviders.has(providerName)
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {/* Username Groups */}
                    {expandedProviders.has(providerName) && (
                      <div className="px-6 py-4 bg-slate-900/30 space-y-4">
                        {usernameGroups.map(
                          ([usernameName, apiKeys], usernameIndex) => (
                            <div key={`${providerName}||${usernameName}`}>
                              {/* Username Header */}
                              <button
                                onClick={() =>
                                  toggleExpandUsername(
                                    `${providerName}||${usernameName}`,
                                  )
                                }
                                className="w-full px-4 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition flex items-center justify-between text-white rounded-lg mb-2"
                              >
                                <div className="flex items-center gap-2 flex-1 text-left">
                                  <h4 className="text-sm font-medium text-slate-200">
                                    {usernameName}
                                  </h4>
                                  <span className="text-xs text-slate-500">
                                    ({apiKeys.length} key
                                    {apiKeys.length !== 1 ? "s" : ""})
                                  </span>
                                </div>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform ${
                                    expandedUsernames.has(
                                      `${providerName}||${usernameName}`,
                                    )
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>

                              {/* API Keys */}
                              {expandedUsernames.has(
                                `${providerName}||${usernameName}`,
                              ) && (
                                <div className="space-y-3">
                                  {apiKeys.map((apiKey) => (
                                    <div
                                      key={apiKey.id}
                                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                          <div className="space-y-2 mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-400 min-w-fit">
                                                Key:
                                              </span>
                                              <code className="bg-slate-900/50 text-slate-300 px-3 py-2 rounded text-sm break-all font-mono flex-1">
                                                {revealedKeys.has(apiKey.id)
                                                  ? apiKey.key
                                                  : "•".repeat(
                                                      Math.min(
                                                        apiKey.key.length,
                                                        40,
                                                      ),
                                                    )}
                                              </code>
                                              <button
                                                onClick={() =>
                                                  toggleReveal(apiKey.id)
                                                }
                                                className="p-2 hover:bg-slate-700 rounded transition flex-shrink-0"
                                                title={
                                                  revealedKeys.has(apiKey.id)
                                                    ? "Hide"
                                                    : "Reveal"
                                                }
                                              >
                                                {revealedKeys.has(apiKey.id) ? (
                                                  <EyeOff className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                  <Eye className="w-4 h-4 text-slate-400" />
                                                )}
                                              </button>
                                              <button
                                                onClick={() =>
                                                  copyToClipboard(
                                                    apiKey.key,
                                                    apiKey.label,
                                                  )
                                                }
                                                className="p-2 hover:bg-slate-700 rounded transition flex-shrink-0"
                                                title="Copy to clipboard"
                                              >
                                                <Copy className="w-4 h-4 text-slate-400" />
                                              </button>
                                            </div>
                                          </div>
                                          <p className="text-xs text-slate-500">
                                            Added{" "}
                                            {new Date(
                                              apiKey.createdAt,
                                            ).toLocaleDateString()}
                                          </p>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0">
                                          <button
                                            onClick={() => handleEdit(apiKey)}
                                            className="p-2 hover:bg-slate-700 rounded transition"
                                            title="Edit key"
                                          >
                                            <Edit2 className="w-4 h-4 text-blue-400" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteKey(apiKey.id)
                                            }
                                            className="p-2 hover:bg-slate-700 rounded transition"
                                            title="Delete key"
                                          >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit API Key</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provider
              </label>
              <Input
                type="text"
                placeholder="e.g., OpenAI, Stripe, GitHub"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username <span className="text-slate-500">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="Account name or email (defaults to MISC if left blank)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <Input
                type="password"
                placeholder="Paste your API key here"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="text-white border-slate-700 hover:bg-slate-800"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleAddOrUpdate}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
            >
              <Check className="w-4 h-4 mr-2" />
              Update Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal Dialog */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="bg-slate-800 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Puter Key-Value Store
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Save all your API keys to the Puter KV Store for cloud backup.
              </p>

              {saveToKvMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    saveToKvMessage.type === "success"
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {saveToKvMessage.text}
                </div>
              )}

              <Button
                onClick={handleSaveToKV}
                disabled={saveToKvLoading || keys.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveToKvLoading ? "Saving..." : "Save to KV"}
              </Button>

              {keys.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  No keys to save yet.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-slate-700">
                <Button
                  onClick={handleFetchFromKV}
                  disabled={fetchFromKvLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchFromKvLoading ? "Fetching..." : "Fetch KV API Keys"}
                </Button>
              </div>

              {fetchFromKvMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm ${
                    fetchFromKvMessage.type === "success"
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {fetchFromKvMessage.text}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowSettingsModal(false)}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white border-0"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-slate-400 text-center">
            © 2024 API Key Manager. Your keys are stored securely with Puter.
          </p>
        </div>
      </footer>
    </div>
  );
}
