import AuthForm from '@/components/AuthForm';

export default function SignUpPage() {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <AuthForm type="sign-up" />
    </main>
  );
}
