/**
 * @file ResetPassword.tsx
 * @description Confirm and set a new password.
 */
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button, Input, Card, Text } from '@/components/ui';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="w-full px-4 text-center">
        <Card padding="lg">
          <Text variant="h3" color="danger" className="mb-2">Invalid Reset Link</Text>
          <Text variant="body" color="muted" className="mb-6">
            This password reset link is invalid or has expired.
          </Text>
          <Link to="/forgot-password">
            <Button variant="primary">Request New Link</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      await authService.resetPassword({ token, password, confirmPassword });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full animate-fade-in px-4">
        <Card padding="lg" className="w-full text-center">
          <div className="mx-auto bg-success-light text-success w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={32} />
          </div>
          <Text variant="h2" className="mb-2">Password Reset</Text>
          <Text variant="body" color="muted" className="mb-8">
            Your password has been successfully updated.
          </Text>
          <Link to="/login">
            <Button variant="primary" fullWidth>Sign In Now</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="mb-8">
        <Text variant="h1" className="mb-2">Set new password</Text>
        <Text variant="body-lg" color="muted">
          Please enter your new password below.
        </Text>
      </div>

      <Card padding="lg" className="w-full">
        {error && (
          <div className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={Lock}
            required
          />

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            fullWidth 
            isLoading={isLoading}
            className="mt-6"
          >
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
