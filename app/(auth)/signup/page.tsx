'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Select from 'react-select';
import { Crown, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

// Import country list
import { getCountryDataList } from 'countries-list';

const countryOptions = getCountryDataList().map((c) => ({
  value: c.iso2,
  label: c.name,
}));

const schema = z.object({
  username: z.string().min(3, 'Username must be 3+ characters').max(20).regex(/^\w+$/, 'Letters, numbers, underscores only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  country: z.string().min(1, 'Select your country'),
  city: z.string().min(1, 'Enter your city'),
});
type Form = z.infer<typeof schema>;

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: '#27272a',
    borderColor: '#3f3f46',
    borderRadius: '0.5rem',
    minHeight: '42px',
    boxShadow: 'none',
    '&:hover': { borderColor: '#52525b' },
  }),
  menu: (base: Record<string, unknown>) => ({ ...base, backgroundColor: '#27272a', border: '1px solid #3f3f46' }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isFocused ? '#3f3f46' : 'transparent',
    color: '#fafafa',
    fontSize: '14px',
  }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, color: '#fafafa', fontSize: '14px' }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: '#71717a', fontSize: '14px' }),
  input: (base: Record<string, unknown>) => ({ ...base, color: '#fafafa', fontSize: '14px' }),
};

export default function SignupPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setServerError('');
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    // Update profile with city and country
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      await supabase
        .from('profiles')
        .update({ city: data.city, country: data.country, username: data.username })
        .eq('id', session.session.user.id);
    }

    router.push('/game');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown size={32} className="text-amber-400" />
            <span className="text-2xl font-bold text-white">MagChess</span>
          </div>
          <p className="text-zinc-400">Create your account — it&apos;s free</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
              <input
                {...register('username')}
                placeholder="chessmaster99"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Country</label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select
                    options={countryOptions}
                    styles={selectStyles as never}
                    placeholder="Select country…"
                    onChange={(opt) => field.onChange(opt?.value ?? '')}
                    value={countryOptions.find((o) => o.value === field.value) ?? null}
                  />
                )}
              />
              {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">City</label>
              <input
                {...register('city')}
                placeholder="New York"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? 'Creating account…' : (
                <span className="flex items-center gap-1.5">Create Account <ChevronRight size={16} /></span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-zinc-500">
            You start with <span className="text-amber-400 font-medium">50 coins</span> — free!
          </div>

          <p className="mt-3 text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
