"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { updateProfile, getUserProfile, uploadAvatar, removeAvatar } from "@/lib/api/user";
import { useI18n } from "@/i18n/useI18n";
import { AvatarUploader } from "@/components/avatar-uploader";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading, refresh } = useAuth();
  const { messages } = useI18n();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking user state
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    getUserProfile(user.username)
      .then((profile) => {
        setFormData({
          nickname: profile.nickname || "",
          bio: profile.bio || "",
          avatarUrl: profile.avatarUrl || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : messages.profileLoadError);
        setLoading(false);
      });
  }, [user, authLoading, router, messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Handle avatar changes
      if (avatarFile) {
        // Upload new avatar
        await uploadAvatar(avatarFile, accessToken);
      } else if (removeAvatarFlag) {
        // Remove avatar
        await removeAvatar(accessToken);
      }

      // Update other profile fields
      await updateProfile(
        {
          nickname: formData.nickname || undefined,
          bio: formData.bio || undefined,
        },
        accessToken
      );

      // Refresh auth state to update user data (including avatarUrl) in Header
      await refresh();

      setSuccess(messages.profileUpdateSuccess);
      setTimeout(() => {
        router.push(`/users/${user.username}`);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : messages.profileUpdateError;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <div className="w-full max-w-md">
          <div className="skeleton-shimmer relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="h-6 w-32 rounded bg-gray-200/80" />
              <div className="h-10 w-full rounded bg-gray-200/70" />
              <div className="h-10 w-full rounded bg-gray-200/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-[#003865]">{messages.profileEditTitle}</h1>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-gray-800">
              {messages.profileNicknameLabel}
            </label>
            <input
              type="text"
              id="nickname"
              value={formData.nickname}
              onChange={(e) =>
                setFormData({ ...formData, nickname: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              maxLength={50}
              placeholder={messages.profileNicknamePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium text-gray-800">
              {messages.profileBioLabel}
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              rows={4}
              maxLength={500}
              placeholder={messages.profileBioPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">
              {messages.profileAvatarLabel}
            </label>
            <AvatarUploader
              currentAvatarUrl={formData.avatarUrl}
              username={user.username}
              onFileSelect={(file) => {
                setAvatarFile(file);
                if (file) {
                  setRemoveAvatarFlag(false);
                }
              }}
              onRemove={() => {
                setRemoveAvatarFlag(true);
                setFormData((prev) => ({ ...prev, avatarUrl: "" }));
              }}
              selectedFile={avatarFile}
              disabled={saving}
              messages={{
                uploadLabel: messages.profileAvatarUpload,
                changeLabel: messages.profileAvatarChange,
                removeLabel: messages.profileAvatarRemove,
                cancelLabel: messages.profileAvatarCancel,
                dragHint: messages.profileAvatarDragHint,
                sizeHint: messages.profileAvatarSizeHint,
                invalidType: messages.profileAvatarInvalidType,
                tooLarge: messages.profileAvatarTooLarge,
                selectedFile: messages.profileAvatarSelectedFile,
              }}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
            >
              {saving ? messages.profileSaving : messages.profileSaveButton}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
            >
              {messages.profileCancelButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
