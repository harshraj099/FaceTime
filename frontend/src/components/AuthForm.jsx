import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useUser } from '@/context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';

const AuthForm = ({ type }) => {
  const { user, signIn, signUp } = useUser();
  const [values, setValues] = useState({
    identifier: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = type === 'sign-in';

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        await signIn(values.identifier, values.password);
      } else {
        await signUp(values.username, values.email, values.password);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = isSignIn
    ? [
        { name: 'identifier', label: 'Username or email', type: 'text' },
        { name: 'password', label: 'Password', type: 'password' },
      ]
    : [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'email', label: 'Email address', type: 'email' },
        { name: 'password', label: 'Password', type: 'password' },
      ];

  return (
    <Card className="w-full max-w-[400px] border-none bg-dark-1 p-6 py-9 text-white">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <img src="/icons/yoom-logo.svg" alt="yoom logo" className="h-10" />
            <h1 className="text-xl font-bold">
              {isSignIn ? 'Sign in to YOOM' : 'Create your account'}
            </h1>
            <p className="text-sm text-sky-1">
              {isSignIn
                ? 'Welcome back! Please sign in to continue'
                : 'Welcome! Please fill in the details to get started.'}
            </p>
          </div>

          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
              </label>
              <Input
                id={field.name}
                type={field.type}
                required
                minLength={
                  field.type === 'password' && !isSignIn ? 8 : undefined
                }
                value={values[field.name]}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
                className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="bg-blue-1" disabled={isSubmitting}>
            Continue
          </Button>

          <p className="text-center text-sm text-sky-1">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isSignIn ? '/sign-up' : '/sign-in'}
              className="font-medium text-blue-1"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
