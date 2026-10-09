/**
 * @file OnboardingWizard.tsx
 * @description Multi-step onboarding flow for new organisations.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Palette, Network, UserPlus, Calendar, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import type { AuthSession } from '@/types';
import { useAuthStore, useCurrentUser } from '@/hooks/useAuthStore';
import { membersService } from '@/services/membersService';
import { eventsService } from '@/services/eventsService';
import { Button, Input, Card, Text, Select } from '@/components/ui';

// Step definitions
const STEPS = [
  { id: 'org', label: 'Organisation', icon: Building2 },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'hierarchy', label: 'Structure', icon: Network },
  { id: 'member', label: 'First Member', icon: UserPlus },
  { id: 'event', label: 'First Event', icon: Calendar },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const { session, setSession } = useAuthStore();

  // Applied once, after this screen (not /register + PublicLayout) is what's
  // mounted — see the comment in RegisterScreen for why that ordering matters.
  const hasAppliedPendingSession = useRef(false);
  const pendingSession = (location.state as { pendingSession?: AuthSession } | null)?.pendingSession;
  useEffect(() => {
    if (pendingSession && !hasAppliedPendingSession.current) {
      hasAppliedPendingSession.current = true;
      setSession(pendingSession);
    }
  }, [pendingSession, setSession]);

  // Wizard State (in a real app, this would be form state via react-hook-form)
  const [formData, setFormData] = useState({
    orgName: pendingSession?.user.tenantName ?? '',
    orgType: 'church',
    primaryColor: '#4F46E5',
    hasMultipleCampuses: 'no',
    firstMemberName: '',
    firstMemberEmail: '',
    firstEventName: '',
    firstEventDate: '',
  });

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeWizard();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeWizard = async () => {
    setIsSubmitting(true);

    // The org-identity fields actually take effect on the session, rather
    // than being collected and discarded — the name/colour picked in steps 1
    // and 2 are what the rest of the app (sidebar brand, settings) shows
    // immediately afterward.
    if (session && user) {
      setSession({
        ...session,
        user: {
          ...user,
          tenantName: formData.orgName.trim() || user.tenantName,
          primaryColor: formData.primaryColor,
        },
      });
    }

    // Both remaining steps are explicitly skippable — only act on them if
    // the person actually filled something in.
    if (formData.firstMemberName.trim()) {
      const [firstName, ...rest] = formData.firstMemberName.trim().split(' ');
      await membersService.create({
        firstName,
        lastName: rest.join(' ') || '—',
        email: formData.firstMemberEmail.trim() || undefined,
        status: 'active',
      });
    }
    if (formData.firstEventName.trim() && formData.firstEventDate) {
      await eventsService.create({
        title: formData.firstEventName.trim(),
        type: 'service',
        startDateTime: formData.firstEventDate,
        attendanceMode: 'individual',
        isPublic: true,
        status: 'published',
      });
    }

    setIsSubmitting(false);
    // Land on the completion screen rather than the dashboard — finishing setup
    // deserves the acknowledgement, and that screen hands them on from there.
    navigate('/onboarding/complete', { replace: true });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4 animate-fade-in">
            <Text variant="h2" className="mb-4">Tell us about your church</Text>
            <Input 
              label="Organisation Name" 
              placeholder="e.g. St. Jude's Cathedral"
              value={formData.orgName}
              onChange={(e) => updateForm('orgName', e.target.value)}
              required
            />
            <Select
              label="Organisation Type"
              value={formData.orgType}
              onChange={(e) => updateForm('orgType', e.target.value)}
              options={[
                { value: 'church', label: 'Single Church' },
                { value: 'diocese', label: 'Diocese / Network' },
                { value: 'nonprofit', label: 'Non-Profit Ministry' }
              ]}
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <Text variant="h2" className="mb-4">Customize your look</Text>
            <Text variant="body" color="muted" className="mb-4">
              Choose a primary brand color that matches your church's identity.
            </Text>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={formData.primaryColor}
                onChange={(e) => updateForm('primaryColor', e.target.value)}
                className="w-16 h-16 rounded cursor-pointer border-0 p-0"
              />
              <div className="flex-1">
                <Text variant="label">Selected Color</Text>
                <Text variant="h3" className="uppercase">{formData.primaryColor}</Text>
              </div>
            </div>
            
            {/* Preview Card */}
            <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-700" style={{ backgroundColor: `${formData.primaryColor}15` }}>
              {/* A sample of the chosen colour, not something to press. */}
              <span
                role="presentation"
                className="inline-flex h-11 items-center rounded-lg px-4 text-body font-medium"
                style={{ backgroundColor: formData.primaryColor, color: '#fff' }}
              >
                Preview button
              </span>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-fade-in">
            <Text variant="h2" className="mb-4">Church Structure</Text>
            <Select
              label="Do you have multiple campuses or parishes?"
              value={formData.hasMultipleCampuses}
              onChange={(e) => updateForm('hasMultipleCampuses', e.target.value)}
              options={[
                { value: 'no', label: 'No, we operate from a single location' },
                { value: 'yes', label: 'Yes, we have multiple locations' }
              ]}
            />
            {formData.hasMultipleCampuses === 'yes' && (
              <div className="p-4 bg-primary-light/20 rounded-lg text-body-sm text-primary mt-2">
                We'll set you up with a Network Dashboard to manage your child parishes.
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-fade-in">
            <Text variant="h2" className="mb-4">Add your first congregant</Text>
            <Text variant="body" color="muted" className="mb-4">
              You're already set up as the account leading this workspace — this starts the
              directory with someone else. Skip it for now if you'd rather import people later.
            </Text>
            <Input 
              label="Full Name" 
              placeholder="e.g. John Doe"
              value={formData.firstMemberName}
              onChange={(e) => updateForm('firstMemberName', e.target.value)}
            />
            <Input 
              label="Email Address" 
              type="email"
              placeholder="john@example.com"
              value={formData.firstMemberEmail}
              onChange={(e) => updateForm('firstMemberEmail', e.target.value)}
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-fade-in">
            <Text variant="h2" className="mb-4">Create your first event</Text>
            <Input 
              label="Event Name" 
              placeholder="e.g. Sunday Service"
              value={formData.firstEventName}
              onChange={(e) => updateForm('firstEventName', e.target.value)}
            />
            <Input 
              label="Date & Time" 
              type="datetime-local"
              value={formData.firstEventDate}
              onChange={(e) => updateForm('firstEventDate', e.target.value)}
            />
            
            <div className="mt-8 p-6 bg-success-light/30 border border-success-light rounded-xl text-center">
              <CheckCircle2 size={48} className="text-success mx-auto mb-4" />
              <Text variant="h3">You're all set!</Text>
              <Text variant="body" color="muted">
                Click finish to generate your workspace.
              </Text>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col py-12 px-4 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-light via-surface to-surface" />
      
      <div className="relative z-10 w-full max-w-xl mx-auto">
        <div className="text-center mb-8">
          <Text variant="h1" className="text-primary mb-2">Workspace Setup</Text>
          <Text variant="body" color="muted">Step {currentStep + 1} of {STEPS.length}</Text>
        </div>

        {/* Stepper Progress */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-200 dark:bg-slate-700 -z-10 -translate-y-1/2"></div>
          <div 
            className="absolute left-0 top-1/2 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-500"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          ></div>
          
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isPassed = index < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-white dark:bg-slate-900 ${
                  isActive ? 'border-primary text-primary shadow-md' : 
                  isPassed ? 'border-primary bg-primary text-white' : 
                  'border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>

        <Card padding="lg" className="w-full min-h-[400px] flex flex-col justify-between shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex-1">
            {renderStepContent()}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button 
              variant="secondary" 
              onClick={handleBack} 
              disabled={currentStep === 0 || isSubmitting}
              leftIcon={ArrowLeft}
            >
              Back
            </Button>
            
            <Button 
              variant="primary" 
              onClick={handleNext} 
              isLoading={isSubmitting}
              rightIcon={currentStep === STEPS.length - 1 ? undefined : ArrowRight}
            >
              {currentStep === STEPS.length - 1 ? 'Finish Setup' : 'Continue'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
