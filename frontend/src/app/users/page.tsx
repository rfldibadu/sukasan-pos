"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X, ShieldCheck, KeyRound, Edit3 } from "lucide-react";
import { useStaff, StaffRole, StaffUser } from "./_internal/hooks/use-staff";

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase() || "ST";
};

const getAvatarColorClass = (role: StaffRole, id: number) => {
  if (role === "manager") return "bg-amber-700";
  const cashierColors = [
    "bg-blue-600",
    "bg-purple-600",
    "bg-emerald-600",
    "bg-indigo-600",
  ];
  return cashierColors[id % cashierColors.length];
};

export default function UsersPage() {
  const { staff, isLoading, registerStaff, updateStaff } = useStaff();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Add Staff Modal
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("cashier");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Reset Password / Edit Modal
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("cashier");
  const [isEditing, setIsEditing] = useState(false);

  const showNotice = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staff.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (q) {
        const matchName = member.full_name.toLowerCase().includes(q);
        const matchUser = member.username.toLowerCase().includes(q);
        const matchRole = member.role.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchRole) return false;
      }
      return true;
    });
  }, [staff, roleFilter, searchQuery]);

  const totalCount = staff.length;
  const activeCount = useMemo(
    () => staff.filter((s) => s.is_active).length,
    [staff]
  );

  const handleOpenAddModal = () => {
    setNewName("");
    setNewUsername("");
    setNewRole("cashier");
    setNewPassword("");
    setAddOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showNotice("error", "Please fill in all fields.");
      return;
    }
    setIsSavingNew(true);
    try {
      await registerStaff({
        full_name: newName.trim(),
        username: newUsername.trim().toLowerCase(),
        role: newRole,
        password: newPassword,
      });
      showNotice("success", `Staff account created for ${newName.trim()}`);
      setAddOpen(false);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to create staff member"
      );
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleToggleActive = async (member: StaffUser) => {
    try {
      await updateStaff(member.id, { is_active: !member.is_active });
      showNotice(
        "success",
        `${member.full_name} is now ${!member.is_active ? "Active" : "Inactive"}`
      );
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to update account status"
      );
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetPasswordVal.trim()) return;
    setIsResetting(true);
    try {
      await updateStaff(resetTarget.id, { password: resetPasswordVal });
      showNotice("success", `Password updated for ${resetTarget.full_name}`);
      setResetTarget(null);
      setResetPasswordVal("");
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to reset password"
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenEdit = (member: StaffUser) => {
    setEditTarget(member);
    setEditName(member.full_name);
    setEditRole(member.role);
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    setIsEditing(true);
    try {
      await updateStaff(editTarget.id, {
        full_name: editName.trim(),
        role: editRole,
      });
      showNotice("success", `Updated details for ${editName.trim()}`);
      setEditTarget(null);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to update staff member"
      );
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Title & Team Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Staff &amp; Role Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage cashier accounts, login credentials, and manager access rights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Total Team
              </p>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {totalCount} Staff
              </p>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-600">
                Active Accounts
              </p>
              <p className="text-sm font-black text-emerald-600">
                {activeCount} Active
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, username, or role..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: "all", label: "All Roles" },
              { id: "manager", label: "Admin / Manager" },
              { id: "cashier", label: "Cashier" },
            ] as const
          ).map((btn) => {
            const active = roleFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setRoleFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "font-bold bg-amber-700 text-white"
                    : "font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-56 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No staff accounts match your filter
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try clearing your search or create a new staff account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => {
            const isManager = member.role === "manager";
            const roleBadge = isManager
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";

            return (
              <div
                key={member.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-4 ${
                  member.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full ${getAvatarColorClass(
                        member.role,
                        member.id
                      )} text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0`}
                    >
                      {getInitials(member.full_name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {member.full_name}
                      </h3>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-md ${roleBadge}`}
                      >
                        {isManager ? "Admin / Manager" : "Cashier"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      member.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {member.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/70 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Login Credential</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {member.username}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Default Landing</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isManager ? "Dashboard (/)" : "POS Register (/pos)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Permissions</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isManager
                        ? "Full Access (Reports & Stocks)"
                        : "POS, Open Bills & Menu View"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(member);
                        setResetPasswordVal("");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(member)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(member)}
                    className={`text-xs font-semibold cursor-pointer ${
                      member.is_active
                        ? "text-slate-500 hover:text-rose-600"
                        : "text-emerald-600 hover:underline"
                    }`}
                  >
                    {member.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add Staff Account
              </h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Rina Putri"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g., rina.kasir"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="cashier">Cashier (POS &amp; Orders)</option>
                    <option value="manager">Admin / Manager (Full Access)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password (min 6 chars)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNew}
                  className="w-2/3 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSavingNew ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Reset Staff Password
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Set a new login password for{" "}
                <strong className="text-slate-800 dark:text-white">
                  {resetTarget.full_name}
                </strong>
                .
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isResetting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="cashier">Cashier (POS &amp; Orders)</option>
                  <option value="manager">Admin / Manager (Full Access)</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
