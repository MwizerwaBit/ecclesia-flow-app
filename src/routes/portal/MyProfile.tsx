/**
 * @file MyProfile.tsx
 * @description Member profile view allowing users to update their details and preferences.
 */
import { useState } from 'react';
import { User, Mail, Phone, MapPin, Settings, LogOut, Camera } from 'lucide-react';
import { useAuthStore, useCurrentUser } from '@/hooks/useAuthStore';
import { Button, Input, Card, Text, Avatar } from '@/components/ui';

export function MyProfile() {
  const user = useCurrentUser();
  const { logout } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '(555) 123-4567',
    address: '123 Grace Way, Suite 4\nAustin, TX 78701'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    // Real app would dispatch to an API
  };

  return (
    <div className="w-full animate-fade-in pb-8">
      {/* Header / Avatar */}
      <div className="bg-surface dark:bg-surface-dark px-4 pt-6 pb-8 text-center sticky top-0 z-10 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="relative inline-block mb-4">
          <Avatar 
            name={`${formData.firstName} ${formData.lastName}`}
            src={user?.photoUrl}
            size="xl"
            className="w-24 h-24 border-4 border-white dark:border-slate-900 shadow-md"
          />
          <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
            <Camera size={16} />
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
                onClick={() => setIsEditing(true)}
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
                  <Button variant="secondary" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Save Changes</Button>
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
                    <Text variant="body" className="font-medium">{formData.phone}</Text>
                  </div>
                </div>
                <hr className="border-slate-100 dark:border-slate-800" />
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <Text variant="caption" color="muted">Address</Text>
                    <Text variant="body" className="font-medium whitespace-pre-line">{formData.address}</Text>
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
