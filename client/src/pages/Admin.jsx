import { ShieldCheck } from 'lucide-react';
import { usersApi } from '../api/endpoints';
import { ErrorBanner, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/format';
//
export default function Admin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const users = useApi(() => usersApi.list(), []);

  const changeRole = async (user, role) => {
    try {
      const updated = await usersApi.setRole(user.id, role);
      users.setData((list) => list.map((item) => (item.id === updated.id ? { ...item, role: updated.role } : item)));
      toast.success(`${user.name} is now ${role === 'admin' ? 'an admin' : 'a user'}`);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <PageHeader icon={ShieldCheck} title="Users" subtitle="Admins can see every account and change roles. Contacts stay private to their owner." />
      <ErrorBanner error={users.error} onRetry={users.reload} />
      {users.loading && !users.data && <Spinner />}
      {users.data && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-rule/70 bg-white/50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Contacts</th>
                <th className="th">Joined</th>
                <th className="th">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              {users.data.map((user) => (
                <tr key={user.id} className="row-hover">
                  <td className="td font-semibold">
                    {user.name} {user.id === me.id && <span className="chip ml-1">you</span>}
                  </td>
                  <td className="td">{user.email}</td>
                  <td className="td">{user.contactCount}</td>
                  <td className="td">{formatDate(user.createdAt)}</td>
                  <td className="td">
                    <select
                      className="input w-auto py-1"
                      value={user.role}
                      disabled={user.id === me.id}
                      title={user.id === me.id ? 'You cannot change your own role' : undefined}
                      onChange={(event) => changeRole(user, event.target.value)}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
