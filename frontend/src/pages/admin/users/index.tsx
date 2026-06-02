import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import AppShell from '@/components/layout/AppShell';
import { Users, Search, Shield, User, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { getAdminUsers, updateAdminUserRole, AdminUser } from '@/api/admin';
import { useAppSelector } from '@/store';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers({ limit: 10, offset: (page - 1) * 10, search });
      setUsers(data.items);
      setTotal(data.total_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} admin privileges for this user?`)) {
      return;
    }
    try {
      await updateAdminUserRole(userId, !currentStatus);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user role');
    }
  };

  return (
    <AppShell>
      <Head>
        <title>User Management | SafeDrive AI</title>
      </Head>
      <div className="p-6 max-w-7xl mx-auto flex flex-col h-full gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">User Management</h1>
            <p className="text-muted mt-1">Manage platform users, roles, and view behavior profiles.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-tertiary flex items-center justify-center border border-subtle shadow-inner">
            <Users className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-subtle shadow-sm">
          <form onSubmit={handleSearch} className="flex items-center gap-2 relative w-full max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-tertiary border border-subtle rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="hidden" />
          </form>
          <div className="text-sm text-muted font-medium">
            Total Users: <span className="text-primary">{total}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-secondary rounded-xl border border-subtle shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted uppercase bg-tertiary/50 sticky top-0">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Profile Type</th>
                  <th className="px-6 py-4 font-semibold">Sessions</th>
                  <th className="px-6 py-4 font-semibold">Avg Score</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-tertiary/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tertiary border border-subtle flex items-center justify-center">
                            <User className="w-5 h-5 text-muted" />
                          </div>
                          <div>
                            <div className="font-semibold text-primary">{u.name}</div>
                            <div className="text-muted text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-brand-gradient text-white text-[10px] font-bold uppercase tracking-wider">
                          {u.profile_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">{u.sessions}</td>
                      <td className="px-6 py-4 font-medium text-emerald-500">{u.average_score}</td>
                      <td className="px-6 py-4">
                        {u.is_admin ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <Shield className="w-3.5 h-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-muted">User</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                            className="text-xs font-medium px-3 py-1.5 border border-subtle rounded-md hover:bg-tertiary transition-colors"
                          >
                            {u.is_admin ? 'Demote' : 'Promote'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-subtle bg-tertiary/30 flex items-center justify-between text-sm">
            <span className="text-muted">
              Showing <span className="font-medium text-primary">{total === 0 ? 0 : (page - 1) * 10 + 1}</span> to <span className="font-medium text-primary">{Math.min(page * 10, total)}</span> of <span className="font-medium text-primary">{total}</span> results
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 border border-subtle rounded-md hover:bg-tertiary disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={page * 10 >= total}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 border border-subtle rounded-md hover:bg-tertiary disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
