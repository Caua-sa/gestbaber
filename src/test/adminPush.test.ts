import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { enableAdminPush } from "@/lib/adminPush";

describe("Permissão push no painel", () => {
  it("não registra um aparelho sem a configuração web do Firebase", async () => {
    expect(await enableAdminPush(vi.fn())).toBe("not-configured");
  });
});