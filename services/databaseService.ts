import { User } from '../types';

/**
 * database.py Equivalent (Frontend Implementation)
 * 
 * Uses LocalStorage to simulate the SQLite database file "comicflow_local.db".
 * Note: db_path logic is handled by LocalStorage key "comicflow_local.db"
 */

const DB_KEY = 'comicflow_local.db';

// Helper: Secure Password Hashing
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "COMICFLOW_SALT_V1"); // Static salt as requested
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class DatabaseManager {
    private loadUsers(): User[] {
        const data = localStorage.getItem(DB_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Database corruption:", e);
            return [];
        }
    }

    private saveUsers(users: User[]) {
        localStorage.setItem(DB_KEY, JSON.stringify(users));
    }

    async registerUser(username: string, password: string, apiKey: string): Promise<{ success: boolean; message?: string }> {
        const users = this.loadUsers();
        
        // Check if username exists
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: "Username already exists" };
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        const newUser: User = {
            id: Date.now(), // Auto-increment simulation
            username,
            passwordHash,
            apiKey,
            settings: "{}", // Default JSON settings
            createdAt: Date.now()
        };

        users.push(newUser);
        this.saveUsers(users);

        return { success: true };
    }

    async authenticateUser(username: string, password: string): Promise<User | null> {
        const users = this.loadUsers();
        const inputHash = await hashPassword(password);

        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.passwordHash === inputHash
        );

        if (user) {
            return user;
        }
        return null;
    }

    async getOrCreateDebugUser(): Promise<User> {
        const users = this.loadUsers();
        const debugUsername = "debug_admin";
        let user = users.find(u => u.username === debugUsername);

        if (!user) {
            const passwordHash = await hashPassword("123456");
            user = {
                id: 1, // Fixed ID for debug user
                username: debugUsername,
                passwordHash: passwordHash,
                apiKey: "YOUR_DEBUG_API_KEY", // Placeholder
                settings: "{}",
                createdAt: Date.now()
            };
            users.push(user);
            this.saveUsers(users);
        }

        return user;
    }

    async updateApiKey(username: string, newKey: string): Promise<boolean> {
        const users = this.loadUsers();
        const index = users.findIndex(u => u.username === username);
        
        if (index !== -1) {
            users[index].apiKey = newKey;
            this.saveUsers(users);
            return true;
        }
        return false;
    }
}

export const dbManager = new DatabaseManager();