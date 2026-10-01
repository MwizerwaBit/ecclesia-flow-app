/**
 * @file ForgotPassword.tsx
 * @description Request a password reset link.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button, Input, Card, Text } from '@/components/ui';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.requestPasswordReset(email);
      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="w-full animate-fade-in px-4">
        <Card padding="lg" className="w-full text-center">
          <div className="mx-auto bg-success-light text-success w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <Send size={32} />
          </div>
          <Text variant="h2" className="mb-2">Check your email</Text>
          <Text variant="body" color="muted" className="mb-8">
            We've sent a password reset link to <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span>.
          </Text>
          <Link to="/login">
            <Button variant="secondary" fullWidth>Return to login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in px-4">
      <Link to="/login" className="inline-flex items-center text-body-sm text-slate-500 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to login
      </Link>

      <div className="mb-8">
        <Text variant="h1" className="mb-2">Reset password</Text>
        <Text variant="body-lg" color="muted">
          Enter your email address and we'll send you a link to reset your password.
        </Text>
      </div>

      <Card padding="lg" className="w-full">
        {error && (
          <div className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            fullWidth 
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>
      </Card>
    </div>
  );
}
