import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

const signUpSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
    onSignUpSubmit: (data: SignUpFormData) => void;
    onSwitchMode: () => void;
    isLoading: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
    onSignUpSubmit,
    onSwitchMode,
    isLoading
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { email: '', password: '', confirmPassword: '' }
    });

    return (
        <form onSubmit={handleSubmit(onSignUpSubmit)} className="p-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        className="form-input"
                        placeholder="your@email.com"
                        autoComplete="email"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                    />
                    {errors.password && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                    </label>
                    <div className="relative">
                        <input
                            {...register('confirmPassword')}
                            type={showPassword ? 'text' : 'password'}
                            className="form-input pr-10"
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full mt-6"
            >
                Continue to Setup
            </button>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={onSwitchMode}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </form>
    );
};
