/**
 * @file MyProfile.tsx
 * @description Member profile view allowing users to update their details and preferences.
 */
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, Settings, LogOut, Camera, Loader2 } from 'lucide-react';
import { useAuthStore, useCurrentUser } from '@/hooks/useAuthStore';
import { useMediaUpload } from '@/components/media/useMediaUpload';
import { membersService } from '@/services/membersService';
import { Button, Input, Card, Text, Avatar } from '@/components/ui';

function formatAddress(address: { line1: string; line2?: string; city: string; state?: string; postalCode?: string } | undefined) {
  if (!address) return 'Not on file';
  const line2 = [address.city, address.state, address.postalCode].filter(Boolean).join(', ');
  return [address.line1, address.line2, line2].filter(Boolean).join('\n');
}

export function MyProfile() {
  const user = useCurrentUser();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  // The member record behind this login — phone/address live there, not on
  // the session itself, once the account is linked to one. Read directly
  // from the query rather than copied into local state, so there's nothing
  // to keep in sync.
  const { data: member } = useQuery({
    queryKey: ['members', 'me', user?.id],
    queryFn: () => membersService.getByUserId(user!.id),
    enabled: Boolean(user?.id),
  });

  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarUpload = useMediaUpload('image', (asset) => setPhotoUrl(asset.url));
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const save = useMutation({
    mutationFn: () => {
      if (!member) throw new Error('No member record linked to this account yet');
      return membersService.update(member.id, { phone: formData.phone.trim() || undefined });
    },
    // Written straight into the cache from the mutation's own response rather
    // than invalidated-and-refetched: update() doesn't persist in the mock
    // layer (same as everywhere else this app calls it), so a refetch here
    // would quietly revert the save back to the old phone number.
    onSuccess: (updated) => {
      queryClient.setQueryData(['members', 'me', user?.id], updated);
      setIsEditing(false);
    },
  });

  const startEditing = () => {
    // Seeded here, right as editing begins, rather than synced in an effect —
    // there's no moment before this where a stale value could be shown.
    setFormData((prev) => ({ ...prev, phone: member?.phone ?? '' }));
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (member) {
      save.mutate();
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full animate-fade-in pb-8">
      {/* Header / Avatar */}
      <div className="bg-surface dark:bg-surface-dark px-4 pt-6 pb-8 text-center sticky top-0 z-10 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="relative inline-block mb-4">
          <Avatar
            name={`${formData.firstName} ${formData.lastName}`}
            src={photoUrl}
            size="xl"
            className="w-24 h-24 border-4 border-white dark:border-slate-900 shadow-md"
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept={avatarUpload.accept}
            className="hidden"
            onChange={avatarUpload.onFileChange}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUpload.isUploading}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-70"
          >
            {avatarUpload.isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          </button>
        </div>
        <Text variant="h2" as="h1">{formData.firstName} {formData.lastName}</Text>
        <Text variant="body" color="muted">{formData.email}</Text>
      </div>

      <div className="px-4 mt-6 space-y-6">
        
        {/* Personal Details */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Text variant="h3">Personal Details</Text>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="text-body-sm text-primary font-bold hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          
          <Card padding="lg">
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="First Name" 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                  />
                  <Input 
                    label="Last Name" 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                  />
                </div>
                <Input 
                  label="Email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
                <Input 
                  label="Phone" 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                />
                
                <div className="pt-2 flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={() => setIsEditing(false)} disabled={save.isPending}>Cancel</Button>
                  <Button variant="primary" type="submit" isLoading={save.isPending}>Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <Text variant="caption" color="muted">Full Name</Text>
                    <Text variant="body" className="font-medium">{formData.firstName} {formData.lastName}</Text>
                  </div>
                </div>
                <hr className="border-slate-100 dark:border-slate-800" />
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <Text variant="caption" color="muted">Email Address</Text>
                    <Text variant="body" className="font-medium">{formData.email}</Text>
                  </div>
                </div>
                <hr className="border-slate-100 dark:border-slate-800" />
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <Text variant="caption" color="muted">Phone Number</Text>
                    <Text variant="body" className="font-medium">{member?.phone || 'Not on file'}</Text>
                  </div>
                </div>
                <hr className="border-slate-100 dark:border-slate-800" />
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <Text variant="caption" color="muted">Address</Text>
                    <Text variant="body" className="font-medium whitespace-pre-line">{formatAddress(member?.address)}</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Preferences */}
        <section>
          <Text variant="h3" className="mb-3">Preferences</Text>
          <Card padding="none" className="overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-slate-500" />
                <Text variant="body" className="font-medium">Notification Settings</Text>
              </div>
            </button>
            <button 
              onClick={() => logout()}
              className="w-full flex items-center justify-between p-4 hover:bg-danger-light/50 dark:hover:bg-danger-900/20 transition-colors"
            >
              <div className="flex items-center gap-3 text-danger">
                <LogOut size={20} />
                <Text variant="body" className="font-medium">Sign Out</Text>
              </div>
            </button>
          </Card>
        </section>

      </div>
    </div>
  );
}
