import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Calendar, Clock, UserPlus } from 'lucide-react';
import { getAllUsers, deleteUser, formatDate } from '../../utils/userManagement';
import type { AppUser } from '../../types/admin';
import { useToast } from '../../contexts/ToastContext';
import { useAdminNavigation } from '../../contexts/AdminNavigationContext';

export const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle, pushNavigation } = useAdminNavigation();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setPageTitle('User Management', 'Manage all PayDay users');
    pushNavigation('/admin/users', 'User Management');
    loadUsers();
  }, [setPageTitle, pushNavigation]);

  const loadUsers = () => {
    setUsers(getAllUsers());
  };

  const handleDeleteUser = (username: string) => {
    try {
      deleteUser(username);
      loadUsers();
      setShowDeleteConfirm(null);
      toast.success(`User "${username}" deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete user: ${(error as Error).message}`);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRowClick = (username: string) => {
    if (showDeleteConfirm === username) return; // Don't navigate when delete confirm is showing
    navigate(`/admin/users/${username}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); // Prevent row click
    setShowDeleteConfirm(username);
  };

  const handleDeleteConfirmClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); // Prevent row click
    handleDeleteUser(username);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setShowDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar and Add User Button */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/users/add')}
          className="flex items-center gap-2 px-6 py-4 bg-primary-700 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'No users yet'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.username}
                    onClick={() => handleRowClick(user.username)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 dark:bg-primary-700/20 flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-300 font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {formatDate(user.lastLogin)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {showDeleteConfirm === user.username ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteConfirmClick(e, user.username)}
                              className="px-3 py-1 text-sm bg-negative-600 text-white rounded hover:bg-negative-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={handleCancelClick}
                              className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleDeleteClick(e, user.username)}
                            className="p-2 text-negative-600 dark:text-negative-500 hover:bg-negative-50 dark:hover:bg-negative-700/20 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>
    </div>
  );
};
