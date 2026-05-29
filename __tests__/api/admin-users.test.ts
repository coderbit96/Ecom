import { PATCH } from "@/app/api/admin/users/[id]/route";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/admin/auth", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

const mockRequireAdmin = requireAdmin as jest.Mock;
const updateUser = db.user.update as jest.Mock;
const createLog = db.activityLog.create as jest.Mock;

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/user-2", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prevents ADMIN from changing a user role", async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: "admin-1", role: "ADMIN" } },
      response: null,
    });

    const response = await PATCH(request({ role: "SUPER_ADMIN" }), {
      params: { id: "user-2" },
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toMatch(/super admin/i);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN to change a user role", async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: "super-1", role: "SUPER_ADMIN" } },
      response: null,
    });
    updateUser.mockResolvedValue({ id: "user-2", role: "ADMIN" });
    createLog.mockResolvedValue({});

    const response = await PATCH(request({ role: "ADMIN" }), {
      params: { id: "user-2" },
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { role: "ADMIN" },
    });
    expect(json.user.role).toBe("ADMIN");
  });
});
