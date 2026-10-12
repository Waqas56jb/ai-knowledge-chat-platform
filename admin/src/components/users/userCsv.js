import { downloadCsv } from '../../utils/csv';
import { roleLabel } from '../../constants/domain';

/**
 * CSV for the users currently selected in the table (the full filtered list is exported by the server
 * with `?format=csv`). No secrets or credentials are ever exported.
 */
export const USER_CSV_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', value: r => roleLabel(r.role) },
  { key: 'status', label: 'Status' },
  { key: 'department', label: 'Department' },
  { key: 'createdAt', label: 'Created at' },
  { key: 'lastActiveAt', label: 'Last active at', value: r => r.lastActiveAt || 'Never' },
  { key: 'conversationCount', label: 'Conversations' },
  { key: 'questionsAsked', label: 'Questions asked' },
  { key: 'sourceAccess', label: 'Source access' }
];

export const exportSelectedUsers = rows => downloadCsv('users-selected', rows, USER_CSV_COLUMNS);
