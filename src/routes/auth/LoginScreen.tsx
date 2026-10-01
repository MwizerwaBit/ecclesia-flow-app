/**
 * @file LoginScreen.tsx
 * @description Main authentication entry point.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Button, Input, Card, Text } from '@/components/ui';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login({ email, password });
      // The router's PublicLayout will auto-redirect based on role
      // But we can also force navigate if needed
    } catch {
      // Error state is surfaced by the auth store
    }
  };

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="text-center mb-8">
        <Text variant="display" className="text-primary mb-2">EcclesiaFlow</Text>
        <Text variant="body-lg" color="muted">Sign in to your account</Text>
      </div>

      <Card padding="lg" className="w-full">
        {error && (
          <div className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            required
            autoComplete="email"
          />
          
          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              required
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <Link 
                to="/forgot-password" 
                className="text-body-sm text-primary hover:underline underline-offset-2 font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            fullWidth 
            isLoading={isLoading}
            rightIcon={LogIn}
            className="mt-6"
          >
            Sign In
          </Button>
        </form>
      </Card>

      <div className="mt-8 text-center text-body-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:underline font-bold">
          Register your church
        </Link>
      </div>
      
      {/* Dev helper text */}
      {import.meta.env.DEV && (
        <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-caption text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
          <p className="font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">Dev Login Hints (Mock Mode)</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Member:</strong> anything else (e.g. <code>test@test.com</code>)</li>
            <li><strong>Staff:</strong> contains <code>staff</code> (e.g. <code>staff@church.org</code>)</li>
            <li><strong>Board:</strong> contains <code>bishop</code></li>
            <li><strong>Platform:</strong> contains <code>platform</code></li>
            <li><em>Password: any string works</em></li>
          </ul>
        </div>
      )}
    </div>
  );
}
