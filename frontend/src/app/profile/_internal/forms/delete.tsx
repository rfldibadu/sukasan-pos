// app/profile/_internal/forms/delete-account-form.tsx
'use client';

import { useState } from 'react';
import { useProfile } from '../hooks/use-profile';

interface DeleteAccountFormProps {
  targetUserId?: string;
}

export function DeleteAccountForm({ targetUserId }: DeleteAccountFormProps) {
  const { profile, deleteUser, logoutUser } = useProfile();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userIdToDelete = targetUserId || profile?.id;
  const isSelfDelete = userIdToDelete === profile?.id;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE' || !userIdToDelete) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteUser(userIdToDelete);
      if (isSelfDelete) {
        await logoutUser();
      }
    } catch {
      setErrorMsg('Failed to delete user account.');
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleDelete} className="space-y-4 bg-white p-5 rounded-xl border border-red-100 shadow-sm">
      <h3 className="font-semibold text-red-600 text-sm">Danger Zone</h3>
      <p className="text-xs text-slate-500">
        Type <span className="font-mono font-bold text-slate-700">DELETE</span> below to delete this account.
      </p>

      {errorMsg && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">{errorMsg}</div>}

      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
      />

      <button
        type="submit"
        disabled={confirmText !== 'DELETE' || isDeleting}
        className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg text-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isDeleting ? 'Deleting...' : 'Confirm Account Deletion'}
      </button>
    </form>
  );
}