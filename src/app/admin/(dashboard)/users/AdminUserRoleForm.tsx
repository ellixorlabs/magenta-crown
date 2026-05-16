import { isFullAdmin, ROLE } from "@/lib/admin-permissions";
import { updateUserRoleForm } from "@/app/admin/(dashboard)/users/actions";

const ROLE_OPTIONS = [ROLE.ADMIN, ROLE.SUB_ADMIN, ROLE.TECH_SUPPORT, ROLE.CUSTOMER] as const;

export function AdminUserRoleForm(props: { userId: string; currentRole: string; viewerRole: string }) {
  const { userId, currentRole, viewerRole } = props;
  if (!isFullAdmin(viewerRole)) return null;

  return (
    <form action={updateUserRoleForm} className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Change role (admin only)</p>
      <label className="block text-xs text-zinc-600">
        Role
        <select name="role" defaultValue={currentRole} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm">
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded-full bg-admin-600 px-4 py-2 text-xs font-semibold text-white hover:bg-admin-700">
        Save role
      </button>
    </form>
  );
}
