'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '../hooks/use-profile';
import { useSession } from 'next-auth/react';

export function UpdateProfileForm() {
  const router = useRouter();
  const { profile, updateProfile, mutate } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [pictureUrl, setPictureUrl] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { update: updateSession } = useSession();

  const displayFullName = fullName || profile?.full_name || '';
  const displayPictureUrl = pictureUrl || profile?.profile_picture_url || '';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should be less than 2MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPictureUrl(String(reader.result || ''));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetForm = () => {
    setFullName(profile?.full_name || '');
    setPictureUrl(profile?.profile_picture_url || '');
    setPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await updateProfile({
        full_name: displayFullName,
        profile_picture_url: displayPictureUrl,
      });

      if (response.success) {
        await mutate();

        await updateSession({
          full_name: response.data?.full_name || displayFullName,
          profile_picture_url: response.data?.profile_picture_url || displayPictureUrl,
        });

        setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Profile Details & Info</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Username</span>
          <span className="font-medium text-slate-800 block">{profile?.username || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Role</span>
          <span className="font-medium text-slate-800 uppercase block">{profile?.role || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Account Status</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${profile?.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            {profile?.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
        <input
          type="text"
          value={displayFullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Profile Picture</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-3">
        <p className="text-xs font-medium text-slate-700">Change Password (Optional)</p>
        
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Current Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-amber-600 text-white font-medium py-2.5 rounded-lg text-xs hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}