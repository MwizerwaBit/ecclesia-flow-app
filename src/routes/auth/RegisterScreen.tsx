/**
 * @file RegisterScreen.tsx
 * @description Registration entry point (onboarding).
 */
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button, Card, Text } from '@/components/ui';

export function RegisterScreen() {
  const navigate = useNavigate();

  return (

    <div className="w-full animate-fade-in px-4">
      <div className="text-center mb-8">
        <Text variant="display" className="text-primary mb-2">EcclesiaFlow</Text>
        <Text variant="body-lg" color="muted">Create your workspace</Text>
      </div>

      <Card padding="lg" className="w-full text-center">
        <div className="mx-auto bg-primary-light text-primary w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Building2 size={32} />
        </div>
        
        <Text variant="h2" className="mb-2">Set up your church</Text>
        <Text variant="body" color="muted" className="mb-8">
          In just a few steps, you'll be able to manage your members, events, and finances in one place.
        </Text>
        
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          rightIcon={ArrowRight}
          onClick={() => navigate('/onboarding')}
        >
          Get Started
        </Button>
      </Card>

      <div className="mt-8 text-center text-body-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-bold">
          Sign In
        </Link>
      </div>
    </div>
  );
}
