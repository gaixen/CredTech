import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }
        setError('');
        try {
            await register(email, password);
            router.push('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <h1>Register</h1>
            <form onSubmit={handleSubmit}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required />
                <button type="submit">Register</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </div>
    );
};

export default RegisterPage;
