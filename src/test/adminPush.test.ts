import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { enableAdminPush } from "@/lib/adminPush";

describe("Permissão push no painel", () => {
  it("não solicita permissão de notificações dentro da prévia incorporada", async () => {
    vi.stubGlobal("window", { top: {}, self: {} });
    expect(await enableAdminPush(vi.fn())).toBe("open-in-new-tab");
    vi.unstubAllGlobals();
  });
});