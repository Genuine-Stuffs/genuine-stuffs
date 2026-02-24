import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'client' | 'pro' | 'vendor' | 'guest';

interface User {
    id: string;
    email: string;
    role: Role;
    name: string;
}

interface AuthContextType {
    user: User | null;
    role: Role;
    login: (role: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<Role>(() => {
        const saved = localStorage.getItem('platform_role');
        return (saved as Role) || 'guest';
    });

    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        localStorage.setItem('platform_role', role);
        if (role !== 'guest') {
            setUser({
                id: '1',
                email: `${role}@example.com`,
                role: role,
                name: `Sample ${role.charAt(0).toUpperCase() + role.slice(1)}`
            });
        } else {
            setUser(null);
        }
    }, [role]);

    const login = (newRole: Role) => setRole(newRole);
    const logout = () => setRole('guest');

    return (
        <AuthContext.Provider value={{ user, role, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
