'use client';

import { useRouter } from 'next/navigation';
import { useProfile } from './_internal/hooks/use-profile';
import { UpdateProfileForm } from './_internal/forms/edit';
import { DeleteAccountForm } from './_internal/forms/delete';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return <div className="p-6 text-xs text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <UpdateProfileForm />
      {profile?.role === 'manager' && (
        <DeleteAccountForm />
      )}
    </div>
  );
}